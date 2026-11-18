import "server-only";
import { AppError, ErrorCodes } from "@/lib/errors";
import { LIMITS } from "@/lib/lesson/constants";
import { validateFollowUp } from "@/lib/lesson/validate";
import { completeJSON } from "@/lib/ai/llm";
import { followUpSystemPrompt } from "@/lib/ai/prompts";

export async function answerFollowUp({ lesson, question, history, segmentIndex }, { signal } = {}) {
  const system = followUpSystemPrompt(lesson, segmentIndex);
  const turns = history.slice(-LIMITS.maxHistoryTurns).map((turn) => ({
    role: turn.role === "tutor" ? "assistant" : "user",
    content: turn.role === "tutor" ? JSON.stringify({ answer: turn.content }) : turn.content,
  }));
  const messages = [...turns, { role: "user", content: question }];

  const result = await completeJSON({
    system,
    messages,
    maxOutputTokens: 3000,
    temperature: 0.5,
    signal,
    timeoutMs: 45_000,
  });

  const { answer, issues, warnings } = validateFollowUp(result.data);
  if (!answer) {
    console.warn("[follow-up] invalid response:", issues);
    throw new AppError(
      ErrorCodes.INVALID_AI_OUTPUT,
      "The tutor's answer came back malformed. Ask again.",
      502
    );
  }
  return { answer, meta: { provider: result.provider, model: result.model, warnings } };
}
