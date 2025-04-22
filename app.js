// app.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const morganBody = require("morgan-body");
const checkRol = require("./middleware/rol");
const loggerStream = require("./utils/handleLogger");
const dbConnect = require("./config/mongo");

const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./docs/swagger");

const app = express();

// Conecta a la base de datos
dbConnect();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("storage"));

morganBody(app, {
  noColors: true,
  skip: (req, res) => res.statusCode < 400,
  stream: loggerStream,
});

// Rutas principales
app.use("/api", require("./routes"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ... rutas de testing
app.get("/api/error-forzado", (req, res, next) => {
  next(new Error("Error de prueba"));
});

app.get("/api/forbidden", (req, res, next) => {
  const err = new Error("Acceso denegado");
  err.status = 403;
  next(err);
});

app.get("/api/error-no-message", (req, res, next) => {
  throw new Error();
});

app.use((req, res, next) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});



/* Middleware de errores global*/
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  res.status(err.status || 500).json({
    error: err.message || "Error Interno del Servidor"
  });
});

module.exports = app;
