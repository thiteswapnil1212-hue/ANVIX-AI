
export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  locked: boolean;
  apiModelId: string | null;
};

export const CHAT_MODELS: ChatModel[] = [
  // OpenAI — locked
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
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    locked: true,
    apiModelId: null,
  },
  {
    id: "o3",
    name: "OpenAI o3",
    provider: "OpenAI",
    locked: true,
    apiModelId: null,
  },

  // Anthropic Claude — locked
  {
    id: "claude-opus",
    name: "Claude Opus",
    provider: "Anthropic Claude",
    locked: true,
    apiModelId: null,
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    provider: "Anthropic Claude",
    locked: true,
    apiModelId: null,
  },
  {
    id: "claude-haiku",
    name: "Claude Haiku",
    provider: "Anthropic Claude",
    locked: true,
    apiModelId: null,
  },

  // DeepSeek — locked
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    locked: true,
    apiModelId: null,
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner",
    provider: "DeepSeek",
    locked: true,
    apiModelId: null,
  },

  // xAI Grok — locked
  {
    id: "grok",
    name: "Grok",
    provider: "xAI",
    locked: true,
    apiModelId: null,
  },
  {
    id: "grok-fast",
    name: "Grok Fast",
    provider: "xAI",
    locked: true,
    apiModelId: null,
  },

  // Google Gemini — working models
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
    (model) =>
      model.provider === "Google Gemini" &&
      !model.locked &&
      model.apiModelId !== null
  ).map((model) => model.id)
);

export function getChatModel(modelId: string) {
  return CHAT_MODELS.find((model) => model.id === modelId);
}