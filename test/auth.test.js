// tests/auth.test.js
const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/nosql/users");

describe("Auth Endpoints", () => {
  // Limpieza de usuarios antes y después de los tests
  beforeAll(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  const userData = {
    name: "Auth Test User",
    age: 30,
    email: "authtest@example.com",
    password: "password123"
  };

  let token;
  let userId;

  test("POST /api/auth/register - Registra un usuario", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(userData);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("_id");
    token = res.body.token;
    userId = res.body.user._id;
  });

  test("POST /api/auth/login - Log in con el usuario registrado", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: userData.email,
        password: userData.password
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
    // Opcional: comprobar que el user coincide
    expect(res.body.user).toHaveProperty("_id", userId);
  });
});
