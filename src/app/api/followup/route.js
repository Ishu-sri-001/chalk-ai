import { answerFollowUp } from "@/lib/ai/follow-up";
import { AppError, ErrorCodes } from "@/lib/errors";
import { guardRequest } from "@/lib/guard";
import { cleanText, errorResponse, jsonResponse, readJSONBody } from "@/lib/http";
import { LIMITS } from "@/lib/lesson/constants";
import { validateLesson } from "@/lib/lesson/validate";

export const maxDuration = 60;

export async function POST(request) {
  try {
    guardRequest(request, "followup");
    const body = await readJSONBody(request, 120_000);

    const question = cleanText(body?.question);
    if (!question) throw new AppError(ErrorCodes.INVALID_INPUT, "Type a question first.", 400);
    if (question.length > LIMITS.questionMaxChars) {
      throw new AppError(
        ErrorCodes.INVALID_INPUT,
        `Keep questions under ${LIMITS.questionMaxChars} characters.`,
        400
      );
    }

    const { lesson } = validateLesson(body?.lesson);
    if (!lesson) {
      throw new AppError(ErrorCodes.INVALID_INPUT, "The lesson context is missing or invalid.", 400);
    }

    const segmentIndex = Number.isInteger(body?.segmentIndex)
      ? Math.min(Math.max(body.segmentIndex, 0), lesson.segments.length - 1)
      : 0;

    const history = Array.isArray(body?.history)
      ? body.history
          .filter((t) => t && (t.role === "learner" || t.role === "tutor"))
          .map((t) => ({ role: t.role, content: cleanText(t.content).slice(0, 2000) }))
          .filter((t) => t.content)
          .slice(-LIMITS.maxHistoryTurns)
      : [];

    const { answer, meta } = await answerFollowUp(
      { lesson, question, history, segmentIndex },
      { signal: request.signal }
    );
    return jsonResponse({ answer, meta });
  } catch (error) {
    return errorResponse(error);
  }
}
