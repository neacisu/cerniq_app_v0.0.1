import { UnrecoverableError } from "bullmq";
import { isTransientError as isTransientErrorCheck } from "@cerniq/observability";

export { isTransientError } from "@cerniq/observability";

export function classifyAndRethrow(error: unknown): never {
  if (isTransientErrorCheck(error)) {
    throw error;
  }
  const message = error instanceof Error ? error.message : String(error);
  throw new UnrecoverableError(message);
}
