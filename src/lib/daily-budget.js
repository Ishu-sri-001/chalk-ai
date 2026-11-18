import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AppError, ErrorCodes } from "@/lib/errors";
import { getLLMConfig } from "@/lib/ai/config";

const TIME_ZONE = "America/Los_Angeles";
const STATE_FILE = path.join(os.tmpdir(), "chalk-daily-usage.json");
const DEFAULT_GEMINI_LIMIT = 15;

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, Number(x.value)]));
  return { y: p.year, m: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second };
}

function zoneOffset(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}

function dayKey(now = new Date()) {
  const p = zonedParts(now, TIME_ZONE);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function nextReset(now = new Date()) {
  const p = zonedParts(now, TIME_ZONE);
  const wallMidnight = Date.UTC(p.y, p.m - 1, p.d + 1, 0, 0, 0);
  let t = wallMidnight - zoneOffset(new Date(wallMidnight), TIME_ZONE);
  const corrected = wallMidnight - zoneOffset(new Date(t), TIME_ZONE);
  if (corrected !== t) t = corrected;
  return new Date(t);
}

function dailyLimit() {
  const raw = process.env.DAILY_LESSON_LIMIT?.trim();
  if (raw === "0" || raw?.toLowerCase() === "off" || raw?.toLowerCase() === "none") return null;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return getLLMConfig()?.provider === "gemini" ? DEFAULT_GEMINI_LIMIT : null;
}

let state = null;

function load() {
  const today = dayKey();
  if (!state) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    } catch {
      state = null;
    }
  }
  if (!state || state.day !== today) state = { day: today, used: 0, exhausted: false };
  return state;
}

function save() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {}
}

export function getBudget() {
  const limit = dailyLimit();
  if (!limit) return null;
  const s = load();
  return {
    limit,
    used: Math.min(s.used, limit),
    remaining: s.exhausted ? 0 : Math.max(0, limit - s.used),
    providerExhausted: s.exhausted,
    resetsAt: nextReset().toISOString(),
  };
}

export function dailyLimitError(budget = getBudget()) {
  const error = new AppError(
    ErrorCodes.DAILY_LIMIT,
    budget?.providerExhausted
      ? "The free AI allowance for today is used up. New chalk arrives when it resets."
      : "You've used all of today's chalk. New chalk arrives when the day resets.",
    429
  );
  error.daily = budget;
  return error;
}

export function assertLessonAvailable() {
  const budget = getBudget();
  if (budget && budget.remaining <= 0) throw dailyLimitError(budget);
}

export function recordLesson() {
  if (!dailyLimit()) return null;
  const s = load();
  s.used += 1;
  save();
  return getBudget();
}

export function markProviderExhausted() {
  const s = load();
  if (!s.exhausted) {
    s.exhausted = true;
    save();
  }
}
