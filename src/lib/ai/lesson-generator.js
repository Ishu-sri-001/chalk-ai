import "server-only";
import { AppError, ErrorCodes } from "@/lib/errors";
import { getRefusal, validateLesson } from "@/lib/lesson/validate";
import { completeJSON } from "@/lib/ai/llm";
import { lessonSystemPrompt, lessonUserPrompt, repairPrompt } from "@/lib/ai/prompts";

const MAX_ATTEMPTS = 2;
const BUDGET_MS = 100_000;
const MIN_REPAIR_MS = 25_000;

export async function generateLesson(topic, { signal } = {}) {
  const started = Date.now();
  const system = lessonSystemPrompt();
  const messages = [{ role: "user", content: lessonUserPrompt(topic) }];
  let lastIssues = [];
  let fallback = null;
  let provider;
  let model;

  const done = (lesson, attempt, issues) => ({
    lesson,
    meta: { provider, model, attempts: attempt, ms: Date.now() - started, warnings: issues.slice(0, 20) },
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = BUDGET_MS - (Date.now() - started);
    if (attempt > 1 && fallback && remaining < MIN_REPAIR_MS) {
      console.warn("[lesson] skipping repair (time budget); returning first lesson");
      return fallback;
    }

    let result;
    try {
      result = await completeJSON({
        system,
        messages,
        maxOutputTokens: 9000,
        signal,
        timeoutMs: Math.max(10_000, Math.min(75_000, remaining)),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      console.warn(`[lesson] attempt ${attempt} failed after ${((Date.now() - started) / 1000).toFixed(1)}s:`, error?.code, error?.message);
      if (fallback) {
        console.warn("[lesson] repair failed, returning first lesson:", error?.message);
        return fallback;
      }
      if (error instanceof AppError && error.code === ErrorCodes.INVALID_AI_OUTPUT && attempt < MAX_ATTEMPTS) {
        lastIssues = [error.message];
        messages.push({ role: "user", content: repairPrompt([error.message, "Keep the JSON compact."]) });
        continue;
      }
      throw error;
    }
    provider = result.provider;
    model = result.model;

    const refusal = getRefusal(result.data);
    if (refusal) {
      if (fallback) return fallback;
      throw new AppError(ErrorCodes.TOPIC_REFUSED, refusal, 422);
    }

    const { lesson, issues, qualityIssues, warnings } = validateLesson(result.data, {
      requestedTopic: topic,
    });

    if (lesson && qualityIssues.length === 0) return done(lesson, attempt, warnings);
    if (lesson && attempt === MAX_ATTEMPTS) return done(lesson, attempt, [...qualityIssues, ...warnings]);
    if (!lesson && fallback) return fallback; // the repair came back worse

    if (lesson) fallback = done(lesson, attempt, [...qualityIssues, ...warnings]);
    lastIssues = lesson ? [...qualityIssues, ...warnings.slice(0, 6)] : issues;
    console.warn(`[lesson] attempt ${attempt} rejected:`, lastIssues);
    messages.push({ role: "assistant", content: result.text.slice(0, 12_000) });
    messages.push({ role: "user", content: repairPrompt(lastIssues) });
  }

  if (fallback) return fallback;
  throw new AppError(
    ErrorCodes.INVALID_AI_OUTPUT,
    "The AI couldn't produce a valid lesson for this topic. Try again or rephrase the topic.",
    502,
    { issues: lastIssues, provider, model }
  );
}
