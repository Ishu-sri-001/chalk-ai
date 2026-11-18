import "server-only";
import { AppError, ErrorCodes } from "@/lib/errors";

const WINDOW_MS = 10 * 60 * 1000;

const DEFAULT_LIMITS = {
  lesson: 10,
  followup: 40,
  tts: 200,
};

const buckets = new Map(); // `${name}:${client}` -> number[] (timestamps)
let lastSweep = Date.now();

function limitFor(name) {
  const fromEnv = Number(process.env[`RATE_LIMIT_${name.toUpperCase()}`]);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_LIMITS[name];
}

function clientId(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function checkOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = null;
  }
  if (!host || originHost !== host) {
    throw new AppError(ErrorCodes.FORBIDDEN, "Requests must come from this site.", 403);
  }
}

function checkRate(name, request) {
  const now = Date.now();
  if (now - lastSweep > WINDOW_MS) {
    for (const [key, hits] of buckets) {
      if (!hits.length || now - hits[hits.length - 1] > WINDOW_MS) buckets.delete(key);
    }
    lastSweep = now;
  }
  const key = `${name}:${clientId(request)}`;
  const hits = (buckets.get(key) || []).filter((t) => now - t < WINDOW_MS);
  const limit = limitFor(name);
  if (hits.length >= limit) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - hits[0])) / 1000);
    const error = new AppError(
      ErrorCodes.RATE_LIMITED,
      `You've reached the limit for now. Try again in about ${Math.ceil(retryAfter / 60)} minute${retryAfter > 60 ? "s" : ""}.`,
      429
    );
    error.retryAfter = retryAfter;
    buckets.set(key, hits);
    throw error;
  }
  hits.push(now);
  buckets.set(key, hits);
}

export function guardRequest(request, name) {
  checkOrigin(request);
  checkRate(name, request);
}
