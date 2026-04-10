import { UnrecoverableError } from "bullmq";
import {
  createServiceLogger,
  enrichError,
  isTransientError as isTransientErrorCheck,
} from "@cerniq/observability";

export { isTransientError } from "@cerniq/observability";

const log = createServiceLogger("error-classification", { etapa: "e1" });

export function classifyAndRethrow(error: unknown, ctx?: { workerName?: string }): never {
  const workerName = ctx?.workerName ?? "unknown-normalizer";

  if (isTransientErrorCheck(error)) {
    log.info({
      event: "normalizer_error_transient",
      workerName,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const enr = enrichError(error, { workerName, classification: "unrecoverable" });
  log.error({
    event: "normalizer_error_unrecoverable",
    workerName,
    ...enr,
    err: error,
  });

  const message = error instanceof Error ? error.message : String(error);
  throw new UnrecoverableError(message);
}
