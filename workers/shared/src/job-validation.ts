import type { ZodType } from "zod";
import { createServiceLogger } from "@cerniq/observability";

const jobValidationLog = createServiceLogger("job-validation");

function stringifyIssuePath(path: PropertyKey[]) {
  return path.length > 0 ? path.map(String).join(".") : "<root>";
}

export function validateJobData<T>(
  schema: ZodType<T>,
  data: unknown,
  context: { queueName: string; jobId?: string | number | null },
): T {
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues
    .map((issue) => `${stringifyIssuePath(issue.path)}: ${issue.message}`)
    .join("; ");

  jobValidationLog.warn(
    {
      queueName: context.queueName,
      jobId: context.jobId ?? null,
      issuesPreview: issues.slice(0, 500),
    },
    "invalid job payload (Zod)",
  );

  throw new Error(
    `Invalid job payload for queue ${context.queueName} (job ${String(context.jobId ?? "unknown")}): ${issues}`,
  );
}
