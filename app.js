// app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
dotenv.config();

const morganBody   = require("morgan-body");
const loggerStream = require("./utils/handleLogger");
const dbConnect    = require("./config/mongo");

// Carga el bundle dereferenciado (renombra swagger-bundled.yaml → swagger.yaml)
const swaggerUi       = require("swagger-ui-express");
const swaggerDocument = require("./docs/swagger");  

const app = express();

// Conecta a la base de datos
dbConnect();

// Middlewares
app.use(helmet());
const allowed = process.env.CORS_ORIGINS?.split(",") || [];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin)) cb(null, true);
    else cb(new Error("CORS_NOT_ALLOWED"));
  }
}));
app.use(express.json());
app.use(express.static("storage"));

morganBody(app, {
  noColors: true,
  skip: (req, res) => res.statusCode < 400,
  stream: loggerStream,
});

// Rutas de tu API
app.use("/api", require("./routes"));

// Swagger UI (con spec ya cargada en memoria)
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

// Rutas de testing/error
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

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  res.status(err.status || 500).json({
    error: err.message || "Error Interno del Servidor"
  });
});

module.exports = app;
