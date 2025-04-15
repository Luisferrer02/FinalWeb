// tests/users.test.js
const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/nosql/user");
const { tokenSign } = require("../utils/handleJwt");

let token;
let testUser;

beforeAll(async () => {
  await User.deleteMany({});
  
  testUser = new User({
    name: "User Test",
    lastName: "Test",
    email: "usertest@example.com",
    password: "password123",
    role: "user"
  });
  await testUser.save();
  token = tokenSign(testUser);
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe("Users API Endpoints", () => {
  test("GET /api/user/me - Obtiene usuario por token", async () => {
    const res = await request(app)
      .get("/api/user/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("email", testUser.email);
  });

  test("PATCH /api/user/onboarding/personal - Actualiza datos personales", async () => {
    const updateData = {
      name: "Updated Name",
      lastName: "Updated LastName",
      nif: "12345678A"
    };
    const res = await request(app)
      .patch("/api/user/onboarding/personal")
      .set("Authorization", `Bearer ${token}`)
      .send(updateData);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Datos personales actualizados");
    expect(res.body.user).toHaveProperty("name", updateData.name);
  });

  test("PATCH /api/user/onboarding/company - Actualiza datos de la compañía", async () => {
    const updateData = {
      companyName: "Company Test",
      cif: "C1234567",
      address: "Test Address"
    };
    const res = await request(app)
      .patch("/api/user/onboarding/company")
      .set("Authorization", `Bearer ${token}`)
      .send(updateData);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Datos de la compañía actualizados");
    expect(res.body.company).toHaveProperty("companyName", updateData.companyName);
  });

  test("DELETE /api/user/me - Elimina usuario (soft delete)", async () => {
    const res = await request(app)
      .delete("/api/user/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message");
  });
});
