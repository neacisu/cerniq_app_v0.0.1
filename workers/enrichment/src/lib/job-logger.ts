/**
 * Enrichment worker job logger — re-exports @cerniq/observability with ImportExecutionContext merge.
 */
import {
  createJobLogger as createJobLoggerCore,
  type JobLoggerOpts as CoreJobLoggerOpts,
} from "@cerniq/observability";
import type { ImportExecutionContext } from "@cerniq/worker-shared";

export type { JobLogLevel, JobLogger } from "@cerniq/observability";

export type JobLoggerOpts = CoreJobLoggerOpts & {
  importExecution?: ImportExecutionContext | null;
};

export function createJobLogger(opts: JobLoggerOpts): ReturnType<typeof createJobLoggerCore> {
  return createJobLoggerCore({
    ...opts,
    sessionId: opts.importExecution?.sessionId ?? opts.sessionId,
    runtimeJobKey: opts.importExecution?.runtimeJobKey ?? opts.runtimeJobKey,
    parentRuntimeJobKey:
      opts.importExecution?.parentRuntimeJobKey ?? opts.parentRuntimeJobKey ?? null,
  });
}
