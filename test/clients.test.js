// tests/clients.test.js
const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const Client = require("../models/nosql/clients");
const User = require("../models/nosql/users");
const { tokenSign } = require("../utils/handleJwt");
const fs = require("fs");
const path = require("path");
const { uploadToPinata } = require("../utils/handleUploadIPFS");
const httpMocks = require('node-mocks-http')
const { updateLogoClient } = require('../controllers/clients')

// Mock the uploadToPinata function globally
jest.mock("../utils/handleUploadIPFS", () => ({
  uploadToPinata: jest.fn().mockResolvedValue({
    IpfsHash: "test123hash456",
  }),
}));

let token;
let testUser;
let clientId;
let archivedClientId;
const TEST_IMAGE_PATH = path.join(__dirname, "testLogo.png");

// Setup before all tests
beforeAll(async () => {
  // Create test user
  testUser = new User({
    name: "Test User",
    email: "testuser@example.com",
    password: "password123",
    role: "user",
  });
  await testUser.save();
  token = await tokenSign(testUser);

  // Create archived client
  const archivedClient = new Client({
    userId: testUser._id,
    name: "Archived Client",
    cif: "A1234567",
    address: {
      street: "Archived Street",
      number: 10,
      postal: 12345,
      city: "Archived City",
      province: "Archived Province",
    },
    archived: true,
  });
  await archivedClient.save();
  archivedClientId = archivedClient._id;

  // Create active client
  const newClient = new Client({
    userId: testUser._id,
    name: "Test Client",
    cif: "T1234567",
    address: {
      street: "Test Street",
      number: 10,
      postal: 12345,
      city: "Test City",
      province: "Test Province",
    },
  });
  const savedClient = await newClient.save();
  clientId = savedClient._id;

  // Create dummy test image file if it doesn't exist
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    fs.writeFileSync(TEST_IMAGE_PATH, Buffer.from("fake image data"));
  }

  // Set environment variable needed for IPFS
  process.env.PINATA_GATEWAY_URL = "test-gateway.pinata.cloud";
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await Client.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error en afterAll:", error.message);
  }

  // Clean up test files
  if (fs.existsSync(TEST_IMAGE_PATH)) {
    fs.unlinkSync(TEST_IMAGE_PATH);
  }

  // Reset mocks
  jest.resetAllMocks();
});

