import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import multipartPlugin from "@fastify/multipart";

const multipart: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipartPlugin, {
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB
      files: 1,
    },
  });
};

export default fp(multipart, { name: "multipart" });
