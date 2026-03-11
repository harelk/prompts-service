import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const errorHandler: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500;

    // Always log the real error server-side for diagnostics.
    fastify.log.error(error);

    // For 5xx errors, never expose internal details (DB errors, stack traces,
    // library messages) to the client.
    const isServerError = statusCode >= 500;
    const clientMessage = isServerError
      ? "Internal server error"
      : (error.message ?? "An unexpected error occurred");
    const clientCode = isServerError
      ? "INTERNAL_SERVER_ERROR"
      : (error.code ?? "INTERNAL_SERVER_ERROR");

    return reply.status(statusCode).send({
      error: {
        code: clientCode,
        message: clientMessage,
        statusCode,
      },
    });
  });

  fastify.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
        statusCode: 404,
      },
    });
  });
};

export default fp(errorHandler, { name: "error-handler" });
