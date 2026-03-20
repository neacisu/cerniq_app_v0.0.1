import type { ZodType } from "zod";

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

  throw new Error(
    `Invalid job payload for queue ${context.queueName} (job ${String(context.jobId ?? "unknown")}): ${issues}`,
  );
}
