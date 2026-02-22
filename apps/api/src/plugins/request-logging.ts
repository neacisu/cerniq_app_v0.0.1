import type { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { randomUUID } from "node:crypto";

const requestLoggingFn: FastifyPluginCallback = (app, _opts, done) => {
  app.addHook("onRequest", (request, _reply, hookDone) => {
    request.headers["x-request-id"] ??= randomUUID();
    hookDone();
  });

  app.addHook("onResponse", (request, reply, hookDone) => {
    request.log.info({
      msg: "request completed",
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: reply.elapsedTime,
      requestId: request.headers["x-request-id"],
    });
    hookDone();
  });

  done();
};

export const requestLoggingPlugin = fp(requestLoggingFn, {
  name: "request-logging",
});
