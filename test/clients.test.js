const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const Client = require("../models/nosql/clients");
const User = require("../models/nosql/users");
const { tokenSign } = require("../utils/handleJwt");

let token;
let testUser;
let clientId;

beforeAll(async () => {
  // Crear usuario de prueba
  testUser = new User({
    name: "Test User",
    email: "testuser@example.com",
    password: "password123", // Este campo en producción debe venir cifrado o crearlo mediante el endpoint de registro
    role: "user"
  });
  await testUser.save();
  token = tokenSign(testUser);
});

afterAll(async () => {
  // Limpieza de la base de datos de test y cierre de conexión
  await User.deleteMany({});
  await Client.deleteMany({});
  await mongoose.connection.close();
});

describe("Clientes API endpoints", () => {
  test("POST /api/client - Crea un cliente", async () => {
    const newClient = {
      name: "Test Client",
      cif: "T1234567",
      address: {
        street: "Test Street",
        number: 10,
        postal: 12345,
        city: "Test City",
        province: "Test Province"
      }
    };
    const res = await request(app)
      .post("/api/client")
      .set("Authorization", `Bearer ${token}`)
      .send(newClient);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.name).toBe(newClient.name);
    clientId = res.body._id; // Guardamos para pruebas subsiguientes
  });

  test("GET /api/client - Lista clientes", async () => {
    const res = await request(app)
      .get("/api/client")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/client/:id - Detalle de un cliente", async () => {
    const res = await request(app)
      .get(`/api/client/${clientId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id", clientId);
  });

  test("PUT /api/client/:id - Actualiza un cliente", async () => {
    const updateData = {
      name: "Updated Client",
      cif: "U1234567",
      address: {
        street: "Updated Street",
        number: 20,
        postal: 54321,
        city: "Updated City",
        province: "Updated Province"
      }
    };
    const res = await request(app)
      .put(`/api/client/${clientId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updateData);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("name", updateData.name);
  });

  test("DELETE /api/client/archive/:id - Archiva (soft delete) cliente", async () => {
    const res = await request(app)
      .delete(`/api/client/archive/${clientId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Cliente archivado correctamente");
  });

  test("GET /api/client/archive - Lista clientes archivados", async () => {
    const res = await request(app)
      .get("/api/client/archive")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    const archived = res.body.find(client => client._id === clientId);
    expect(archived).toBeDefined();
  });

  test("PATCH /api/client/restore/:id - Restaura un cliente archivado", async () => {
    const res = await request(app)
      .patch(`/api/client/restore/${clientId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Cliente restaurado correctamente");
  });

  test("DELETE /api/client/:id - Elimina (hard delete) un cliente", async () => {
    const res = await request(app)
      .delete(`/api/client/${clientId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Cliente eliminado correctamente");
  });
});
