const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const path = require("path");

// Models
const DeliveryNote = require("../models/nosql/deliveryNote");
const User = require("../models/nosql/users");
const Client = require("../models/nosql/clients");
const Project = require("../models/nosql/projects");
const uploadModule = require("../utils/handleUploadIPFS");

// Utils
const { tokenSign } = require("../utils/handleJwt");

// Test variables
let token;
let testUser, testClient, testProject;
let deliveryNoteId;

// Setup and teardown
beforeAll(async () => {
  await DeliveryNote.deleteMany({});
  await Project.deleteMany({});
  await Client.deleteMany({});
  await User.deleteMany({});

  testUser = new User({
    name: "Delivery Test User",
    email: "deliveryuser@example.com",
    password: "password123",
    role: "user",
  });
  await testUser.save();
  token = tokenSign(testUser);

  testClient = new Client({
    userId: testUser._id,
    name: "Delivery Test Client",
    cif: "D1234567",
    address: {
      street: "Delivery Street",
      number: 20,
      postal: 54321,
      city: "Delivery City",
      province: "Delivery Province",
    },
  });
  await testClient.save();

  testProject = new Project({
    userId: testUser._id,
    clientId: testClient._id,
    name: "Delivery Test Project",
    description: "Project for delivery note testing",
  });
  await testProject.save();
});

afterAll(async () => {
  try {
    await DeliveryNote.deleteMany({});
    await Project.deleteMany({});
    await Client.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error en afterAll (deliveryNote.test.js):", error.message);
  }
});

// Helper function to create a test delivery note
async function createTestDeliveryNote() {
  const deliveryData = {
    clientId: testClient._id.toString(),
    projectId: testProject._id.toString(),
    items: [
      { type: "hour", description: "Trabajo en proyecto", quantity: 5 },
      { type: "material", description: "Material de oficina", quantity: 10 },
    ],
  };

  const res = await request(app)
    .post("/api/deliverynote")
    .set("Authorization", `Bearer ${token}`)
    .send(deliveryData);

  return res.body._id;
}

