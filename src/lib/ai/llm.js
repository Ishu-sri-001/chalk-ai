import "server-only";
import { AppError, ErrorCodes } from "@/lib/errors";
import { requireLLMConfig } from "@/lib/ai/config";
import { dailyLimitError, markProviderExhausted, nextReset } from "@/lib/daily-budget";

const DEFAULT_TIMEOUT_MS = 75_000;

export async function completeJSON({
  system,
  messages,
  maxOutputTokens = 8000,
  temperature = 0.6,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const config = requireLLMConfig();
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let text;
  let model = config.model;
  try {
    const primaryLimitMs = Math.min(PRIMARY_LIMIT_MS, Math.round(timeoutMs * 0.55));
    ({ text, model } = await callWithFallbacks(config, combined, primaryLimitMs, (cfg, attemptSignal) =>
      cfg.provider === "openai"
        ? callOpenAI(cfg, { system, messages, maxOutputTokens, temperature, signal: attemptSignal })
        : callGemini(cfg, { system, messages, maxOutputTokens, temperature, signal: attemptSignal })
    ));
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (timeout.aborted) {
      throw new AppError(ErrorCodes.TIMEOUT, "The AI took too long to respond. Try again.", 504);
    }
    if (signal?.aborted) {
      throw new AppError(ErrorCodes.ABORTED, "Request cancelled.", 499);
    }
    console.error("[llm] network error:", error?.message);
    throw new AppError(
      ErrorCodes.PROVIDER_ERROR,
      "Couldn't reach the AI service. Check the connection and try again.",
      502
    );
  }

  const data = parseJSONObject(text);
  if (!data) {
    throw new AppError(
      ErrorCodes.INVALID_AI_OUTPUT,
      "The AI returned a response that wasn't valid JSON.",
      502,
      { raw: text?.slice(0, 2000) }
    );
  }
  return { data, text, provider: config.provider, model };
}

const PRIMARY_LIMIT_MS = 45_000;
const FALLBACK_LIMIT_MS = 30_000;
const RETRY_DELAY_MS = 1500;
const BUSY_COOLDOWN_MS = 60_000;
const HUNG_COOLDOWN_MS = 5 * 60_000;
const unhealthyUntil = new Map(); // model -> timestamp
const outForTheDay = new Map(); // model -> reset timestamp

async function callWithFallbacks(config, signal, primaryLimitMs, call) {
  const now = Date.now();
  const all = [...new Set([config.model, ...(config.fallbackModels || [])])].filter(
    (m) => !(outForTheDay.get(m) > now)
  );
  if (!all.length) {
    markProviderExhausted();
    throw dailyLimitError();
  }
  const healthy = (m) => !(unhealthyUntil.get(m) > now);
  const models = [...all.filter(healthy), ...all.filter((m) => !healthy(m))];

  let lastError;
  let dailyQuotaHits = 0;
  for (const model of models) {
    const isPrimary = model === config.model && healthy(model);
    const tries = isPrimary ? 2 : 1;
    for (let attempt = 0; attempt < tries; attempt++) {
      const limit = AbortSignal.timeout(isPrimary ? primaryLimitMs : FALLBACK_LIMIT_MS);
      try {
        const text = await call({ ...config, model }, AbortSignal.any([signal, limit]));
        unhealthyUntil.delete(model);
        return { text, model };
      } catch (error) {
        if (signal.aborted) throw error;
        if (limit.aborted) {
          console.warn(`[llm] ${model} did not answer in time; trying the next model`);
          unhealthyUntil.set(model, Date.now() + HUNG_COOLDOWN_MS);
          lastError = new AppError(ErrorCodes.TIMEOUT, "The AI took too long to respond. Try again.", 504);
          break;
        }
        if (error instanceof AppError && error.quotaScope) {
          lastError = error;
          if (error.quotaScope === "day") {
            console.warn(`[llm] ${model} is out of daily quota; trying the next model`);
            outForTheDay.set(model, nextReset().getTime());
            dailyQuotaHits += 1;
          } else {
            console.warn(`[llm] ${model} hit its per-minute limit; trying the next model`);
            unhealthyUntil.set(model, Date.now() + BUSY_COOLDOWN_MS);
          }
          break;
        }
        if (!(error instanceof AppError && error.retryable)) throw error;
        lastError = error;
        console.warn(`[llm] ${model} busy (attempt ${attempt + 1}/${tries})`);
        if (attempt < tries - 1) await sleep(RETRY_DELAY_MS, signal);
        else unhealthyUntil.set(model, Date.now() + BUSY_COOLDOWN_MS);
      }
    }
  }
  if (dailyQuotaHits > 0 && all.every((m) => outForTheDay.get(m) > Date.now())) {
    markProviderExhausted();
    throw dailyLimitError();
  }
  throw lastError;
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

async function callOpenAI(config, { system, messages, maxOutputTokens, temperature, signal }) {
  const body = {
    model: config.model,
    messages: [{ role: "system", content: system }, ...messages],
    response_format: { type: "json_object" },
    max_completion_tokens: maxOutputTokens,
  };
  if (!/^(o\d|gpt-5)/i.test(config.model)) body.temperature = temperature;

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) await throwProviderError(res, "openai");
  const json = await res.json();
  const choice = json?.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new AppError(
      ErrorCodes.INVALID_AI_OUTPUT,
      "The AI response was cut off before it finished.",
      502
    );
  }
  const content = choice?.message?.content;
  if (choice?.message?.refusal) {
    throw new AppError(ErrorCodes.TOPIC_REFUSED, "The AI declined to answer this request.", 422);
  }
  if (typeof content !== "string") {
    throw new AppError(ErrorCodes.INVALID_AI_OUTPUT, "The AI returned an empty response.", 502);
  }
  return content;
}

