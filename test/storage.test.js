// tests/storage.test.js
const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const Storage = require("../models/nosql/storage");
const fs = require("fs");
const path = require("path");

let storageItemId;

describe("Storage API Endpoints", () => {
  test("POST /api/storage - Crea un archivo (subida a IPFS simulada)", async () => {
    // Para simular la subida, leemos un archivo de ejemplo (puede ser cualquier archivo)
    const filePath = path.join(__dirname, "firma.png"); // Usamos la misma imagen para pruebas
    const res = await request(app)
      .post("/api/storage")
      .attach("image", filePath);
    // Espera que devuelva status 200 y el objeto creado
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id");
    storageItemId = res.body._id;
  });

  test("GET /api/storage - Lista archivos", async () => {
    const res = await request(app)
      .get("/api/storage");
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/storage/:id - Obtiene un archivo", async () => {
    const res = await request(app)
      .get(`/api/storage/${storageItemId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id", storageItemId);
  });

  test("DELETE /api/storage/:id - Elimina un archivo", async () => {
    const res = await request(app)
      .delete(`/api/storage/${storageItemId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Archivo eliminado correctamente");
  });

  afterAll(async () => {
    await Storage.deleteMany({});
    await mongoose.connection.close();
  });
});
