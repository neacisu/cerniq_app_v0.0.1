import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z, flattenError } from "zod";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import {
  get_user_by_email,
  get_invite_code,
  register_new_company,
  register_with_invite_code,
} from "@cerniq/db";
import { envConfig } from "../config.js";
import { AppError } from "../errors/app-error.js";
import {
  consumeRefreshToken,
  isRefreshFamilyRevoked,
  newTokenIds,
  revokeRefreshFamily,
  storeRefreshToken,
  verifyRefreshTokenHash,
} from "../lib/refresh-token-store.js";

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
  /** Zod 4: `z.string().email()` este deprecat; folosim `z.email()`. */
  email: z.email(),
  password: z.string().min(1).max(72),
});

const RegisterBodySchema = z
  .object({
    name: z.string().min(2, "Minim 2 caractere").max(200),
    email: z
      .email()
      .max(320)
      .transform((v) => v.toLowerCase().trim()),
    password: z
      .string()
      .min(8, "Minim 8 caractere")
      .max(72, "Maxim 72 caractere (limita bcrypt)")
      .regex(/[A-Z]/, "Litera mare obligatorie")
      .regex(/[a-z]/, "Litera mica obligatorie")
      .regex(/\d/, "Cifra obligatorie")
      .regex(/[^A-Za-z\d]/, "Caracter special obligatoriu"),
    mode: z.enum(["new_company", "invite_code"]),
    companyName: z.string().min(2).max(200).optional(),
    inviteCode: z.string().min(4).max(20).optional(),
  })
  .refine((d) => (d.mode === "new_company" ? !!d.companyName : !!d.inviteCode), {
    message: "Camp obligatoriu lipsa pentru modul selectat",
  });

const RefreshBodySchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

const LogoutBodySchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

type AuthUserPayload = {
  id: string;
  email: string;
  tenantId: string;
  role: string;
};

type RegisterBody = z.infer<typeof RegisterBodySchema>;

type RegisteredUserRow = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
};

/** Extrage prima valoare din header multi-valoare (ex. duplicate proxies). */
function coerceSingleHeaderValue(raw: string | string[] | undefined): string | null {
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }
  return null;
}

/** Durată tip `15m`, `24h` etc. — folosește `RegExp.exec` (Sonar S6594). */
const JWT_DURATION_RE = /^(\d+)([smhd])$/i;

function parseDurationToSeconds(value: string): number {
  const match = JWT_DURATION_RE.exec(value.trim());
  if (!match) return 60 * 60 * 24 * 30;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "s") return amount;
  if (unit === "m") return amount * 60;
  if (unit === "h") return amount * 60 * 60;
  return amount * 60 * 60 * 24;
}

function buildTenantSlugFromCompanyName(companyName: string): string {
  const normalized = companyName
    .toLowerCase()
    .replaceAll(/[^a-z\d]+/g, "-")
    .split("-")
    .filter(Boolean)
    .join("-");
  return `${normalized}-${randomBytes(2).toString("hex")}`;
}

function jwtPayloadStringField(payload: Record<string, unknown>, key: string): string {
  const v = payload[key];
  return typeof v === "string" ? v : "";
}

function replyRegisterDatabaseError(
  reply: FastifyReply,
  request: FastifyRequest,
  err: unknown,
  logLabel: string,
  userFacingError: string,
) {
  const pgCode = getPgErrorCode(err);
  request.log.error({ err, pgCode }, `${logLabel} failed`);
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
    error: userFacingError,
    ...(message && { details: { message } }),
  });
}

async function tryCreateRegisteredUser(
  request: FastifyRequest,
  reply: FastifyReply,
  body: RegisterBody,
  passwordHash: string,
): Promise<RegisteredUserRow | null> {
  const { name, email, mode, companyName, inviteCode } = body;

  if (mode === "new_company" && companyName) {
    const slug = buildTenantSlugFromCompanyName(companyName);
    try {
      return await register_new_company(companyName, slug, email, passwordHash, name);
    } catch (err: unknown) {
      replyRegisterDatabaseError(
        reply,
        request,
        err,
        "register_new_company",
        "Eroare la crearea contului. Încercați din nou sau contactați administratorul.",
      );
      return null;
    }
  }

  if (mode === "invite_code" && inviteCode) {
    const codeRow = await get_invite_code(inviteCode.trim());
    if (!codeRow) {
      reply.status(400).send({
        success: false,
        error: "Cod de invitatie invalid sau expirat",
      });
      return null;
    }
    try {
      return await register_with_invite_code(codeRow, email, passwordHash, name);
    } catch (err: unknown) {
      replyRegisterDatabaseError(
        reply,
        request,
        err,
        "register_with_invite_code",
        "Eroare la înscriere. Încercați din nou sau contactați administratorul.",
      );
      return null;
    }
  }

  reply.status(400).send({
    success: false,
    error: "Camp obligatoriu lipsa",
  });
  return null;
}

