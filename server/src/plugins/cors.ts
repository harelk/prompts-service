import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import corsPlugin from "@fastify/cors";

const cors: FastifyPluginAsync = async (fastify) => {
  await fastify.register(corsPlugin, {
    origin: [
      "http://localhost:5176",
      "http://127.0.0.1:5176",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
};

export default fp(cors, { name: "cors" });
