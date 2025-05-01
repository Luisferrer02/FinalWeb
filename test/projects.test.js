// tests/projects.test.js
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const Project = require("../models/nosql/projects");
const User = require("../models/nosql/users");
const Client = require("../models/nosql/clients");
const { tokenSign } = require("../utils/handleJwt");

let token, userId, clientId;
let projectId, archivedProjectId;
const otherUserId = new mongoose.Types.ObjectId();
const badId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  // Clean slate
  await Promise.all([
    User.deleteMany({}),
    Client.deleteMany({}),
    Project.deleteMany({}),
  ]);

  // Create a user + auth token
  const user = await User.create({
    name: "ProjUser",
    email: "proj@example.com",
    password: "xxx123!!",
    role: "user",
  });
  userId = user._id;
  token = tokenSign(user);

  // Create a client for that user
  const client = await Client.create({
    userId,
    name: "ClientA",
    cif: "A1",
    address: {
      street: "X",
      number: 1,
      postal: 11111,
      city: "City",
      province: "Prov",
    },
  });
  clientId = client._id;

  // Create one active and one archived project
  const active = await Project.create({
    userId,
    clientId,
    name: "ActiveProj",
    description: "Active desc",
    archived: false,
  });
  projectId = active._id.toString();

  const archived = await Project.create({
    userId,
    clientId,
    name: "ArchivedProj",
    description: "Archived desc",
    archived: true,
  });
  archivedProjectId = archived._id.toString();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("Projects controller", () => {
  describe("GET /api/projects", () => {
    test("200 – returns only non‑archived projects", async () => {
      const res = await request(app)
        .get("/api/projects")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((p) => p.archived === false)).toBe(true);
      expect(res.body.some((p) => p._id === projectId)).toBe(true);
    });

    test("500 – DB failure", async () => {
      jest.spyOn(Project, "find").mockRejectedValueOnce(new Error("fail"));
      const res = await request(app)
        .get("/api/projects")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      Project.find.mockRestore();
    });
  });
  describe("GET /api/projects/archive", () => {
    test("200 – returns only archived projects", async () => {
      const res = await request(app)
        .get("/api/projects/archive")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.every((p) => p.archived === true)).toBe(true);
      expect(res.body.some((p) => p._id === archivedProjectId)).toBe(true);
    });

    test("500 – DB failure", async () => {
      jest.spyOn(Project, "find").mockRejectedValueOnce(new Error("fail"));
      const res = await request(app)
        .get("/api/projects/archive")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      Project.find.mockRestore();
    });
  });
  describe("GET /api/projects/:id", () => {
    test("200 – valid id and ownership", async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(projectId);
    });

    test("404 – not found or wrong user", async () => {
      // Belongs to someone else
      const other = await Project.create({
        userId: otherUserId,
        clientId,
        name: "OtherUserProj",
        description: "",
        archived: false,
      });
      const r1 = await request(app)
        .get(`/api/projects/${other._id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r1.status).toBe(404);
      expect(r1.body).toEqual({ error: "Proyecto no encontrado" });

      // Nonexistent ID
      const r2 = await request(app)
        .get(`/api/projects/${badId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r2.status).toBe(404);
      expect(r2.body).toEqual({ error: "Proyecto no encontrado" });
    });

    test("500 – DB failure", async () => {
      jest.spyOn(Project, "findById").mockRejectedValueOnce(new Error("fail"));
      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      Project.findById.mockRestore();
    });
  });
  describe("POST /api/projects", () => {
    test("200 – creates a new project", async () => {
      const payload = { name: "NewProj", clientId, description: "new desc" };
      const res = await request(app)
        .post("/api/projects")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("_id");
      expect(res.body.name).toBe("NewProj");
    });

    test("500 – save error", async () => {
      jest
        .spyOn(Project.prototype, "save")
        .mockRejectedValueOnce(new Error("fail"));
      const res = await request(app)
        .post("/api/projects")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Bad", clientId, description: "" });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      Project.prototype.save.mockRestore();
    });
  });

  describe("PUT /api/projects/:id", () => {
    test("200 – updates project", async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "UpdatedName" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("UpdatedName");
    });

    test("404 – project not found", async () => {
      const res = await request(app)
        .put(`/api/projects/${badId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "X" });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Proyecto no encontrado" });
    });

    test("500 – DB failure", async () => {
      jest
        .spyOn(Project, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("fail"));
      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Err" });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      Project.findOneAndUpdate.mockRestore();
    });
  });
  describe("DELETE /api/projects/:id", () => {
    test("200 – hard deletes project", async () => {
      const tmp = await Project.create({
        userId,
        clientId,
        name: "TmpProj",
        archived: false,
      });
      const res = await request(app)
        .delete(`/api/projects/${tmp._id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Proyecto eliminado correctamente" });
    });

    test("404 – not found", async () => {
      const res = await request(app)
        .delete(`/api/projects/${badId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Proyecto no encontrado" });
    });

    test("500 – DB failure", async () => {
      jest
        .spyOn(Project, "findOneAndDelete")
        .mockRejectedValueOnce(new Error("fail"));
      const res = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      Project.findOneAndDelete.mockRestore();
    });
  });

  describe("PATCH /api/projects/archive/:id and /api/projects/restore/:id", () => {
    test("200 – archive and restore happy path", async () => {
      const r1 = await request(app)
        .patch(`/api/projects/archive/${projectId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r1.status).toBe(200);
      expect(r1.body).toEqual({ message: "Proyecto archivado correctamente" });

      const r2 = await request(app)
        .patch(`/api/projects/restore/${archivedProjectId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r2.status).toBe(200);
      expect(r2.body).toEqual({ message: "Proyecto restaurado correctamente" });
    });

    test("404 – archive/restore not found", async () => {
      const a1 = await request(app)
        .patch(`/api/projects/archive/${badId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(a1.status).toBe(404);
      expect(a1.body).toEqual({ error: "Proyecto no encontrado" });

      const r1 = await request(app)
        .patch(`/api/projects/restore/${badId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r1.status).toBe(404);
      expect(r1.body).toEqual({ error: "Proyecto no encontrado" });
    });

    test("500 – archive/restore DB failure", async () => {
      jest
        .spyOn(Project, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("fail"));
      const a2 = await request(app)
        .patch(`/api/projects/archive/${projectId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(a2.status).toBe(500);
      expect(a2.body).toEqual({ error: "Error interno en el servidor" });
      Project.findOneAndUpdate.mockRestore();

      jest
        .spyOn(Project, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("fail"));
      const r2 = await request(app)
        .patch(`/api/projects/restore/${archivedProjectId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r2.status).toBe(500);
      expect(r2.body).toEqual({ error: "Error interno en el servidor" });
      Project.findOneAndUpdate.mockRestore();
    });
  });
});