const AUTH_COOKIE_PATH = "/api/v1/auth";
const CSRF_COOKIE_NAME = "cerniq_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const AUTH_ISSUER = "cerniq.app";
const AUTH_AUDIENCE = "cerniq-api";

function buildAuthCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: envConfig.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: AUTH_COOKIE_PATH,
    maxAge: maxAgeSeconds,
  };
}

function buildCsrfCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: false,
    secure: envConfig.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: AUTH_COOKIE_PATH,
    maxAge: maxAgeSeconds,
  };
}

function issueCsrfToken(reply: FastifyReply): string {
  const csrfToken = randomBytes(32).toString("hex");
  reply.setCookie(
    CSRF_COOKIE_NAME,
    csrfToken,
    buildCsrfCookieOptions(parseDurationToSeconds(envConfig.JWT_REFRESH_EXPIRES_IN)),
  );
  return csrfToken;
}

function shouldEnforceCsrf(request: FastifyRequest): boolean {
  const routePath = (request.routeOptions.url ?? request.url ?? "").split("?")[0] ?? "";
  const normalized = routePath.replace(/\/+$/, "") || routePath;
  const isProtectedAuthMutation =
    normalized === "/refresh" ||
    normalized === "/logout" ||
    normalized.endsWith("/auth/refresh") ||
    normalized.endsWith("/auth/logout");
  return isProtectedAuthMutation && typeof request.cookies?.refreshToken === "string";
}

async function issueAuthTokens(
  app: FastifyInstance,
  user: AuthUserPayload,
  existingFamilyId?: string,
) {
  const accessToken = app.jwt.sign(
    {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      sub: user.id,
      iss: AUTH_ISSUER,
      aud: AUTH_AUDIENCE,
      tokenType: "access",
    },
    {
      expiresIn: envConfig.JWT_EXPIRES_IN,
    },
  );

  const ids = newTokenIds(existingFamilyId);
  const refreshToken = app.jwt.sign(
    {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      sub: user.id,
      iss: AUTH_ISSUER,
      aud: AUTH_AUDIENCE,
      tokenType: "refresh",
      jti: ids.jti,
      familyId: ids.familyId,
    },
    {
      key: envConfig.JWT_REFRESH_SECRET,
      expiresIn: envConfig.JWT_REFRESH_EXPIRES_IN,
    },
  );
  try {
    await storeRefreshToken({
      jti: ids.jti,
      familyId: ids.familyId,
      userId: user.id,
      tenantId: user.tenantId,
      token: refreshToken,
      expiresInSeconds: parseDurationToSeconds(envConfig.JWT_REFRESH_EXPIRES_IN),
    });
  } catch {
    throw new AppError("Cache unavailable. Please try again shortly.", 503, "CACHE_UNAVAILABLE");
  }
  return { accessToken, refreshToken, familyId: ids.familyId };
}

