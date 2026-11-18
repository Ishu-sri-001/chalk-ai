export class AppError extends Error {
  constructor(code, message, status = 500, details) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const ErrorCodes = Object.freeze({
  INVALID_INPUT: "INVALID_INPUT",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  PROVIDER_AUTH: "PROVIDER_AUTH",
  PROVIDER_RATE_LIMIT: "PROVIDER_RATE_LIMIT",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  INVALID_AI_OUTPUT: "INVALID_AI_OUTPUT",
  TOPIC_REFUSED: "TOPIC_REFUSED",
  TIMEOUT: "TIMEOUT",
  ABORTED: "ABORTED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  DAILY_LIMIT: "DAILY_LIMIT",
  INTERNAL: "INTERNAL",
});
