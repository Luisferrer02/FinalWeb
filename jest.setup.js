// jest.setup.js

jest.mock("./utils/handleLogger", () => ({
    write: jest.fn(),
  }));
  
  // Redefinir todos los logs a nivel global
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  
  // Por si algún test individual reinicia los mocks
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // Intento de cierre de conexiones (Mongoose)
  afterAll(async () => {
    try {
      const mongoose = require("mongoose");
      if (mongoose?.connection?.readyState === 1) {
        await mongoose.disconnect();
      }
    } catch (e) {
      // ignora si mongoose no está presente
    }
  
    // Esperar a que termine cualquier handle abierto
    await new Promise((res) => setTimeout(res, 200));
  });
  