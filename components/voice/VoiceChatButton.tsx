"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type Session } from "@google/genai";
import { Mic, PhoneOff } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth-headers";
import {
  LIVE_MODEL_FALLBACK,
  LIVE_SESSION_CAP_SECONDS,
  LIVE_SYSTEM_INSTRUCTION,
  type LiveModelId,
} from "@/lib/live/live-models";

/**
 * Voice chat (beta) — Gemini Live, experimental.
 *
 * The browser never sees the app's Gemini key: it fetches a one-use
 * ephemeral token from POST /api/live/token, then connects directly to
 * the Live API with @google/genai (`live.connect`, v1alpha). Mic audio
 * is sent as 16kHz PCM; the model's 24kHz PCM replies are played back
 * through the Web Audio API.
 *
 * Honest limits, shown in the UI: audio sessions end after 15 minutes
 * (Google's cap) — a visible timer counts down and the session stops
 * itself at zero. If the primary model (`gemini-3.8-live`) cannot
 * connect, the button mints a second token for the fallback
 * (`gemini-3.1-flash-live-preview`) and tries once more; if that fails
 * too, it says so instead of pretending to listen.
 *
 * This has NOT been verified end-to-end against Google (no live Gemini
 * calls are made in this repo's verification): it is a beta shell around
 * the documented SDK flow, and the button reports connection failures
 * in plain words.
 */

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

type VoiceState =
  | "idle"
  | "starting"
  | "live"
  | "ended";

interface TokenResponse {
  token: string;
  model: LiveModelId;
  fallbackModel: LiveModelId;
  expiresAt: number;
  sessionCapSeconds: number;
}

function floatToPcm16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i] ?? 0));
    pcm[i] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  return pcm;
}

function resampleTo16k(samples: Float32Array, inputRate: number): Int16Array {
  if (inputRate === INPUT_SAMPLE_RATE) return floatToPcm16(samples);
  const ratio = inputRate / INPUT_SAMPLE_RATE;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const index = Math.floor(pos);
    const frac = pos - index;
    const a = samples[index] ?? 0;
    const b = samples[Math.min(index + 1, samples.length - 1)] ?? 0;
    out[i] = a + (b - a) * frac;
  }
  return floatToPcm16(out);
}

