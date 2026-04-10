/**
 * Schema log structurat pentru observability — extinde `@cerniq/shared-types` cu `errorType` opțional
 * (alias semantic lângă `errorClassification` din sursa comună).
 */
import { StructuredLogSchema as BaseStructuredLogSchema } from "@cerniq/shared-types";
import { z } from "zod";

export const StructuredLogSchema = BaseStructuredLogSchema.extend({
  errorType: z.string().optional(),
});

export type StructuredLog = z.infer<typeof StructuredLogSchema>;
