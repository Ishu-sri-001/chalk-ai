export class ApiError extends Error {
  constructor(code, message, status, daily) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.daily = daily;
  }
}

export function isAbortError(error) {
  return error?.name === "AbortError" || error?.code === "ABORTED";
}

async function postJSON(url, body, { signal } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(
      "NETWORK",
      "Couldn't reach Chalk. Check your internet connection and try again.",
      0
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
  }
  if (!res.ok || !data) {
    const err = data?.error;
    throw new ApiError(
      err?.code || "HTTP_" + res.status,
      err?.message ||
        (res.status === 504
          ? "The lesson took too long to generate. Try again."
          : "Something went wrong on the server. Try again."),
      res.status,
      data?.daily
    );
  }
  return data;
}

export function requestLesson(topic, options) {
  return postJSON("/api/lesson", { topic }, options);
}

export function requestFollowUp(payload, options) {
  return postJSON("/api/followup", payload, options);
}

export async function fetchStatus() {
  const res = await fetch("/api/status", { cache: "no-store" });
  if (!res.ok) throw new ApiError("STATUS", "Status unavailable", res.status);
  return res.json();
}
