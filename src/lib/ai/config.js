import "server-only";
import { AppError, ErrorCodes } from "@/lib/errors";

const DEFAULTS = {
  openai: { model: "gpt-4.1-mini", baseUrl: "https://api.openai.com/v1" },
  gemini: { model: "gemini-3.8-flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
};

function parseList(value, fallback) {
  const list = (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
}

export function getLLMConfig() {
  const env = process.env;
  const explicit = env.AI_PROVIDER?.trim().toLowerCase();
  const available = {
    openai: env.OPENAI_API_KEY?.trim(),
    gemini: (env.GEMINI_API_KEY || env.GOOGLE_API_KEY)?.trim(),
  };

  let provider = null;
  if (explicit === "openai" || explicit === "gemini") {
    provider = available[explicit] ? explicit : null;
  } else if (available.openai) {
    provider = "openai";
  } else if (available.gemini) {
    provider = "gemini";
  }
  if (!provider) return null;

  if (provider === "openai") {
    return {
      provider,
      apiKey: available.openai,
      model: env.OPENAI_MODEL?.trim() || DEFAULTS.openai.model,
      fallbackModels: parseList(env.OPENAI_FALLBACK_MODELS, []),
      baseUrl: (env.OPENAI_BASE_URL?.trim() || DEFAULTS.openai.baseUrl).replace(/\/+$/, ""),
    };
  }
  return {
    provider,
    apiKey: available.gemini,
    model: env.GEMINI_MODEL?.trim() || DEFAULTS.gemini.model,
    fallbackModels: parseList(env.GEMINI_FALLBACK_MODELS, ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"]),
    baseUrl: (env.GEMINI_BASE_URL?.trim() || DEFAULTS.gemini.baseUrl).replace(/\/+$/, ""),
  };
}

export function requireLLMConfig() {
  const config = getLLMConfig();
  if (!config) {
    throw new AppError(
      ErrorCodes.NOT_CONFIGURED,
      "The AI tutor isn't configured on this server. Add OPENAI_API_KEY or GEMINI_API_KEY to the environment and restart.",
      503
    );
  }
  return config;
}

export function describeLLMConfig() {
  const config = getLLMConfig();
  return config
    ? { configured: true, provider: config.provider, model: config.model }
    : { configured: false, provider: null, model: null };
}

const TTS_DEFAULTS = {
  openai: { model: "gpt-4o-mini-tts", voice: "coral" },
  gemini: { model: "gemini-3.8-flash-tts", voice: "Kore" },
};

export function getTTSConfig() {
  const env = process.env;
  const explicit = env.TTS_PROVIDER?.trim().toLowerCase();
  if (explicit === "none" || explicit === "off" || explicit === "browser") return null;
  const keys = {
    openai: env.OPENAI_API_KEY?.trim(),
    gemini: (env.GEMINI_API_KEY || env.GOOGLE_API_KEY)?.trim(),
  };
  let provider = null;
  if (explicit === "openai" || explicit === "gemini") provider = keys[explicit] ? explicit : null;
  else if (keys.openai) provider = "openai";
  else if (keys.gemini) provider = "gemini";
  if (!provider) return null;

  if (provider === "openai") {
    return {
      provider,
      apiKey: keys.openai,
      model: env.OPENAI_TTS_MODEL?.trim() || TTS_DEFAULTS.openai.model,
      voice: env.OPENAI_TTS_VOICE?.trim() || TTS_DEFAULTS.openai.voice,
      baseUrl: (env.OPENAI_BASE_URL?.trim() || DEFAULTS.openai.baseUrl).replace(/\/+$/, ""),
    };
  }
  return {
    provider,
    apiKey: keys.gemini,
    model: env.GEMINI_TTS_MODEL?.trim() || TTS_DEFAULTS.gemini.model,
    voice: env.GEMINI_TTS_VOICE?.trim() || TTS_DEFAULTS.gemini.voice,
    baseUrl: (env.GEMINI_BASE_URL?.trim() || DEFAULTS.gemini.baseUrl).replace(/\/+$/, ""),
  };
}

export function describeTTSConfig() {
  const config = getTTSConfig();
  return config
    ? { configured: true, provider: config.provider, model: config.model, voice: config.voice }
    : { configured: false, provider: null, model: null, voice: null };
}
