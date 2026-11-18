import { synthesizeSpeech } from "@/lib/ai/tts";
import { AppError, ErrorCodes } from "@/lib/errors";
import { guardRequest } from "@/lib/guard";
import { cleanText, errorResponse, readJSONBody } from "@/lib/http";

export const maxDuration = 60;

const MAX_CHARS = 1500;

export async function POST(request) {
  try {
    guardRequest(request, "tts");
    const body = await readJSONBody(request, 8_000);
    const text = cleanText(body?.text);
    if (!text) throw new AppError(ErrorCodes.INVALID_INPUT, "Nothing to say.", 400);
    if (text.length > MAX_CHARS) {
      throw new AppError(ErrorCodes.INVALID_INPUT, "Narration text is too long.", 400);
    }

    const { audio, contentType, provider } = await synthesizeSpeech(text, { signal: request.signal });
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "no-store",
        "X-Voice-Provider": provider,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
