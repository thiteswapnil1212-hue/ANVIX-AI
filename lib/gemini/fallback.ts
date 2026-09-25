import { GoogleGenerativeAI } from "@google/generative-ai";

import { validateGeneratedProject, type GeneratedProject } from "@/lib/project/project-schema";

export const MODEL_RETRY_DELAYS_MS = [250, 700] as const;
export const MODEL_FALLBACK_DELAY_MS = 400;

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return typeof error === "string" ? error : "Unknown error";
}

export function classifyGeminiFailure(error: unknown): {
  category: string;
  status?: number;
  retryable: boolean;
  message: string;
} {
  const status =
    typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status
      : undefined;

  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return {
      category: "provider_http_error",
      status,
      retryable: true,
      message,
    };
  }

  if (/timeout/i.test(lowerMessage)) {
    return {
      category: "timeout",
      retryable: true,
      message,
    };
  }

  if (/gemini returned malformed json|malformed json|invalid json/i.test(lowerMessage)) {
    return {
      category: "malformed_json",
      retryable: true,
      message,
    };
  }

  if (/generated project|gemini response|schema|missing required file|duplicate file/i.test(lowerMessage)) {
    return {
      category: "schema_validation",
      retryable: true,
      message,
    };
  }

  if (/api key|authentication|unauthorized|forbidden|invalid api|invalid request|unsupported model|unsupported request/.test(lowerMessage)) {
    return {
      category: "permanent_error",
      status,
      retryable: false,
      message,
    };
  }

  const transientPatterns = [
    "temporarily unavailable",
    "temporary unavailable",
    "model temporarily unavailable",
    "high demand",
    "overloaded",
    "service unavailable",
    "rate limit",
    "too many requests",
    "quota exceeded",
    "try again later",
    "capacity",
    "busy",
    "unavailable",
  ];

  const retryable = transientPatterns.some((pattern) => lowerMessage.includes(pattern));

  return {
    category: retryable ? "provider_overload" : "unknown",
    status,
    retryable,
    message,
  };
}

export function parseGeminiJson(text: string) {
  const trimmed = text.trim();
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const candidates = new Set<string>();
  if (stripped) candidates.add(stripped);
  if (trimmed) candidates.add(trimmed);

  const braceIndex = stripped.indexOf("{");
  if (braceIndex >= 0) {
    const tail = stripped.slice(braceIndex);
    const end = tail.lastIndexOf("}");
    if (end > 0) {
      candidates.add(tail.slice(0, end + 1));
    }
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate.trim());
    } catch {
      // try the next fragment
    }
  }

  throw new Error("Gemini returned malformed JSON");
}

export async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateProjectText(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  prompt: string,
  modelName: string,
  withTimeoutFn: <T>(promise: Promise<T>, timeoutMs: number) => Promise<T>,
  timeoutMs: number
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const result = await withTimeoutFn(
        model.generateContent(`The user's prompt is:\n\n${prompt}`),
        timeoutMs
      );

      return await result.response.text();
    } catch (error) {
      lastError = error;
      const failure = classifyGeminiFailure(error);
      console.warn("[ANVIX BUILD] Model attempt failed", {
        model: modelName,
        attempt,
        failureCategory: failure.category,
        httpStatus: failure.status ?? null,
        retryable: failure.retryable,
        reason: failure.message,
      });

      if (!failure.retryable) {
        throw error;
      }

      if (attempt < 2) {
        await delay(MODEL_RETRY_DELAYS_MS[attempt - 1] ?? 500);
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("Gemini request failed");
}

export type GeminiModelFactory = (
  apiKey: string,
  modelName: string
) => ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;

export async function generateProjectTextWithFallback(
  apiKey: string,
  prompt: string,
  modelFactory: GeminiModelFactory = (key, modelName) => {
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 12000,
      },
    });
  }
): Promise<GeneratedProject> {
  const failures: Array<{ model: string; attempt: number; failureCategory: string; httpStatus?: number; retryable: boolean; reason: string }> = [];

  for (const modelName of ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"]) {
    const model = modelFactory(apiKey, modelName);
    let lastModelError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        console.info("[ANVIX BUILD] Trying model", {
          model: modelName,
          attempt,
        });

        const text = await generateProjectText(
          model,
          prompt,
          modelName,
          async <T>(promise: Promise<T>, timeoutMs: number) => {
            let timeoutId: ReturnType<typeof setTimeout>;
            const timeoutPromise = new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => reject(new Error("Gemini request timed out")), timeoutMs);
            });
            try {
              return await Promise.race([promise, timeoutPromise]);
            } finally {
              clearTimeout(timeoutId!);
            }
          },
          60000
        );

        try {
          const parsed = parseGeminiJson(text);
          const project = validateGeneratedProject(parsed);
          console.info("[ANVIX BUILD] Model output validated", {
            model: modelName,
            attempt,
            fileCount: project.files.length,
          });
          return project;
        } catch (error) {
          const validationFailure = classifyGeminiFailure(error);
          console.warn("[ANVIX BUILD] Model output validation failed", {
            model: modelName,
            attempt,
            failureCategory: validationFailure.category,
            httpStatus: validationFailure.status ?? null,
            retryable: validationFailure.retryable,
            reason: validationFailure.message,
          });
          throw error;
        }
      } catch (error) {
        lastModelError = error;
        const failure = classifyGeminiFailure(error);
        const message = failure.message;
        failures.push({
          model: modelName,
          attempt,
          failureCategory: failure.category,
          httpStatus: failure.status,
          retryable: failure.retryable,
          reason: message,
        });

        const shouldRetryModel = failure.retryable || /Gemini returned malformed JSON|Generated project|Gemini response/.test(message);

        if (!shouldRetryModel) {
          throw error;
        }

        if (attempt < 2) {
          await delay(MODEL_RETRY_DELAYS_MS[attempt - 1] ?? 500);
          continue;
        }

        console.warn("[ANVIX BUILD] Model failed after all regeneration attempts", {
          model: modelName,
          retries: attempt,
          failureCategory: failure.category,
          httpStatus: failure.status ?? null,
          retryable: failure.retryable,
          reason: message,
        });
        break;
      }
    }

    if (modelName !== "gemini-2.0-flash") {
      const nextModel = modelName === "gemini-2.5-flash"
        ? "gemini-2.5-flash-lite"
        : "gemini-2.0-flash";
      const failure = classifyGeminiFailure(lastModelError ?? new Error("Unknown failure"));
      console.warn("[ANVIX BUILD] Falling back to next model", {
        from: modelName,
        to: nextModel,
        failureCategory: failure.category,
        httpStatus: failure.status ?? null,
        retryable: failure.retryable,
        reason: failure.message,
      });
      await delay(MODEL_FALLBACK_DELAY_MS);
      continue;
    }

    throw new Error(
      failures.length > 0
        ? `Gemini project generation failed on all configured models: ${failures.map((entry) => `${entry.model} (${entry.failureCategory})`).join("; ")}`
        : "Gemini request failed"
    );
  }

  throw new Error(
    failures.length > 0
      ? `Gemini project generation failed on all configured models: ${failures.map((entry) => `${entry.model} (${entry.failureCategory})`).join("; ")}`
      : "Gemini request failed"
  );
}
