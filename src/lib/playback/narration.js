import { getCachedNarration, putCachedNarration } from "@/lib/playback/audio-cache";
import { getVoiceStatus } from "@/lib/playback/voice-status";

export class NarrationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "NarrationError";
    this.code = code;
  }
}

function probeDuration(url, signal) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    const done = (value) => {
      clearTimeout(timer);
      audio.removeAttribute("src");
      audio.load();
      resolve(value);
    };
    const timer = setTimeout(() => done(null), 10_000);
    audio.addEventListener("loadedmetadata", () => {
      const d = audio.duration;
      done(Number.isFinite(d) && d > 0 ? d : null);
    });
    audio.addEventListener("error", () => done(null));
    signal?.addEventListener("abort", () => done(null));
    audio.src = url;
  });
}

export async function fetchNarration(text, { signal } = {}) {
  const { configured } = await getVoiceStatus();
  if (configured === false) {
    throw new NarrationError("NOT_CONFIGURED", "Voice narration isn't configured on this server.");
  }
  const cached = await getCachedNarration(text);
  if (cached) return withDuration(cached, signal, true);

  let res;
  try {
    res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new NarrationError("NETWORK", "Couldn't reach the voice service.");
  }
  if (!res.ok) {
    let code = `HTTP_${res.status}`;
    let message = "Voice generation failed.";
    try {
      const data = await res.json();
      code = data?.error?.code || code;
      message = data?.error?.message || message;
    } catch {}
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw new NarrationError(code, message);
  }
  const blob = await res.blob();
  if (!blob.size || !blob.type.startsWith("audio/")) {
    throw new NarrationError("BAD_AUDIO", "The voice service returned no audio.");
  }
  const result = await withDuration(blob, signal, false);
  putCachedNarration(text, blob); // fire and forget
  return result;
}

async function withDuration(blob, signal, cached) {
  const url = URL.createObjectURL(blob);
  const duration = await probeDuration(url, signal);
  if (signal?.aborted) {
    URL.revokeObjectURL(url);
    throw new DOMException("Aborted", "AbortError");
  }
  return { url, duration, cached };
}
