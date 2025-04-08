const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const morganBody = require("morgan-body");
const loggerStream = require("./utils/handleLogger");
const dbConnect = require("./config/mongo");

const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./docs/swagger");

// Conecta a la base de datos
dbConnect();

const app = express();

// Middlewares generales
app.use(cors());
app.use(express.json());
app.use(express.static("storage"));

// Logging: Se configura antes de las rutas para capturar toda la actividad
morganBody(app, {
  noColors: true,
  skip: (req, res) => res.statusCode < 400,
  stream: loggerStream,
});

// Rutas principales
app.use("/api", require("./routes"));

// Documentación Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Middleware para rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});

// Middleware global de errores
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  res.status(err.status || 500).json({ error: err.message || "Error Interno del Servidor" });
});

// Inicializa el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;
