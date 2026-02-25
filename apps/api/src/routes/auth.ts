import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import {
  get_user_by_email,
  get_invite_code,
  register_new_company,
  register_with_invite_code,
} from "@cerniq/db";
import { envConfig } from "../config.js";

function getPgErrorCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  if ("cause" in err && err.cause && typeof err.cause === "object" && "code" in err.cause)
    return (err.cause as { code: string }).code;
  if ("code" in err && typeof (err as { code: unknown }).code === "string")
    return (err as { code: string }).code;
  return "";
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

const RegisterBodySchema = z
  .object({
    name: z.string().min(2, "Minim 2 caractere").max(200),
    email: z
      .string()
      .email()
      .max(320)
      .transform((v) => v.toLowerCase().trim()),
    password: z
      .string()
      .min(8, "Minim 8 caractere")
      .max(72, "Maxim 72 caractere (limita bcrypt)")
      .regex(/[A-Z]/, "Litera mare obligatorie")
      .regex(/[a-z]/, "Litera mica obligatorie")
      .regex(/[0-9]/, "Cifra obligatorie")
      .regex(/[^A-Za-z0-9]/, "Caracter special obligatoriu"),
    mode: z.enum(["new_company", "invite_code"]),
    companyName: z.string().min(2).max(200).optional(),
    inviteCode: z.string().min(4).max(20).optional(),
  })
  .refine((d) => (d.mode === "new_company" ? !!d.companyName : !!d.inviteCode), {
    message: "Camp obligatoriu lipsa pentru modul selectat",
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

  app.post("/register", async (request, reply) => {
    const parsed = RegisterBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: "Date invalide",
        details: parsed.error.flatten(),
      });
    }
    const { name, email, password, mode, companyName, inviteCode } = parsed.data;

    const existing = await get_user_by_email(email);
    if (existing) {
      request.log.info(
        { email: email.slice(0, 3) + "***" },
        "register 409: email already registered",
      );
      return reply.status(409).send({
        success: false,
        error: "Acest email este deja înregistrat.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let user: { id: string; tenantId: string; email: string; name: string; role: string };

    if (mode === "new_company" && companyName) {
      const slug =
        companyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        randomBytes(2).toString("hex");
      try {
        user = await register_new_company(companyName, slug, email, passwordHash, name);
      } catch (err: unknown) {
        const pgCode = getPgErrorCode(err);
        request.log.error({ err, pgCode }, "register_new_company failed");
        if (pgCode === "42P01") {
          return reply.status(503).send({
            success: false,
            error:
              "Serviciu temporar indisponibil. Migrările bazei de date nu au fost aplicate. Contactați administratorul.",
          });
        }
        const message = envConfig.NODE_ENV === "development" ? getErrorMessage(err) : undefined;
        return reply.status(500).send({
          success: false,
          error: "Eroare la crearea contului. Încercați din nou sau contactați administratorul.",
          ...(message && { details: { message } }),
        });
      }
    } else if (mode === "invite_code" && inviteCode) {
      const codeRow = await get_invite_code(inviteCode.trim());
      if (!codeRow) {
        return reply.status(400).send({
          success: false,
          error: "Cod de invitatie invalid sau expirat",
        });
      }
      try {
        user = await register_with_invite_code(codeRow, email, passwordHash, name);
      } catch (err: unknown) {
        const pgCode = getPgErrorCode(err);
        request.log.error({ err, pgCode }, "register_with_invite_code failed");
        if (pgCode === "42P01") {
          return reply.status(503).send({
            success: false,
            error:
              "Serviciu temporar indisponibil. Migrările bazei de date nu au fost aplicate. Contactați administratorul.",
          });
        }
        const message = envConfig.NODE_ENV === "development" ? getErrorMessage(err) : undefined;
        return reply.status(500).send({
          success: false,
          error: "Eroare la înscriere. Încercați din nou sau contactați administratorul.",
          ...(message && { details: { message } }),
        });
      }
    } else {
      return reply.status(400).send({
        success: false,
        error: "Camp obligatoriu lipsa",
      });
    }

    const token = app.jwt.sign(
      {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        sub: user.id,
      },
      { expiresIn: envConfig.JWT_EXPIRES_IN },
    );

    return reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
        },
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
