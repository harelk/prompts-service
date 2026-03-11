/**
 * Integration tests for the Prompts Service API.
 *
 * Run with: npm test --workspace=server
 *
 * Requires a running PostgreSQL instance and valid DATABASE_URL in .env
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

before(async () => {
  app = buildApp();
  await app.ready();
});

after(async () => {
  await app.close();
});

// --- Health ---

test("GET /api/health returns 200 without auth", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/health",
  });
  assert.equal(res.statusCode, 200);
  const body = res.json<{ status: string }>();
  assert.equal(body.status, "ok");
});

// --- Auth ---

test("GET /api/services returns 401 without auth", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/services",
  });
  assert.equal(res.statusCode, 401);
  const body = res.json<{ error: { code: string } }>();
  assert.equal(body.error.code, "UNAUTHORIZED");
});

test("GET /api/services returns 401 with wrong token", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/services",
    headers: { Authorization: "Bearer wrong-password" },
  });
  assert.equal(res.statusCode, 401);
});

// --- Services CRUD ---

const AUTH = { Authorization: `Bearer ${process.env.AUTH_PASSWORD ?? "change-me"}` };
let createdServiceId: string;

test("GET /api/services returns array", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/services",
    headers: AUTH,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json<unknown[]>();
  assert.ok(Array.isArray(body));
});

test("POST /api/services creates a service", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/services",
    headers: { ...AUTH, "Content-Type": "application/json" },
    payload: JSON.stringify({ name: `Test Service ${Date.now()}` }),
  });
  assert.equal(res.statusCode, 201);
  const body = res.json<{ id: string; name: string }>();
  assert.ok(body.id);
  assert.ok(body.name.startsWith("Test Service"));
  createdServiceId = body.id;
});

test("POST /api/services returns 400 with empty name", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/services",
    headers: { ...AUTH, "Content-Type": "application/json" },
    payload: JSON.stringify({ name: "" }),
  });
  assert.equal(res.statusCode, 400);
});

test("DELETE /api/services/:id deletes the service", async () => {
  assert.ok(createdServiceId, "createServiceId must be set");
  const res = await app.inject({
    method: "DELETE",
    url: `/api/services/${createdServiceId}`,
    headers: AUTH,
  });
  assert.equal(res.statusCode, 204);
});

test("DELETE /api/services/:id returns 404 for non-existent", async () => {
  const res = await app.inject({
    method: "DELETE",
    url: "/api/services/00000000-0000-0000-0000-000000000000",
    headers: AUTH,
  });
  assert.equal(res.statusCode, 404);
});

// --- Prompts CRUD ---

let createdPromptId: string;

test("GET /api/prompts returns empty array or list", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/prompts",
    headers: AUTH,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json<unknown[]>();
  assert.ok(Array.isArray(body));
});

test("POST /api/prompts creates a prompt", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/prompts",
    headers: { ...AUTH, "Content-Type": "application/json" },
    payload: JSON.stringify({
      title: "My Test Prompt",
      content: "Write something creative",
      status: "draft",
    }),
  });
  assert.equal(res.statusCode, 201);
  const body = res.json<{ id: string; title: string; status: string; services: unknown[] }>();
  assert.equal(body.title, "My Test Prompt");
  assert.equal(body.status, "draft");
  assert.ok(Array.isArray(body.services));
  createdPromptId = body.id;
});

test("POST /api/prompts returns 400 with missing title", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/prompts",
    headers: { ...AUTH, "Content-Type": "application/json" },
    payload: JSON.stringify({ content: "No title here" }),
  });
  assert.equal(res.statusCode, 400);
  const body = res.json<{ error: { code: string } }>();
  assert.equal(body.error.code, "VALIDATION_ERROR");
});

test("GET /api/prompts/:id returns the created prompt", async () => {
  assert.ok(createdPromptId);
  const res = await app.inject({
    method: "GET",
    url: `/api/prompts/${createdPromptId}`,
    headers: AUTH,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json<{ id: string; title: string }>();
  assert.equal(body.id, createdPromptId);
  assert.equal(body.title, "My Test Prompt");
});

test("PATCH /api/prompts/:id updates the prompt", async () => {
  assert.ok(createdPromptId);
  const res = await app.inject({
    method: "PATCH",
    url: `/api/prompts/${createdPromptId}`,
    headers: { ...AUTH, "Content-Type": "application/json" },
    payload: JSON.stringify({ status: "active", title: "Updated Title" }),
  });
  assert.equal(res.statusCode, 200);
  const body = res.json<{ status: string; title: string }>();
  assert.equal(body.status, "active");
  assert.equal(body.title, "Updated Title");
});

test("GET /api/prompts?status=active filters by status", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/prompts?status=active",
    headers: AUTH,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json<{ status: string }[]>();
  assert.ok(body.every((p) => p.status === "active"));
});

test("GET /api/prompts?search=Updated finds the prompt", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/prompts?search=Updated",
    headers: AUTH,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json<{ title: string }[]>();
  assert.ok(body.some((p) => p.title.includes("Updated")));
});

test("DELETE /api/prompts/:id deletes the prompt", async () => {
  assert.ok(createdPromptId);
  const res = await app.inject({
    method: "DELETE",
    url: `/api/prompts/${createdPromptId}`,
    headers: AUTH,
  });
  assert.equal(res.statusCode, 204);
});

test("GET /api/prompts/:id returns 404 after deletion", async () => {
  const res = await app.inject({
    method: "GET",
    url: `/api/prompts/${createdPromptId}`,
    headers: AUTH,
  });
  assert.equal(res.statusCode, 404);
});
