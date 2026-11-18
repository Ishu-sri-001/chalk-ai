import "server-only";
import { AppError, ErrorCodes } from "@/lib/errors";

export async function readJSONBody(request, maxBytes) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    throw new AppError(ErrorCodes.INVALID_INPUT, "Request is too large.", 413);
  }
  let text;
  try {
    text = await request.text();
  } catch {
    throw new AppError(ErrorCodes.ABORTED, "Request cancelled.", 499);
  }
  if (text.length > maxBytes) {
    throw new AppError(ErrorCodes.INVALID_INPUT, "Request is too large.", 413);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(ErrorCodes.INVALID_INPUT, "Request body must be valid JSON.", 400);
  }
}

export function errorResponse(error) {
  if (error instanceof AppError) {
    const headers = { "Cache-Control": "no-store" };
    if (error.retryAfter) headers["Retry-After"] = String(error.retryAfter);
    return Response.json(
      {
        error: { code: error.code, message: error.message },
        ...(error.daily !== undefined ? { daily: error.daily } : {}),
      },
      { status: error.status, headers }
    );
  }
  console.error("[api] unexpected error:", error);
  return Response.json(
    { error: { code: ErrorCodes.INTERNAL, message: "Something went wrong on the server. Try again." } },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
}

export function jsonResponse(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });
}

export function cleanText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
