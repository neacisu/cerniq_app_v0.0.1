/**
 * Notificări aplicație — polling JSON (GET listă, PATCH citit, POST citite toate).
 * RLS: `tenant-context` + `app.current_user_id` pentru vizibilitate broadcast / per-user.
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  and,
  db,
  desc,
  eq,
  isNull,
  notifications as appNotifications,
  or,
  setSessionTenantId,
  sql,
} from "@cerniq/db";
import { getActorId, requireTenantId } from "./utils.js";

const listQuerySchema = z.object({
  unread: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const idParamSchema = z.object({ id: z.uuid() });

export async function notificationsRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  app.get("/", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const actorId = getActorId(req);
    const q = listQuerySchema.parse(req.query);
    await setSessionTenantId(tenantId);

    const visibility = or(isNull(appNotifications.userId), eq(appNotifications.userId, actorId));
    const whereClause =
      q.unread === true ? and(visibility, isNull(appNotifications.readAt)) : visibility;

    const rows = await db
      .select({
        id: appNotifications.id,
        type: appNotifications.type,
        channel: appNotifications.channel,
        title: appNotifications.title,
        body: appNotifications.body,
        data: appNotifications.data,
        readAt: appNotifications.readAt,
        sentAt: appNotifications.sentAt,
        createdAt: appNotifications.createdAt,
      })
      .from(appNotifications)
      .where(whereClause)
      .orderBy(desc(appNotifications.createdAt))
      .limit(q.limit);

    const [countRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(appNotifications)
      .where(and(visibility, isNull(appNotifications.readAt)));

    const unreadCount = countRow?.c ?? 0;

    return reply.send({
      success: true,
      data: { items: rows, unreadCount },
    });
  });

  app.patch("/:id/read", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const actorId = getActorId(req);
    const { id } = idParamSchema.parse(req.params);
    await setSessionTenantId(tenantId);

    const visibility = or(isNull(appNotifications.userId), eq(appNotifications.userId, actorId));

    const [updated] = await db
      .update(appNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(appNotifications.id, id), visibility, isNull(appNotifications.readAt)))
      .returning({ id: appNotifications.id });

    if (!updated) {
      return reply.status(404).send({ success: false, error: "Notification not found" });
    }

    return reply.send({ success: true, data: { id: updated.id } });
  });

  app.post("/read-all", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const actorId = getActorId(req);
    await setSessionTenantId(tenantId);

    const visibility = or(isNull(appNotifications.userId), eq(appNotifications.userId, actorId));

    const result = await db
      .update(appNotifications)
      .set({ readAt: new Date() })
      .where(and(visibility, isNull(appNotifications.readAt)))
      .returning({ id: appNotifications.id });

    return reply.send({
      success: true,
      data: { markedRead: result.length },
    });
  });
}