describe("Clients API", () => {
  // ==================== GET Endpoints Tests ====================
  describe("GET Endpoints", () => {
    test("GET /api/clients - Returns all clients successfully", async () => {
      const res = await request(app)
        .get("/api/clients")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body.clients)).toBe(true);
      expect(res.body.clients.length).toBeGreaterThanOrEqual(1);
    });

    test("GET /api/clients - Handles database errors", async () => {
      jest
        .spyOn(Client, "find")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .get("/api/clients")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Error al obtener clientes");

      // Restore the original implementation
      jest.restoreAllMocks();
    });

    test("GET /api/clients/archive - Returns archived clients successfully", async () => {
      const res = await request(app)
        .get("/api/clients/archive")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty("_id", String(archivedClientId));
    });

    test("GET /api/clients/archive - Handles database errors", async () => {
      jest
        .spyOn(Client, "find")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .get("/api/clients/archive")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Error interno en el servidor");

      // Restore the original implementation
      jest.restoreAllMocks();
    });

    test("GET /api/clients/:id - Returns specific client successfully", async () => {
      const res = await request(app)
        .get(`/api/clients/${clientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("_id", String(clientId));
      expect(res.body.name).toBe("Test Client");
    });

    test("GET /api/clients/:id - Returns 404 for non-existent client", async () => {
      const fakeClientId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/clients/${fakeClientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "Cliente no encontrado");
    });

    test("GET /api/clients/:id - Returns 404 when client belongs to different user", async () => {
      // Create another user and client
      const otherUser = new User({
        name: "Other User",
        email: "otheruser@example.com",
        password: "password123",
        role: "user",
      });
      await otherUser.save();

      const otherClient = new Client({
        userId: otherUser._id,
        name: "Other Client",
        cif: "O1234567",
        address: {
          street: "Other Street",
          number: 10,
          postal: 12345,
          city: "Other City",
          province: "Other Province",
        },
      });
      const savedOtherClient = await otherClient.save();

      // Try to access with first user's token
      const res = await request(app)
        .get(`/api/clients/${savedOtherClient._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "Cliente no encontrado");
    });

    test("GET /api/clients/:id - Handles database errors", async () => {
      jest
        .spyOn(Client, "findById")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .get(`/api/clients/${clientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Error interno en el servidor");

      // Restore the original implementation
      jest.restoreAllMocks();
    });
  });

  // ==================== POST Endpoints Tests ====================
  describe("POST Endpoints", () => {
    test("POST /api/clients - Creates a client successfully", async () => {
      const newClient = {
        name: "New Test Client",
        cif: "N1234567",
        address: {
          street: "New Street",
          number: 10,
          postal: 12345,
          city: "New City",
          province: "New Province",
        },
      };

      const res = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${token}`)
        .send(newClient);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("clientSaved");
      expect(res.body.clientSaved).toHaveProperty("_id");
      expect(res.body.clientSaved.name).toBe(newClient.name);
    });

    test("POST /api/clients - Handles database errors", async () => {
      jest
        .spyOn(Client.prototype, "save")
        .mockRejectedValueOnce(new Error("Error al guardar cliente"));

      const newClient = {
        name: "Error Client",
        cif: "E1234567",
        address: {
          street: "Error Street",
          number: 10,
          postal: 12345,
          city: "Error City",
          province: "Error Province",
        },
      };

      const res = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${token}`)
        .send(newClient);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Error al crear cliente");

      // Restore the original implementation
      jest.restoreAllMocks();
    });
  });

  // ==================== PUT Endpoints Tests ====================
  describe("PUT Endpoints", () => {
    test("PUT /api/clients/:id - Updates a client successfully", async () => {
      const updateData = {
        name: "Updated Client",
        cif: "U1234567",
        address: {
          street: "Updated Street",
          number: 20,
          postal: 54321,
          city: "Updated City",
          province: "Updated Province",
        },
      };

      const res = await request(app)
        .put(`/api/clients/${clientId}`)
        .set("Authorization", `Bearer ${token}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("name", updateData.name);
      expect(res.body).toHaveProperty("cif", updateData.cif);
      expect(res.body.address.street).toBe(updateData.address.street);
    });

    test("PUT /api/clients/:id - Returns 404 for non-existent client", async () => {
      const fakeClientId = new mongoose.Types.ObjectId();
      const updateData = {
        name: "Updated Client",
        cif: "U1234567",
      };

      const res = await request(app)
        .put(`/api/clients/${fakeClientId}`)
        .set("Authorization", `Bearer ${token}`)
        .send(updateData);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "Cliente no encontrado");
    });

    test("PUT /api/clients/:id - Handles database errors", async () => {
      jest
        .spyOn(Client, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("Database error"));

      const updateData = {
        name: "Error Client",
        cif: "E1234567",
      };

      const res = await request(app)
        .put(`/api/clients/${clientId}`)
        .set("Authorization", `Bearer ${token}`)
        .send(updateData);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Error interno en el servidor");

      // Restore the original implementation
      jest.restoreAllMocks();
    });
  });

  // ==================== DELETE Endpoints Tests ====================
  describe("DELETE Endpoints", () => {
    test("DELETE /api/clients/:id - Deletes a client successfully", async () => {
      // Create a test client to delete
      const clientToDelete = new Client({
        userId: testUser._id,
        name: "Client to Delete",
        cif: "D1234567",
        address: {
          street: "Delete Street",
          number: 10,
          postal: 12345,
          city: "Delete City",
          province: "Delete Province",
        },
      });
      const savedClient = await clientToDelete.save();

      const res = await request(app)
        .delete(`/api/clients/${savedClient._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty(
        "message",
        "Cliente eliminado correctamente"
      );

      // Verify client was deleted
      const deletedClient = await Client.findById(savedClient._id);
      expect(deletedClient).toBeNull();
    });

    test("DELETE /api/clients/:id - Returns 404 for non-existent client", async () => {
      const fakeClientId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/clients/${fakeClientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "Cliente no encontrado");
    });

    test("DELETE /api/clients/:id - Handles database errors", async () => {
      jest
        .spyOn(Client, "findOneAndDelete")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .delete(`/api/clients/${clientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Error interno en el servidor");

      // Restore the original implementation
      jest.restoreAllMocks();
    });
  });

  // ==================== Archive/Restore Endpoints Tests ====================
  describe("Archive/Restore Endpoints", () => {
    test("DELETE /api/clients/archive/:id - Archives a client successfully", async () => {
      // Create a test client to archive
      const clientToArchive = new Client({
        userId: testUser._id,
        name: "Client to Archive",
        cif: "A1234567",
        address: {
          street: "Archive Street",
          number: 10,
          postal: 12345,
          city: "Archive City",
          province: "Archive Province",
        },
      });
      const savedClient = await clientToArchive.save();

      const res = await request(app)
        .delete(`/api/clients/archive/${savedClient._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty(
        "message",
        "Cliente archivado correctamente"
      );

      // Verify client was archived
      const archivedClient = await Client.findById(savedClient._id);
      expect(archivedClient.archived).toBe(true);
    });

    test("DELETE /api/clients/archive/:id - Returns 404 for non-existent client", async () => {
      const fakeClientId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/clients/archive/${fakeClientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "Cliente no encontrado");
    });

    test("DELETE /api/clients/archive/:id - Handles database errors", async () => {
      jest
        .spyOn(Client, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .delete(`/api/clients/archive/${clientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Error interno en el servidor");

      // Restore the original implementation
      jest.restoreAllMocks();
    });

    test("PATCH /api/clients/restore/:id - Restores a client successfully", async () => {
      // Create a test archived client to restore
      const clientToRestore = new Client({
        userId: testUser._id,
        name: "Client to Restore",
        cif: "R1234567",
        address: {
          street: "Restore Street",
          number: 10,
          postal: 12345,
          city: "Restore City",
          province: "Restore Province",
        },
        archived: true,
      });
      const savedClient = await clientToRestore.save();

      const res = await request(app)
        .patch(`/api/clients/restore/${savedClient._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty(
        "message",
        "Cliente restaurado correctamente"
      );

      // Verify client was restored
      const restoredClient = await Client.findById(savedClient._id);
      expect(restoredClient.archived).toBe(false);
    });

    test("PATCH /api/clients/restore/:id - Handles database errors", async () => {
      jest
        .spyOn(Client, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .patch(`/api/clients/restore/${clientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty("error", "Error interno en el servidor");

      // Restore the original implementation
      jest.restoreAllMocks();
    });
  });

  // ==================== Logo Upload Tests ====================
  // Logo Upload Endpoints
  describe("Logo Upload Endpoints", () => {
    beforeEach(() => {
      // Reset mock behavior before each test
      uploadToPinata.mockClear();
      uploadToPinata.mockResolvedValue({ IpfsHash: "test123hash456" });
    });

    test("PATCH /api/clients/logo/:id - Updates logo successfully", async () => {
      const res = await request(app)
        .patch(`/api/clients/logo/${clientId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", TEST_IMAGE_PATH);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Logo actualizado correctamente"
      );
      expect(res.body).toHaveProperty("client");
      expect(res.body.client).toHaveProperty("logo");
      expect(res.body.client.logo).toContain("test123hash456");
      expect(uploadToPinata).toHaveBeenCalled();
    });

    test("PATCH /api/clients/logo/:id - Returns 400 when no file is uploaded", async () => {
      const res = await request(app)
        .patch(`/api/clients/logo/${clientId}`)
        .set("Authorization", `Bearer ${token}`); // no .attach()

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty(
        "error",
        "No se ha subido ningún archivo"
      );
    });

    test("PATCH /api/clients/logo/:id - Returns 404 for non-existent client", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/clients/logo/${fakeId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", TEST_IMAGE_PATH);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("error", "Cliente no encontrado");
    });

    test("PATCH /api/clients/logo/:id - Handles IPFS upload errors", async () => {
      // Force uploadToPinata to reject
      uploadToPinata.mockRejectedValueOnce(new Error("IPFS upload failed"));

      const res = await request(app)
        .patch(`/api/clients/logo/${clientId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", TEST_IMAGE_PATH);

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty("error", "Error interno en el servidor");
    });

    test("PATCH /api/clients/logo/:id - Handles database errors", async () => {
      // Ensure IPFS upload succeeds
      uploadToPinata.mockResolvedValueOnce({ IpfsHash: "test123hash456" });
      // Then force the Mongo update to fail
      const spy = jest
        .spyOn(Client, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .patch(`/api/clients/logo/${clientId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", TEST_IMAGE_PATH);

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty("error", "Error interno en el servidor");

      spy.mockRestore();
    });
  });

  describe("Clients controllers error branches", () => {
    beforeEach(() => {
      // Asegúrate de que el user ya esté logueado y haya un req.user._id válido.
    });

    test("GET /api/clients → catch de getClients", async () => {
      jest.spyOn(Client, "find").mockRejectedValueOnce(new Error("DB Fail"));
      const res = await request(app)
        .get("/api/clients")
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Error al obtener clientes" });
      jest.restoreAllMocks();
    });

    test("POST /api/clients → catch de addClient", async () => {
      jest
        .spyOn(Client.prototype, "save")
        .mockRejectedValueOnce(new Error("Save Fail"));
      const payload = {
        name: "X",
        cif: "C",
        address: {
          street: "S",
          number: 1,
          postal: 1,
          city: "C",
          province: "P",
        },
      };
      const res = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Error al crear cliente" });
      jest.restoreAllMocks();
    });

    test("GET /api/clients/archive → catch de getArchivedClients", async () => {
      jest.spyOn(Client, "find").mockRejectedValueOnce(new Error("DB Fail"));
      const res = await request(app)
        .get("/api/clients/archive")
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      jest.restoreAllMocks();
    });

    test("GET /api/clients/:id → catch de getClient", async () => {
      jest
        .spyOn(Client, "findById")
        .mockRejectedValueOnce(new Error("DB Fail"));
      const res = await request(app)
        .get(`/api/clients/${clientId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      jest.restoreAllMocks();
    });

    test("PUT /api/clients/:id → catch de updateClient", async () => {
      jest
        .spyOn(Client, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("DB Fail"));
      const res = await request(app)
        .put(`/api/clients/${clientId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Z" });
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      jest.restoreAllMocks();
    });

    test("DELETE /api/clients/:id → catch de deleteClient", async () => {
      jest
        .spyOn(Client, "findOneAndDelete")
        .mockRejectedValueOnce(new Error("DB Fail"));
      const res = await request(app)
        .delete(`/api/clients/${clientId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      jest.restoreAllMocks();
    });

    test("DELETE /api/clients/archive/:id → catch de archiveClient", async () => {
      jest
        .spyOn(Client, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("DB Fail"));
      const res = await request(app)
        .delete(`/api/clients/archive/${clientId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      jest.restoreAllMocks();
    });

    test("PATCH /api/clients/restore/:id → catch de restoreClient", async () => {
      jest
        .spyOn(Client, "findOneAndUpdate")
        .mockRejectedValueOnce(new Error("DB Fail"));
      const res = await request(app)
        .patch(`/api/clients/restore/${clientId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Error interno en el servidor" });
      jest.restoreAllMocks();
    });
  });

  /* ===================================================================== */
  /*  Cobertura extra – clientes que pertenecen a OTRO usuario (404 paths) */
  /* ===================================================================== */
  describe("Clients – autorización / 404 por pertenencia a otro usuario", () => {
    let outsider, outsiderToken, outsiderClientId;

    beforeAll(async () => {
      // ➊ Usuario y cliente que NO pertenecen al usuario autenticado
      outsider = await User.create({
        name: "Outsider",
        email: "out@example.com",
        password: "pass",
        role: "user",
      });
      outsiderToken = tokenSign(outsider);

      const outsiderClient = await Client.create({
        userId: outsider._id,
        name: "Outsider Client",
        cif: "OUT1234",
        address: {
          street: "Out St",
          number: 1,
          postal: 11111,
          city: "OutCity",
          province: "OutProv",
        },
      });
      outsiderClientId = outsiderClient._id;
    });

    /* PUT ⇒ updateClient */
    test("PUT /api/clients/:id ⇒ 404 si el cliente es de otro user", async () => {
      const res = await request(app)
        .put(`/api/clients/${outsiderClientId}`)
        .set("Authorization", `Bearer ${token}`) // token del primer usuario
        .send({ name: "Hack" });

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "Cliente no encontrado" });
    });

    /* DELETE ⇒ deleteClient */
    test("DELETE /api/clients/:id ⇒ 404 si el cliente es de otro user", async () => {
      const res = await request(app)
        .delete(`/api/clients/${outsiderClientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "Cliente no encontrado" });
    });

    /* DELETE (archive) ⇒ archiveClient */
    test("DELETE /api/clients/archive/:id ⇒ 404 si el cliente es de otro user", async () => {
      const res = await request(app)
        .delete(`/api/clients/archive/${outsiderClientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "Cliente no encontrado" });
    });

    /* PATCH (restore) ⇒ restoreClient */
    test("PATCH /api/clients/restore/:id ⇒ 404 si el cliente es de otro user", async () => {
      const res = await request(app)
        .patch(`/api/clients/restore/${outsiderClientId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "Cliente no encontrado" });
    });
  });
});

describe('clients controller – updateLogoClient error branches', () => {
  let req, res

  beforeEach(() => {
    res = httpMocks.createResponse()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('returns 400 if no file uploaded', async () => {
    // req.user is present, but req.file is missing
    req = httpMocks.createRequest({
      params: { id: '507f1f77bcf86cd799439011' },
      user:   { _id: 'u1' },
    })

    await updateLogoClient(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({ error: 'No se ha subido ningún archivo' })
  })

  test('returns 401 if no user on req', async () => {
    // req.file is present, but req.user is missing
    req = httpMocks.createRequest({
      params: { id: '507f1f77bcf86cd799439011' },
      file:   { buffer: Buffer.from(''), originalname: 'logo.png' },
    })

    await updateLogoClient(req, res)

    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({ error: 'No autorizado' })
  })

  test('returns 404 if client not found by findOneAndUpdate', async () => {
    // happy path until findOneAndUpdate returns null
    req = httpMocks.createRequest({
      params: { id: '507f1f77bcf86cd799439011' },
      user:   { _id: 'u1' },
      file:   { buffer: Buffer.from(''), originalname: 'logo.png' },
    })
    jest.spyOn(Client, 'findOneAndUpdate').mockResolvedValue(null)

    await updateLogoClient(req, res)

    expect(res.statusCode).toBe(404)
    expect(res._getJSONData()).toEqual({ error: 'Cliente no encontrado' })
  })

  test('returns 404 on CastError (invalid id)', async () => {
    // simulate a Mongoose CastError in the catch block
    req = httpMocks.createRequest({
      params: { id: 'not-an-objectid' },
      user:   { _id: 'u1' },
      file:   { buffer: Buffer.from(''), originalname: 'logo.png' },
    })
    const castErr = new Error('Cast to ObjectId failed')
    castErr.name = 'CastError'
    jest.spyOn(Client, 'findOneAndUpdate').mockImplementation(() => { throw castErr })

    await updateLogoClient(req, res)

    expect(res.statusCode).toBe(404)
    expect(res._getJSONData()).toEqual({ error: 'Cliente no encontrado' })
  })
})
