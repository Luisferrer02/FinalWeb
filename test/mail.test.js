// tests/mail.test.js
const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");

describe("Mail API Endpoints", () => {
  // No se crean registros en la base de datos, así que solo probamos el endpoint.
  test("POST /api/mail - Envía un email", async () => {
    const emailData = {
      subject: "Prueba de Email",
      text: "Este es un email de prueba.",
      to: "destino@example.com",
      from: "origen@example.com"
    };
    const res = await request(app)
      .post("/api/mail")
      .send(emailData);
    // Dependiendo de la implementación, se puede esperar un 200 (OK) o 202 (Accepted)
    expect(res.statusCode).toBeGreaterThanOrEqual(200);
    expect(res.statusCode).toBeLessThan(300);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });
});
