const request = require("supertest");
const app = require("../app");
const fs = require("fs");
const path = require("path");


describe("Middlewares generales y server", () => {
  test("Middleware 404 global se activa", async () => {
    const res = await request(app).get("/no-api-match");
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Endpoint no encontrado" });
  });

  test("Ruta /api/error-forzado lanza error y entra en middleware global", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).get("/api/error-forzado");
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("error", "Error de prueba");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("Ruta /api/forbidden activa error 403 personalizado", async () => {
    const res = await request(app).get("/api/forbidden");
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("error", "Acceso denegado");
  });

  test("Archivo server.js debe contener app.listen", () => {
    const serverFile = fs.readFileSync(path.join(__dirname, "../server.js"), "utf-8");
    expect(serverFile).toMatch(/app\.listen\(/);
  });
});

describe("app.js special routes & middleware", () => {
  test("GET /api/error-forzado → error global 500", async () => {
    const res = await request(app).get("/api/error-forzado");
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Error de prueba" });
  });

  test("GET /api/forbidden → error global 403", async () => {
    const res = await request(app).get("/api/forbidden");
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Acceso denegado" });
  });

  test("GET /nada/por/aqui → 404 Endpoint no encontrado", async () => {
    const res = await request(app).get("/ruta/que/no/existe");
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Endpoint no encontrado" });
  });

  test("GET /api/error-no-message → 500 con mensaje por defecto", async () => {
    const res = await request(app).get("/api/error-no-message");
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Error Interno del Servidor" });
  });
  
});

const mongoose = require('mongoose');

afterAll(async () => {
  await mongoose.connection.close(); // cierra conexión a Mongo
});