export async function authRoutes(app: FastifyInstance) {
  const loginRateLimit = app.rateLimit({
    max: 10,
    timeWindow: "15 minutes",
  });

  app.addHook("preHandler", async (request, reply) => {
    if (!shouldEnforceCsrf(request)) {
      return;
    }
    const csrfHeaderValue = coerceSingleHeaderValue(request.headers[CSRF_HEADER_NAME]);
    const rawCookie = request.cookies?.[CSRF_COOKIE_NAME];
    const csrfCookieValue = typeof rawCookie === "string" ? rawCookie : null;
    if (!csrfHeaderValue || !csrfCookieValue || csrfHeaderValue !== csrfCookieValue) {
      return reply.status(403).send({
        success: false,
        error: "CSRF validation failed",
      });
    }
  });

  app.post("/login", { preHandler: [loginRateLimit] }, async (request, reply) => {
    const parsed = LoginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid email or password",
        details: flattenError(parsed.error),
      });
    }

    const { email, password } = parsed.data;

    let user;
    try {
      user = await get_user_by_email(email);
    } catch (err: unknown) {
      request.log.error({ err }, "login: database unreachable");
      return reply.status(503).send({
        success: false,
        error: "Service temporarily unavailable. Please try again shortly.",
      });
    }

    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
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

    const { accessToken, refreshToken } = await issueAuthTokens(app, {
      id: user.id,
      email: user.email,
      tenantId,
      role,
    });
    reply.setCookie(
      "refreshToken",
      refreshToken,
      buildAuthCookieOptions(parseDurationToSeconds(envConfig.JWT_REFRESH_EXPIRES_IN)),
    );
    const csrfToken = issueCsrfToken(reply);

    return reply.send({
      success: true,
      data: {
        token: accessToken,
        refreshToken,
        csrfToken,
        user: { id: user.id, email: user.email, name: user.name, tenantId, role },
        expiresIn: envConfig.JWT_EXPIRES_IN,
      },
    });
  });

  app.post("/register", { preHandler: [loginRateLimit] }, async (request, reply) => {
    const parsed = RegisterBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: "Date invalide",
        details: flattenError(parsed.error),
      });
    }
    const { email, password } = parsed.data;

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
    const user = await tryCreateRegisteredUser(request, reply, parsed.data, passwordHash);
    if (!user) {
      return;
    }

    const { accessToken, refreshToken } = await issueAuthTokens(app, {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });
    reply.setCookie(
      "refreshToken",
      refreshToken,
      buildAuthCookieOptions(parseDurationToSeconds(envConfig.JWT_REFRESH_EXPIRES_IN)),
    );
    const csrfToken = issueCsrfToken(reply);

    return reply.send({
      success: true,
      data: {
        token: accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
        },
        csrfToken,
        expiresIn: envConfig.JWT_EXPIRES_IN,
      },
    });
  });

  app.post("/refresh", async (request, reply) => {
    const parsed = RefreshBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: "Date invalide",
        details: flattenError(parsed.error),
      });
    }
    const cookieToken = request.cookies?.refreshToken;
    const refreshToken = parsed.data.refreshToken ?? cookieToken;
    if (!refreshToken) {
      return reply.status(401).send({ success: false, error: "Refresh token lipsa" });
    }

    let payload: Record<string, unknown>;
    try {
      payload = app.jwt.verify<Record<string, unknown>>(refreshToken, {
        key: envConfig.JWT_REFRESH_SECRET,
        allowedIss: AUTH_ISSUER,
        allowedAud: AUTH_AUDIENCE,
      });
    } catch {
      return reply.status(401).send({ success: false, error: "Refresh token invalid" });
    }

    if (
      payload.tokenType !== "refresh" ||
      typeof payload.jti !== "string" ||
      typeof payload.familyId !== "string"
    ) {
      return reply.status(401).send({ success: false, error: "Refresh token invalid" });
    }
    const familyRevoked = await isRefreshFamilyRevoked(payload.familyId);
    if (familyRevoked) {
      return reply.status(401).send({ success: false, error: "Refresh token family revocata" });
    }

    const isHashValid = await verifyRefreshTokenHash(payload.jti, refreshToken);
    if (!isHashValid) {
      await revokeRefreshFamily(payload.familyId);
      return reply.status(401).send({ success: false, error: "Refresh token invalidat" });
    }

    const consumed = await consumeRefreshToken(payload.jti);
    if (!consumed) {
      await revokeRefreshFamily(payload.familyId);
      return reply.status(401).send({ success: false, error: "Refresh token reutilizat" });
    }

    const user = await get_user_by_email(jwtPayloadStringField(payload, "email"));
    if (user?.status !== "active") {
      return reply.status(401).send({ success: false, error: "Utilizator invalid" });
    }
    const { accessToken, refreshToken: rotatedRefresh } = await issueAuthTokens(
      app,
      {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      },
      payload.familyId,
    );
    reply.setCookie(
      "refreshToken",
      rotatedRefresh,
      buildAuthCookieOptions(parseDurationToSeconds(envConfig.JWT_REFRESH_EXPIRES_IN)),
    );
    const csrfToken = issueCsrfToken(reply);

    return reply.send({
      success: true,
      data: {
        token: accessToken,
        refreshToken: rotatedRefresh,
        csrfToken,
        expiresIn: envConfig.JWT_EXPIRES_IN,
      },
    });
  });

  app.post("/logout", async (request, reply) => {
    const parsed = LogoutBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: "Date invalide",
        details: flattenError(parsed.error),
      });
    }
    const refreshToken = parsed.data.refreshToken ?? request.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const payload = app.jwt.verify<Record<string, unknown>>(refreshToken, {
          key: envConfig.JWT_REFRESH_SECRET,
          allowedIss: AUTH_ISSUER,
          allowedAud: AUTH_AUDIENCE,
        });
        if (typeof payload.familyId === "string") {
          await revokeRefreshFamily(payload.familyId);
        }
        if (typeof payload.jti === "string") {
          await consumeRefreshToken(payload.jti);
        }
      } catch {
        // No-op for already invalid tokens.
      }
    }

    reply.clearCookie("refreshToken", { path: AUTH_COOKIE_PATH });
    reply.clearCookie(CSRF_COOKIE_NAME, { path: AUTH_COOKIE_PATH });
    return reply.send({ success: true, data: { loggedOut: true } });
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
