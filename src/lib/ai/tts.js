import "server-only";
import { AppError, ErrorCodes } from "@/lib/errors";
import { getTTSConfig } from "@/lib/ai/config";

const SPEAKING_STYLE =
  "Speak as a warm, clear teacher explaining at a whiteboard: relaxed pace, natural pauses, friendly and confident.";

export async function synthesizeSpeech(text, { signal } = {}) {
  const config = getTTSConfig();
  if (!config) {
    throw new AppError(ErrorCodes.NOT_CONFIGURED, "Voice narration isn't configured on this server.", 503);
  }
  const timeout = AbortSignal.timeout(45_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    return config.provider === "openai"
      ? await openaiSpeech(config, text, combined)
      : await geminiSpeech(config, text, combined);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (timeout.aborted) throw new AppError(ErrorCodes.TIMEOUT, "Voice generation timed out.", 504);
    if (signal?.aborted) throw new AppError(ErrorCodes.ABORTED, "Request cancelled.", 499);
    console.error("[tts] network error:", error?.message);
    throw new AppError(ErrorCodes.PROVIDER_ERROR, "Couldn't reach the voice service.", 502);
  }
}

async function openaiSpeech(config, text, signal) {
  const body = {
    model: config.model,
    voice: config.voice,
    input: text,
    response_format: "mp3",
  };
  if (/gpt-4o.*tts/i.test(config.model)) body.instructions = SPEAKING_STYLE;

  const res = await fetch(`${config.baseUrl}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) await throwTTSError(res, "openai");
  return {
    audio: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") || "audio/mpeg",
    provider: "openai",
  };
}

async function geminiSpeech(config, text, signal) {
  const url = `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${SPEAKING_STYLE}\n\nSay: ${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } } },
      },
    }),
    signal,
  });
  if (!res.ok) await throwTTSError(res, "gemini");
  const json = await res.json();
  const part = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) {
    throw new AppError(ErrorCodes.INVALID_AI_OUTPUT, "The voice service returned no audio.", 502);
  }
  const pcm = Buffer.from(part.inlineData.data, "base64");
  const mime = part.inlineData.mimeType || "";
  if (/wav|mpeg|mp3|ogg/i.test(mime)) {
    return { audio: toArrayBuffer(pcm), contentType: mime, provider: "gemini" };
  }
  const rate = Number(mime.match(/rate=(\d+)/)?.[1]) || 24000;
  return { audio: toArrayBuffer(pcmToWav(pcm, rate)), contentType: "audio/wav", provider: "gemini" };
}

function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export function pcmToWav(pcm, sampleRate, channels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function throwTTSError(res, provider) {
  let detail = "";
  try {
    detail = (await res.text()).slice(0, 400);
  } catch {}
  console.error(
    `[tts] ${provider} HTTP ${res.status}:`,
    detail.replace(/(sk-|AIza|AQ\.)[A-Za-z0-9_.\-*]{6,}/g, "$1***")
  );
  if (res.status === 401 || res.status === 403) {
    throw new AppError(ErrorCodes.PROVIDER_AUTH, "The voice service rejected the server's credentials.", 502);
  }
  if (res.status === 429) {
    throw new AppError(ErrorCodes.PROVIDER_RATE_LIMIT, "The voice service is busy right now.", 503);
  }
  throw new AppError(ErrorCodes.PROVIDER_ERROR, "The voice service returned an error.", 502);
}
