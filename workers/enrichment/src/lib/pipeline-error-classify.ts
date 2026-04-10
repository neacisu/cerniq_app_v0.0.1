/** Clasificare erori pentru pipeline:error-handler (fără dependențe de BullMQ). */
export function classifyErrorType(error: unknown): string {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const errorCode = (error as { code?: string })?.code?.toUpperCase() ?? "";
  const statusCode =
    (error as { status?: number; statusCode?: number })?.status ??
    (error as { status?: number; statusCode?: number })?.statusCode ??
    0;

  if (statusCode === 429 || message.includes("too many requests")) {
    return "RATE_LIMITED";
  }
  if (statusCode === 402 || message.includes("quota exceeded") || message.includes("billing")) {
    return "QUOTA_EXCEEDED";
  }
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("api key") ||
    message.includes("credentials")
  ) {
    return "AUTH_ERROR";
  }
  if (message.includes("circuit") && message.includes("open")) {
    return "CIRCUIT_OPEN";
  }

  const RETRYABLE_CODES = [
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNRESET",
    "EPIPE",
    "EAI_AGAIN",
  ];
  if (RETRYABLE_CODES.includes(errorCode)) {
    return "NETWORK_ERROR";
  }

  if (
    statusCode === 408 ||
    statusCode === 504 ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return "API_TIMEOUT";
  }
  if (statusCode >= 500 && statusCode < 600) {
    return "NETWORK_ERROR";
  }
  if (
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("etimedout") ||
    message.includes("econnreset") ||
    message.includes("network error")
  ) {
    return "NETWORK_ERROR";
  }
  if (statusCode === 404 || message.includes("not found")) return "DATA_NOT_FOUND";
  if (message.includes("validation") || message.includes("invalid") || message.includes("schema"))
    return "VALIDATION_ERROR";
  return "PERMANENT_FAILURE";
}
