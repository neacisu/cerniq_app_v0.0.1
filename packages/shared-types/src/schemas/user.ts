import { z } from "zod";

export const UserRoleSchema = z.enum(["owner", "admin", "manager", "operator", "viewer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(["active", "inactive", "pending", "locked"]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  passwordHash: z.string().optional(),
  name: z.string().min(1).max(200),
  role: UserRoleSchema.default("viewer"),
  status: UserStatusSchema.default("pending"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;
export const UserCreateSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type UserCreate = z.infer<typeof UserCreateSchema>;
