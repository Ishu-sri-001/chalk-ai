import { generateLesson } from "@/lib/ai/lesson-generator";
import { assertLessonAvailable, recordLesson } from "@/lib/daily-budget";
import { AppError, ErrorCodes } from "@/lib/errors";
import { guardRequest } from "@/lib/guard";
import { cleanText, errorResponse, jsonResponse, readJSONBody } from "@/lib/http";
import { LIMITS } from "@/lib/lesson/constants";

export const maxDuration = 120;

export async function POST(request) {
  try {
    guardRequest(request, "lesson");
    const body = await readJSONBody(request, 4_000);
    const topic = cleanText(body?.topic);
    if (!topic) {
      throw new AppError(ErrorCodes.INVALID_INPUT, "Enter a topic to learn about.", 400);
    }
    if (topic.length > LIMITS.topicMaxChars) {
      throw new AppError(
        ErrorCodes.INVALID_INPUT,
        `Keep the topic under ${LIMITS.topicMaxChars} characters.`,
        400
      );
    }
    if (!/[\p{L}\p{N}]/u.test(topic)) {
      throw new AppError(ErrorCodes.INVALID_INPUT, "That doesn't look like a topic. Try a few words.", 400);
    }

    assertLessonAvailable();

    const { lesson, meta } = await generateLesson(topic, { signal: request.signal });
    const daily = recordLesson();
    return jsonResponse({ lesson, meta, daily });
  } catch (error) {
    return errorResponse(error);
  }
}