async function callGemini(config, { system, messages, maxOutputTokens, temperature, signal }) {
  const url = `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens,
        temperature,
        ...(/^gemini-3/i.test(config.model) ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
      },
    }),
    signal,
  });
  if (!res.ok) await throwProviderError(res, "gemini");
  const json = await res.json();
  const candidate = json?.candidates?.[0];
  const usage = json?.usageMetadata || {};
  console.info(
    `[llm] ${config.model} ${((Date.now() - t0) / 1000).toFixed(1)}s finish=${candidate?.finishReason} ` +
      `out=${usage.candidatesTokenCount ?? "?"} thinking=${usage.thoughtsTokenCount ?? 0}`
  );
  if (json?.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY") {
    throw new AppError(ErrorCodes.TOPIC_REFUSED, "The AI declined to answer this request.", 422);
  }
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new AppError(
      ErrorCodes.INVALID_AI_OUTPUT,
      "The AI response was cut off before it finished.",
      502
    );
  }
  const text = candidate?.content?.parts
    ?.filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
  if (!text) {
    throw new AppError(ErrorCodes.INVALID_AI_OUTPUT, "The AI returned an empty response.", 502);
  }
  return text;
}

async function throwProviderError(res, provider) {
  let body = "";
  try {
    body = (await res.text()).slice(0, 4000);
  } catch {}
  console.error(
    `[llm] ${provider} HTTP ${res.status}:`,
    body.slice(0, 500).replace(/(sk-|AIza|AQ\.)[A-Za-z0-9_.\-*]{6,}/g, "$1***")
  );

  if (res.status === 429) {
    const error = new AppError(
      ErrorCodes.PROVIDER_RATE_LIMIT,
      "The AI service is busy or out of quota right now. Wait a moment and try again.",
      503
    );
    error.quotaScope = /per[_\s-]?day|daily/i.test(body) ? "day" : "minute";
    throw error;
  }

  if (res.status === 401 || res.status === 403) {
    throw new AppError(
      ErrorCodes.PROVIDER_AUTH,
      "The AI provider rejected the server's credentials. Check the API key configuration.",
      502
    );
  }
  if (res.status === 404 || res.status === 400) {
    throw new AppError(
      ErrorCodes.PROVIDER_ERROR,
      "The AI provider rejected the request. Check the configured model name.",
      502
    );
  }
  const error = new AppError(
    ErrorCodes.PROVIDER_ERROR,
    res.status === 503
      ? "The AI service is overloaded right now. Wait a minute and try again."
      : "The AI service returned an error. Try again in a moment.",
    502
  );
  error.retryable = res.status >= 500;
  throw error;
}

export function parseJSONObject(text) {
  if (typeof text !== "string") return null;
  const attempts = [text.trim()];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) attempts.push(fenced[1].trim());
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) attempts.push(text.slice(first, last + 1));
  for (const candidate of attempts) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch {}
  }
  return null;
}
