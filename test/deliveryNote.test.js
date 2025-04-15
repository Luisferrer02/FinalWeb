// tests/deliveryNote.test.js
const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const DeliveryNote = require("../models/nosql/deliveryNote");
const User = require("../models/nosql/user");
const Client = require("../models/nosql/client");
const Project = require("../models/nosql/project");
const { tokenSign } = require("../utils/handleJwt");
const path = require("path");

let token;
let testUser, testClient, testProject;
let deliveryNoteId;

beforeAll(async () => {
  await DeliveryNote.deleteMany({});
  await Project.deleteMany({});
  await Client.deleteMany({});
  await User.deleteMany({});

  testUser = new User({
    name: "Delivery Test User",
    email: "deliveryuser@example.com",
    password: "password123",
    role: "user"
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
      province: "Delivery Province"
    }
  });
  await testClient.save();

  testProject = new Project({
    userId: testUser._id,
    clientId: testClient._id,
    name: "Delivery Test Project",
    description: "Project for delivery note testing"
  });
  await testProject.save();
});

afterAll(async () => {
  await DeliveryNote.deleteMany({});
  await Project.deleteMany({});
  await Client.deleteMany({});
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe("DeliveryNote API Endpoints", () => {
  test("POST /api/deliverynote - Crea un albarán", async () => {
    const deliveryData = {
      clientId: testClient._id.toString(),
      projectId: testProject._id.toString(),
      items: [
        {
          type: "hour",
          description: "Trabajo en proyecto",
          quantity: 5
        },
        {
          type: "material",
          description: "Material de oficina",
          quantity: 10
        }
      ]
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

  test("GET /api/deliverynote - Lista albaranes", async () => {
    const res = await request(app)
      .get("/api/deliverynote")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/deliverynote/:id - Detalle de un albarán (con populate)", async () => {
    const res = await request(app)
      .get(`/api/deliverynote/${deliveryNoteId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("_id", deliveryNoteId);
    expect(res.body).toHaveProperty("userId");
    expect(res.body).toHaveProperty("clientId");
    expect(res.body).toHaveProperty("projectId");
  });

  test("GET /api/deliverynote/pdf/:id - Genera y descarga PDF", async () => {
    const res = await request(app)
      .get(`/api/deliverynote/pdf/${deliveryNoteId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  test("POST /api/deliverynote/sign/:id - Firma el albarán", async () => {
    const imagePath = path.join(__dirname, "firma.png");
    const res = await request(app)
      .post(`/api/deliverynote/sign/${deliveryNoteId}`)
      .set("Authorization", `Bearer ${token}`)
      .attach("image", imagePath);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("message", "Albarán firmado correctamente");
    expect(res.body.note).toHaveProperty("isSigned", true);
    expect(res.body.note).toHaveProperty("signatureUrl");
  });
});