describe("DeliveryNote API", () => {
  describe("Basic CRUD Operations", () => {
    test("POST /api/deliverynote - Creates a delivery note", async () => {
      const deliveryData = {
        clientId: testClient._id.toString(),
        projectId: testProject._id.toString(),
        items: [
          { type: "hour", description: "Trabajo en proyecto", quantity: 5 },
          {
            type: "material",
            description: "Material de oficina",
            quantity: 10,
          },
        ],
      };

      const res = await request(app)
        .post("/api/deliverynote")
        .set("Authorization", `Bearer ${token}`)
        .send(deliveryData);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("_id");
      expect(Array.isArray(res.body.items)).toBe(true);
      deliveryNoteId = res.body._id;
    });

    test("GET /api/deliverynote - Lists all delivery notes", async () => {
      const res = await request(app)
        .get("/api/deliverynote")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test("GET /api/deliverynote/:id - Gets details of a delivery note (with populate)", async () => {
      const res = await request(app)
        .get(`/api/deliverynote/${deliveryNoteId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("_id", deliveryNoteId);
      expect(res.body).toHaveProperty("userId");
      expect(res.body).toHaveProperty("clientId");
      expect(res.body).toHaveProperty("projectId");
    });
  });

  describe("PDF Generation and Signing", () => {
    test("GET /api/deliverynote/pdf/:id - Generates and downloads PDF", async () => {
      const res = await request(app)
        .get(`/api/deliverynote/pdf/${deliveryNoteId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
    });

    test("POST /api/deliverynote/sign/:id - Signs the delivery note", async () => {
      const imagePath = path.join(__dirname, "firma.png");
      const res = await request(app)
        .post(`/api/deliverynote/sign/${deliveryNoteId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", imagePath);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty(
        "message",
        "Albarán firmado correctamente"
      );
      expect(res.body.note).toHaveProperty("isSigned", true);
      expect(res.body.note).toHaveProperty("signatureUrl");
    });

    test("GET /api/deliverynote/:id - Returns 404 for non-existent note", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/deliverynote/${fakeId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "DELIVERYNOTE_NOT_FOUND" });
    });

    test("PDF generation includes signature when available", async () => {
      const noteId = await createTestDeliveryNote();
      const imagePath = path.join(__dirname, "firma.png");
      await request(app)
        .post(`/api/deliverynote/sign/${noteId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", imagePath);

      const pdfRes = await request(app)
        .get(`/api/deliverynote/pdf/${noteId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(pdfRes.statusCode).toEqual(200);
      expect(pdfRes.headers["content-type"]).toContain("application/pdf");
    });
  });

  describe("Error Handling", () => {
    test("GET /api/deliverynote/pdf/:id - Handles errors during PDF generation", async () => {
      const noteId = await createTestDeliveryNote();
      const findSpy = jest.spyOn(DeliveryNote, "findById").mockReturnValueOnce({
        populate: () => ({
          populate: () => ({
            populate: () => Promise.reject(new Error("DB fail")),
          }),
        }),
      });
      

      const res = await request(app)
        .get(`/api/deliverynote/pdf/${noteId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "ERROR_GENERATE_PDF");

      findSpy.mockRestore();
    });

    test("POST /api/deliverynote - Handles database errors on create", async () => {
      const saveSpy = jest
        .spyOn(DeliveryNote.prototype, "save")
        .mockImplementationOnce(() => {
          throw new Error("Database error");
        });

      const deliveryData = {
        clientId: testClient._id.toString(),
        projectId: testProject._id.toString(),
        items: [{ type: "hour", description: "Test work", quantity: 5 }],
      };

      const res = await request(app)
        .post("/api/deliverynote")
        .set("Authorization", `Bearer ${token}`)
        .send(deliveryData);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "ERROR_CREATE_DELIVERYNOTE");

      saveSpy.mockRestore();
    });

    test("GET /api/deliverynote/:id - Handles errors fetching a delivery note", async () => {
      const noteId = await createTestDeliveryNote();
      const findSpy = jest.spyOn(DeliveryNote, "findById").mockReturnValueOnce({
        populate: () => ({
          populate: () => ({
            populate: () => Promise.reject(new Error("DB fail")),
          }),
        }),
      });
      

      const res = await request(app)
        .get(`/api/deliverynote/${noteId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "ERROR_GET_DELIVERYNOTE");

      findSpy.mockRestore();
    });

    test("POST /api/deliverynote/sign/:id - Handles errors signing delivery note", async () => {
      const noteId = await createTestDeliveryNote();
      const updateSpy = jest
        .spyOn(DeliveryNote, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("DB fail"));

      const imagePath = path.join(__dirname, "firma.png");
      const res = await request(app)
        .post(`/api/deliverynote/sign/${noteId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", imagePath);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "ERROR_SIGN_DELIVERYNOTE");

      updateSpy.mockRestore();
    });

    test("GET /api/deliverynote/pdf/:id - Returns 404 for non-existent note", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/deliverynote/pdf/${nonExistentId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "DELIVERYNOTE_NOT_FOUND");
    });

    test("POST /api/deliverynote - Returns 500 for invalid data", async () => {
      const invalidData = {};
      const res = await request(app)
        .post("/api/deliverynote")
        .set("Authorization", `Bearer ${token}`)
        .send(invalidData);

      expect(res.statusCode).toEqual(422);
      expect(res.body).toHaveProperty("errors");
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    test("POST /api/deliverynote/sign/:id - Returns 400 when no file uploaded", async () => {
      const res = await request(app)
        .post(`/api/deliverynote/sign/${deliveryNoteId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error", "NO_FILE_UPLOADED");
    });

    test("POST /api/deliverynote/sign/:id - Returns 404 for non-existent note", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const imagePath = path.join(__dirname, "firma.png");
      const res = await request(app)
        .post(`/api/deliverynote/sign/${nonExistentId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", imagePath);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "DELIVERYNOTE_NOT_FOUND");
    });

    test("GET /api/deliverynote - Handles database errors", async () => {
      const findSpy = jest
        .spyOn(DeliveryNote, "find")
        .mockImplementationOnce(() => {
          throw new Error("Database error");
        });

      const res = await request(app)
        .get("/api/deliverynote")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "ERROR_GET_DELIVERYNOTES");

      findSpy.mockRestore();
    });
  });

  describe("DeliveryNote sign error branch", () => {
    test("POST /api/deliverynote/sign/:id - Returns 404 for non-existent note", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const imagePath = path.join(__dirname, "firma.png");

      // <-- Añade este mock para que uploadToPinata resuelva correctamente:
      jest.spyOn(uploadModule, "uploadToPinata").mockResolvedValueOnce({
        IpfsHash: "hash404",
      });

      const res = await request(app)
        .post(`/api/deliverynote/sign/${nonExistentId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", imagePath);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "DELIVERYNOTE_NOT_FOUND");
    });
  });

  /* ===================================================================== */
  /*  Cobertura extra – nota inexistente en GET /deliverynote/:id (404)    */
  /* ===================================================================== */
  describe("DeliveryNote – GET /api/deliverynote/:id 404", () => {
    test("retorna 404 cuando la nota no existe", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/deliverynote/${fakeId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "DELIVERYNOTE_NOT_FOUND" });
    });
  });
});
