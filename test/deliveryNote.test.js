jest.mock('../utils/handleUploadIPFS', () => ({
  uploadToPinata: jest.fn().mockResolvedValue({ IpfsHash: 'QmFakeHash' })
}));

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
const PDFDocument = require('pdfkit');


describe("DeliveryNote API", () => {
  // ==================== Basic CRUD Operations ====================
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

  // ==================== PDF Generation and Signing ====================
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

  // ==================== Error Handling ====================
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

      jest.spyOn(uploadModule, "uploadToPinata").mockResolvedValue({
        IpfsHash: "fake-signature-hash",
      });
      const updateSpy = jest
        .spyOn(DeliveryNote, "findOneAndUpdate")
        .mockImplementationOnce(() => {
          throw new Error("DB fail");
        });

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

      expect(res.statusCode).toBe(404);
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

    test("PUT /api/deliverynote/:id - Updates an unsigned delivery note", async () => {
      const noteId = await createTestDeliveryNote();

      const updateData = {
        items: [
          { type: "hour", description: "Horas modificadas", quantity: 3 },
          { type: "material", description: "Nuevo material", quantity: 20 },
        ],
      };

      const res = await request(app)
        .put(`/api/deliverynote/${noteId}`)
        .set("Authorization", `Bearer ${token}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("note._id", noteId);
      expect(res.body.note.items.length).toBe(2);
      expect(res.body.note.items[0].description).toBe("Horas modificadas");
    });

    test("PUT /api/deliverynote/:id - Cannot update signed delivery note", async () => {
      const noteId = await createTestDeliveryNote();

      const imagePath = path.join(__dirname, "firma.png");
      jest
        .spyOn(uploadModule, "uploadToPinata")
        .mockResolvedValue({ IpfsHash: "signedhash" });

      await request(app)
        .post(`/api/deliverynote/sign/${noteId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", imagePath);

      const res = await request(app)
        .put(`/api/deliverynote/${noteId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          items: [
            { type: "hour", description: "Cambios no permitidos", quantity: 1 },
          ],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: "DELIVERYNOTE_ALREADY_SIGNED" });
    });

    test("PUT /api/deliverynote/:id - Returns 404 if delivery note does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/deliverynote/${fakeId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          items: [{ type: "hour", description: "Cambio", quantity: 1 }],
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "DELIVERYNOTE_NOT_FOUND" });
    });
  });

  // ==================== DeliveryNote sign error branch ====================
  describe("DeliveryNote sign error branch", () => {
    test("POST /api/deliverynote/sign/:id - Returns 404 for non-existent note", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const imagePath = path.join(__dirname, "firma.png");

      jest.spyOn(uploadModule, "uploadToPinata").mockResolvedValueOnce({
        IpfsHash: "hash404",
      });

      const res = await request(app)
        .post(`/api/deliverynote/sign/${nonExistentId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", imagePath);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("error", "DELIVERYNOTE_NOT_FOUND");
    });
  });

  // =====================================================================
  // Cobertura extra – nota inexistente en GET /deliverynote/:id (404)
  // =====================================================================
  describe("DeliveryNote – GET /api/deliverynote/:id 404", () => {
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

describe("deliveryNote controller – ramas de error", () => {
  let generateDeliveryNotePdf, updateDeliveryNote, httpMocks, DeliveryNoteModel, PDFDocument;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("pdfkit", () =>
      jest.fn().mockImplementation(() => ({
        on:   (evt, cb) => { if (evt === "error") cb(new Error("PDF fail")); },
        pipe: () => {},
        end:  () => {}
      }))
    );
    httpMocks         = require("node-mocks-http");
    DeliveryNoteModel = require("../models/nosql/deliveryNote");
    ({ generateDeliveryNotePdf, updateDeliveryNote } =
      require("../controllers/deliveryNote"));
    PDFDocument       = require("pdfkit");
  });

  afterAll(() => {
    jest.dontMock("pdfkit");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("generateDeliveryNotePdf → PDF stream error dispara ERROR_GENERATE_PDF", async () => {
    jest.spyOn(DeliveryNoteModel, "findById").mockResolvedValue({
      _id: "1",
      createdAt: new Date(),
      userId: { name: "X", email: "x@x" },
      clientId: { name: "C", cif: "CIF", address: {}, logo: "" },
      projectId: { name: "P", description: "" },
      items: [],
      isSigned: false,
    });

    const req = httpMocks.createRequest({ params: { id: "1" } });
    const res = httpMocks.createResponse();
    await generateDeliveryNotePdf(req, res);

    expect(res.statusCode).toBe(500);
    expect(res._getData()).toEqual(JSON.stringify({ error: "ERROR_GENERATE_PDF" }));
  });

  test("updateDeliveryNote → excepción en findOneAndUpdate devuelve ERROR_UPDATE_DELIVERYNOTE", async () => {
    jest.spyOn(DeliveryNoteModel, "findById").mockResolvedValue({ isSigned: false });
    jest.spyOn(DeliveryNoteModel, "findOneAndUpdate").mockRejectedValue(new Error("DB fail"));

    const req = httpMocks.createRequest({ params: { id: "any" }, user: { _id: "u1" }, body: {} });
    const res = httpMocks.createResponse();
    await updateDeliveryNote(req, res);

    expect(res.statusCode).toBe(500);
    expect(res._getData()).toEqual(JSON.stringify({ error: "ERROR_UPDATE_DELIVERYNOTE" }));
  });

  test("generateDeliveryNotePdf → res.on(\"error\") maneja errores en la respuesta HTTP", async () => {
    jest.spyOn(DeliveryNoteModel, "findById").mockResolvedValue({
      _id: "1",
      createdAt: new Date(),
      userId: { name: "X", email: "x@x" },
      clientId: { name: "C", cif: "CIF", address: {}, logo: "" },
      projectId: { name: "P", description: "" },
      items: [],
      isSigned: false,
    });

    const mockDestroy = jest.fn();
    const mockPipe    = jest.fn().mockReturnThis();
    const mockOn      = jest.fn().mockImplementation((event, cb) => ({}));
    const mockEnd     = jest.fn();

    PDFDocument.mockImplementation(() => ({
      destroy: mockDestroy,
      pipe:    mockPipe,
      on:      mockOn,
      end:     mockEnd
    }));

    const req = httpMocks.createRequest({ params: { id: "1" } });
    const res = httpMocks.createResponse({
      eventEmitter: require("events").EventEmitter
    });

    const onSpy = jest.spyOn(res, "on");
    await generateDeliveryNotePdf(req, res);

    const errorHandlers = onSpy.mock.calls.filter(call => call[0] === "error");
    expect(errorHandlers.length).toBeGreaterThan(0);

    const errorHandler = errorHandlers[0][1];
    errorHandler(new Error("Response stream error"));

    expect(mockDestroy).toHaveBeenCalled();
  });

  test("generateDeliveryNotePdf → doc.on(\"error\") con headersSent=true llama a res.destroy", async () => {
    jest.spyOn(DeliveryNoteModel, "findById").mockResolvedValue({
      _id: "1",
      createdAt: new Date(),
      userId: { name: "X", email: "x@x" },
      clientId: { name: "C", cif: "CIF", address: {}, logo: "" },
      projectId: { name: "P", description: "" },
      items: [],
      isSigned: false,
    });

    const req = httpMocks.createRequest({ params: { id: "1" } });
    const res = httpMocks.createResponse();
    const mockResDestroy = jest.fn();
    res.destroy = mockResDestroy;
    Object.defineProperty(res, "headersSent", { value: true });

    let errorCallback;
    const mockDocDestroy = jest.fn();

    PDFDocument.mockImplementation(() => ({
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === "error") errorCallback = callback;
        return {};
      }),
      pipe:    jest.fn().mockReturnThis(),
      end:     jest.fn(),
      destroy: mockDocDestroy
    }));

    await generateDeliveryNotePdf(req, res);
    expect(errorCallback).toBeDefined();
    errorCallback(new Error("PDF stream error with headers sent"));

    expect(mockResDestroy).toHaveBeenCalled();
  });

  test("generateDeliveryNotePdf → doc.on(\"error\") con headersSent=false devuelve error HTTP", async () => {
    jest.spyOn(DeliveryNoteModel, "findById").mockResolvedValue({
      _id: "1",
      createdAt: new Date(),
      userId: { name: "X", email: "x@x" },
      clientId: { name: "C", cif: "CIF", address: {}, logo: "" },
      projectId: { name: "P", description: "" },
      items: [],
      isSigned: false,
    });

    // mock handleHttpError
    jest.mock("../utils/handleError", () => ({
      handleHttpError: jest.fn().mockImplementation((res, msg, code) => {
        res.status(code).json({ error: msg });
        return true;
      })
    }));
    const { handleHttpError } = require("../utils/handleError");

    const req = httpMocks.createRequest({ params: { id: "1" } });
    const res = httpMocks.createResponse();
    Object.defineProperty(res, "headersSent", { value: false });

    let errorCallback;
    PDFDocument.mockImplementation(() => ({
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === "error") errorCallback = callback;
        return {};
      }),
      pipe:    jest.fn().mockReturnThis(),
      end:     jest.fn(),
      destroy: jest.fn()
    }));

    await generateDeliveryNotePdf(req, res);
    expect(errorCallback).toBeDefined();
    errorCallback(new Error("PDF stream error without headers sent"));

    expect(handleHttpError).toHaveBeenCalledWith(res, "ERROR_GENERATE_PDF", 500);
  });
});
