// test/cors.middleware.test.js
jest.resetModules();
process.env.CORS_ORIGINS = "http://allowed.com";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

describe("CORS middleware", () => {
  test("allows request without Origin header", async () => {
    const res = await request(app).get("/api/forbidden");
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Acceso denegado" });
  });

  test("allows request with allowed Origin header", async () => {
    const res = await request(app)
      .get("/api/forbidden")
      .set("Origin", "http://allowed.com");
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Acceso denegado" });
  });

  test("blocks request with disallowed Origin header", async () => {
    const res = await request(app)
      .get("/api/forbidden")
      .set("Origin", "http://evil.com");
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "CORS_NOT_ALLOWED" });
  });
});

// Cierra la conexión a Mongo para que Jest pueda finalizar correctamente
afterAll(async () => {
  await mongoose.connection.close();
});
