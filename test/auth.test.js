// tests/auth.test.js
jest.mock("../utils/handleMails", () => ({
  sendEmail: jest.fn()
}));

const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/nosql/users");
const { sendEmail } = require("../utils/handleMails");
const { encrypt } = require("../utils/handlePassword");


describe("Auth Endpoints", () => {
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

  let userId;
  let token;

  test("POST /api/auth/register - Registra un usuario", async () => {
    sendEmail.mockResolvedValueOnce(true); // camino feliz

    const res = await request(app)
      .post("/api/auth/register")
      .send(userData);

    expect(res.statusCode).toEqual(200);
    userId = res.body.user._id;
    expect(userId).toBeDefined();
    token = res.body.token;
  });

  test("POST /api/auth/register - Falla el envío de email y entra en catch del then", async () => {
    const userWithEmail = {
      name: "User Fail Email",
      age: 30,
      email: "fail-email@example.com",
      password: "password123"
    };

    sendEmail.mockRejectedValueOnce(new Error("Fallo forzado en email"));

    const res = await request(app)
      .post("/api/auth/register")
      .send(userWithEmail);

    expect(res.statusCode).toEqual(200); // sigue siendo exitoso
    expect(res.body).toHaveProperty("user");
  });

  test("POST /api/auth/register - Email ya registrado (entra en catch) ", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(userData); // mismo email que antes

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty("error", "EMAIL_ALREADY_EXISTS");
  });

  test("POST /api/users/validate-email - Valida el correo del usuario", async () => {
    const user = await User.findById(userId);
    const code = user.emailVerificationCode;
    expect(code).toHaveLength(6);

    const res = await request(app)
      .post("/api/users/validate-email")
      .set("Authorization", `Bearer ${token}`)
      .send({ code });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Email verificado correctamente");

    // aseguramos que está verificado para cubrir rama negativa EMAIL_NOT_VERIFIED
    await User.findByIdAndUpdate(userId, { isEmailVerified: true });
  });

  test("POST /api/auth/login - Usuario no existe (entra en catch)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "noexiste@example.com",
        password: "password123"
      });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error", "USER_NOT_EXISTS");
  });

  test("POST /api/auth/login - Usuario no verificado (EMAIL_NOT_VERIFIED)", async () => {
    const unverifiedUser = new User({
      name: "Unverified",
      email: "unverified@example.com",
      password: await require("../utils/handlePassword").encrypt("pass1234"),
      isEmailVerified: false
    });
    await unverifiedUser.save();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: unverifiedUser.email, password: "pass1234" });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("error", "EMAIL_NOT_VERIFIED");
  });

  test("POST /api/auth/login - Contraseña incorrecta (INVALID_PASSWORD)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: userData.email,
        password: "wrongpassword"
      });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error", "INVALID_PASSWORD");
  });

  test("POST /api/auth/login - Login exitoso", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: userData.email,
        password: userData.password
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("_id", userId);
    expect(res.body.user.isEmailVerified).toBe(true);
  });

  test("POST /api/auth/register - Error inesperado en registerCtrl (entra en catch)", async () => {
    const spy = jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
      throw new Error("Fallo forzado en DB");
    });

    const user = {
      name: "Broken User",
      age: 25,
      email: "broken@example.com",
      password: "password123"
    };

    const res = await request(app).post("/api/auth/register").send(user);
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("error", "ERROR_REGISTER_USER");

    spy.mockRestore();
  });

  test("POST /api/auth/login - Error inesperado en loginCtrl (entra en catch)", async () => {
    const spy = jest.spyOn(User, "findOne").mockImplementationOnce(() => {
      throw new Error("Fallo forzado en login");
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "fake@example.com",
      password: "password123"
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("error", "ERROR_LOGIN_USER");

    spy.mockRestore();
  });

  test("POST /api/auth/login - Error si el usuario no existe", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nonexistent@example.com", password: "password123" });
  
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error", "USER_NOT_EXISTS");
  });
  
  test("POST /api/auth/login - Rechaza login si el email no está verificado", async () => {
    // Crea usuario con email no verificado
    const newUser = await User.create({
      name: "No Verified",
      email: "noverified@example.com",
      password: await encrypt("12345678"),
      isEmailVerified: false
    });
  
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: newUser.email, password: "12345678" });
  
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("error", "EMAIL_NOT_VERIFIED");
  });
  

});
