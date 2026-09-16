export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  locked: boolean;
  apiModelId: string | null;
};

export const CHAT_MODELS: ChatModel[] = [
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    provider: "OpenAI",
    locked: true,
    apiModelId: null,
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    locked: true,
    apiModelId: null,
  },
  {
    id: "gpt-6-astra",
    name: "GPT-6 (Astra)",
    provider: "OpenAI",
    locked: true,
    apiModelId: null,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google Gemini",
    locked: false,
    apiModelId: "gemini-2.5-flash",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    provider: "Google Gemini",
    locked: false,
    apiModelId: "gemini-3.8-flash",
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    provider: "Google Gemini",
    locked: false,
    apiModelId: "gemini-3.7-flash",
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "Google Gemini",
    locked: false,
    apiModelId: "gemini-3.6-flash",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    provider: "Google Gemini",
    locked: false,
    apiModelId: "gemini-3.5-flash-lite",
  },
];

export const DEFAULT_CHAT_MODEL_ID = "gemini-2.5-flash";

export const CHAT_API_MODEL_IDS = new Set(
  CHAT_MODELS.filter(
    (model) => model.provider === "Google Gemini" && model.apiModelId
  ).map((model) => model.id)
);

export function getChatModel(modelId: string) {
  return CHAT_MODELS.find((model) => model.id === modelId);
}