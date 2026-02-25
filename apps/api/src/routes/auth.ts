import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { get_user_by_email } from "@cerniq/db";
import { envConfig } from "../config.js";

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const parsed = LoginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid email or password",
        details: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;

    const user = await get_user_by_email(email);

    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({
        success: false,
        error: "Invalid email or password",
      });
    }

    if (user.status !== "active") {
      return reply.status(401).send({
        success: false,
        error: "Account is not active",
      });
    }

    const tenantId = user.tenantId;
    const role = user.role;

    const token = app.jwt.sign(
      {
        id: user.id,
        email: user.email,
        tenantId,
        role,
        sub: user.id,
      },
      { expiresIn: envConfig.JWT_EXPIRES_IN },
    );

    return reply.send({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, tenantId, role },
        expiresIn: envConfig.JWT_EXPIRES_IN,
      },
    });
  });

  app.get(
    "/me",
    {
      onRequest: [async (req, _reply) => req.jwtVerify()],
    },
    async (request) => {
      const user = request.user as Record<string, unknown> | undefined;
      return { success: true, data: { user } };
    },
  );
}
