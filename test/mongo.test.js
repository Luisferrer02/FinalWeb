jest.mock("mongoose", () => ({
    connect: jest.fn(() => {
      throw new Error("Error forzado en conexión"); // Simula un fallo de conexión
    }),
  }));
  
  const dbConnect = require("../config/mongo");
  
  describe("dbConnect", () => {
    afterEach(() => {
      jest.resetModules(); // Limpia el cache del require para volver a mockear
      jest.clearAllMocks();
    });
  
    test("Muestra error y termina el proceso si falla la conexión", async () => {
      jest.mock("mongoose", () => ({
        connect: jest.fn(() => {
          throw new Error("Fallo forzado");
        }),
      }));
  
      const spyExit = jest.spyOn(process, "exit").mockImplementation(() => {});
      const spyError = jest.spyOn(console, "error").mockImplementation(() => {});
  
      const dbConnect = require("../config/mongo");
      await dbConnect();
  
      expect(spyError).toHaveBeenCalledWith("Error conectando a la BD:", expect.any(Error));
      expect(spyExit).toHaveBeenCalledWith(1);
    });
  
    test("Muestra mensaje de éxito si la conexión funciona", async () => {
      const mockUri = "mongodb://mocktest";
      process.env.DB_URI = mockUri;
      process.env.NODE_ENV = "production";
  
      jest.mock("mongoose", () => ({
        connect: jest.fn(() => Promise.resolve()),
      }));
  
      const spyLog = jest.spyOn(console, "log").mockImplementation(() => {});
  
      const dbConnect = require("../config/mongo");
      await dbConnect();
  
      expect(spyLog).toHaveBeenCalledWith("Conectado a la BD:", mockUri);
    });
  });
    