function pcm16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToPcm16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function VoiceChatButton() {
  const [state, setState] = useState<VoiceState>("idle");
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(LIVE_SESSION_CAP_SECONDS);
  const [modelUsed, setModelUsed] = useState("");

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const stopSession = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      sessionRef.current?.close();
    } catch {
      // already closed
    }
    sessionRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    try {
      await inputContextRef.current?.close();
    } catch {
      // already closed
    }
    inputContextRef.current = null;
    if (mountedRef.current) {
      setState("ended");
      setSecondsLeft(LIVE_SESSION_CAP_SECONDS);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void stopSession();
    };
  }, [stopSession]);

  const startTimer = useCallback(() => {
    setSecondsLeft(LIVE_SESSION_CAP_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          void stopSession();
          setStatus("Session ended — the 15-minute voice limit was reached.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopSession]);

  const playModelAudio = useCallback((base64: string) => {
    const output = outputContextRef.current;
    if (!output) return;
    try {
      const pcm = base64ToPcm16(base64);
      const buffer = output.createBuffer(1, pcm.length, OUTPUT_SAMPLE_RATE);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) {
        channel[i] = (pcm[i] ?? 0) / 0x8000;
      }
      const source = output.createBufferSource();
      source.buffer = buffer;
      source.connect(output.destination);
      const now = output.currentTime;
      const startAt = Math.max(now, nextPlayTimeRef.current);
      source.start(startAt);
      nextPlayTimeRef.current = startAt + buffer.duration;
    } catch {
      // A bad audio chunk must not kill the session.
    }
  }, []);

  const connectWithModel = useCallback(
    async (token: string, model: LiveModelId): Promise<Session> => {
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      });
      const session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: LIVE_SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            if (!mountedRef.current) return;
            setState("live");
            setStatus("Listening — speak now.");
            startTimer();
          },
          onmessage: (message) => {
            const serverContent = (
              message as {
                serverContent?: {
                  modelTurn?: {
                    parts?: {
                      inlineData?: { data?: string; mimeType?: string };
                      text?: string;
                    }[];
                  };
                  outputTranscription?: { text?: string };
                  interrupted?: boolean;
                };
              }
            ).serverContent;
            if (!serverContent) return;
            if (serverContent.interrupted) {
              nextPlayTimeRef.current = 0;
            }
            const text = serverContent.outputTranscription?.text;
            if (text) setTranscript((prev) => `${prev}${text}`);
            for (const part of serverContent.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                playModelAudio(part.inlineData.data);
              }
              if (part.text) {
                setTranscript((prev) => `${prev}${part.text ?? ""}`);
              }
            }
          },
          onerror: () => {
            if (!mountedRef.current) return;
            setStatus(
              "Voice connection error. Try again — if it keeps failing, the Live model may be unavailable for this key."
            );
            void stopSession();
          },
          onclose: () => {
            if (!mountedRef.current) return;
            setState((prev) => (prev === "live" ? "ended" : prev));
          },
        },
      });
      return session;
    },
    [playModelAudio, startTimer, stopSession]
  );

  const startMic = useCallback(
    async (session: Session) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: INPUT_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      const inputContext = new AudioContext({
        sampleRate: INPUT_SAMPLE_RATE,
      });
      inputContextRef.current = inputContext;
      const source = inputContext.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but needs no extra worklet file and
      // works in every modern browser; the chunks are small (4096 frames).
      const processor = inputContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const pcm = resampleTo16k(input, event.inputBuffer.sampleRate);
        try {
          session.sendRealtimeInput({
            media: {
              data: pcm16ToBase64(pcm),
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch {
          // The session may have closed between chunks; ignore.
        }
      };
      source.connect(processor);
      processor.connect(inputContext.destination);
      outputContextRef.current = new AudioContext();
      nextPlayTimeRef.current = 0;
    },
    []
  );

  const fetchToken = useCallback(
    async (model?: LiveModelId): Promise<TokenResponse | null> => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/live/token", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(model ? { model } : {}),
      });
      if (response.status === 401) {
        setStatus("Sign in to use voice chat.");
        return null;
      }
      if (response.status === 429) {
        setStatus("Too many voice sessions — try again later.");
        return null;
      }
      if (!response.ok) {
        setStatus("Voice chat is not available right now. Please try again.");
        return null;
      }
      return (await response.json()) as TokenResponse;
    },
    []
  );

  const startSession = useCallback(async () => {
    if (state === "starting" || state === "live") return;
    setState("starting");
    setStatus("Starting voice chat…");
    setTranscript("");
    setModelUsed("");

    const first = await fetchToken();
    if (!first) {
      setState("idle");
      return;
    }

    try {
      const session = await connectWithModel(first.token, first.model);
      sessionRef.current = session;
      setModelUsed(first.model);
      await startMic(session);
    } catch {
      // Primary model failed — one retry with the fallback model.
      setStatus(
        `Could not connect with ${first.model}. Trying the fallback voice model…`
      );
      const fallback = await fetchToken(LIVE_MODEL_FALLBACK);
      if (!fallback) {
        setState("idle");
        return;
      }
      try {
        const session = await connectWithModel(
          fallback.token,
          fallback.model
        );
        sessionRef.current = session;
        setModelUsed(fallback.model);
        await startMic(session);
      } catch {
        setState("idle");
        setStatus(
          "Voice chat could not connect. The Live models may be unavailable for this API key right now — text chat still works."
        );
      }
    }
  }, [state, connectWithModel, fetchToken, startMic]);

  return (
    <div className="flex flex-col items-center gap-2">
      {state === "live" || state === "starting" ? (
        <button
          type="button"
          onClick={() => void stopSession()}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-4 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
        >
          <PhoneOff className="h-4 w-4" />
          {state === "starting" ? "Connecting…" : "End voice chat"}
          {state === "live" && (
            <span className="text-red-300/80">
              {formatSeconds(secondsLeft)} left
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void startSession()}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 text-xs font-semibold text-[#E2C259] transition hover:bg-[#D4AF37]/20"
        >
          <Mic className="h-4 w-4" />
          Voice chat (beta)
        </button>
      )}

      <p className="max-w-md text-center text-[11px] leading-5 text-zinc-500">
        Beta: audio sessions end after 15 minutes
        {modelUsed ? ` · model: ${modelUsed}` : ""}. Your voice is sent
        to Google&apos;s Live API for this session only.
      </p>

      {status && (
        <p className="max-w-md text-center text-xs leading-5 text-zinc-400">
          {status}
        </p>
      )}

      {transcript && (
        <p className="max-w-md text-center text-xs leading-5 text-zinc-300">
          {transcript.slice(-500)}
        </p>
      )}
    </div>
  );
}
