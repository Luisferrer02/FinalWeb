// tests/project.test.js
const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const Project = require("../models/nosql/projects");
const User = require("../models/nosql/users");
const Client = require("../models/nosql/clients");
const { tokenSign } = require("../utils/handleJwt");

let token;
let testUser, testClient;
let projectId;

beforeAll(async () => {
  await Project.deleteMany({});
  await Client.deleteMany({});
  await User.deleteMany({});

  testUser = new User({
    name: "Project Test User",
    email: "projectuser@example.com",
    password: "password123",
    role: "user"
  });
  await testUser.save();
  token = tokenSign(testUser);
  
  testClient = new Client({
    userId: testUser._id,
    name: "Test Client for Project",
    cif: "T1234567",
    address: {
      street: "Project Street",
      number: 10,
      postal: 12345,
      city: "Project City",
      province: "Project Province"
    }
  });
  await testClient.save();
});

afterAll(async () => {
  await Project.deleteMany({});
  await Client.deleteMany({});
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe("Project API Endpoints", () => {
  test("POST /api/project - Crea un proyecto", async () => {
    const newProject = {
      name: "Test Project",
      clientId: testClient._id.toString(),
      description: "Test Project Description"
    };
    const res = await request(app)
      .post("/api/project")
      .set("Authorization", `Bearer ${token}`)
      .send(newProject);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.name).toBe(newProject.name);
    projectId = res.body._id;
  });

  test("GET /api/project - Lista proyectos", async () => {
    const res = await request(app)
      .get("/api/project")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/project/:id - Detalle de un proyecto", async () => {
    const res = await request(app)
      .get(`/api/project/${projectId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id", projectId);
  });

  test("PUT /api/project/:id - Actualiza un proyecto", async () => {
    const updateData = {
      name: "Updated Project Name",
      description: "Updated description"
    };
    const res = await request(app)
      .put(`/api/project/${projectId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updateData);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("name", updateData.name);
  });

  test("PATCH /api/project/archive/:id - Archiva un proyecto", async () => {
    const res = await request(app)
      .patch(`/api/project/archive/${projectId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Proyecto archivado correctamente");
  });

  test("PATCH /api/project/restore/:id - Restaura un proyecto archivado", async () => {
    const res = await request(app)
      .patch(`/api/project/restore/${projectId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Proyecto restaurado correctamente");
  });

  test("DELETE /api/project/:id - Elimina un proyecto", async () => {
    const res = await request(app)
      .delete(`/api/project/${projectId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Proyecto eliminado correctamente");
  });
});
