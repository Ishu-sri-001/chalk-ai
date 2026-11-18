import { getVoiceStatus } from "@/lib/playback/voice-status";

const CACHE_NAME = "chalk-narration-v1";
const INDEX_KEY = "chalk-narration-index";
const MAX_ENTRIES = 150;

async function keyFor(text) {
  const { signature } = await getVoiceStatus();
  if (!signature || !globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(`${signature}\n${text}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `/__chalk-narration/${hex}`;
}

function readIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeIndex(index) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {}
}

function touch(key) {
  const index = readIndex().filter((k) => k !== key);
  index.push(key);
  const evicted = index.length > MAX_ENTRIES ? index.splice(0, index.length - MAX_ENTRIES) : [];
  writeIndex(index);
  return evicted;
}

export async function getCachedNarration(text) {
  try {
    if (typeof caches === "undefined") return null;
    const key = await keyFor(text);
    if (!key) return null;
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(key);
    if (!res) return null;
    touch(key);
    return await res.blob();
  } catch {
    return null;
  }
}

export async function putCachedNarration(text, blob) {
  try {
    if (typeof caches === "undefined") return;
    const key = await keyFor(text);
    if (!key) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(key, new Response(blob, { headers: { "Content-Type": blob.type } }));
    for (const old of touch(key)) cache.delete(old);
  } catch {}
}
