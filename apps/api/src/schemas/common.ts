import { z } from "zod";

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const uuidSchema = z.string().uuid();

export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const cuiSchema = z
  .string()
  .trim()
  .regex(/^(RO)?\d{2,12}$/i, "CUI invalid");

export const phoneRoSchema = z
  .string()
  .trim()
  .regex(/^(\+4|004)?0?[0-9]{9,10}$/, "Telefon RO invalid");

export const emailSchema = z.email();

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
  });
