//validators/clients.js
const { check } = require("express-validator");
const { validateResults } = require("../utils/handleValidator");

// Validador para crear un cliente
const validatorCreateClient = [
  check("name").exists().notEmpty().withMessage("El nombre es obligatorio"),
  check("cif").exists().notEmpty().withMessage("El CIF es obligatorio"),
  check("address.street").exists().notEmpty().withMessage("La calle es obligatoria"),
  check("address.number")
    .exists().notEmpty().withMessage("El número es obligatorio")
    .isNumeric().withMessage("El número debe ser numérico"),
  check("address.postal")
    .exists().notEmpty().withMessage("El código postal es obligatorio")
    .isNumeric().withMessage("El código postal debe ser numérico"),
  check("address.city").exists().notEmpty().withMessage("La ciudad es obligatoria"),
  check("address.province").exists().notEmpty().withMessage("La provincia es obligatoria"),
  (req, res, next) => validateResults(req, res, next)
];

// Validador para operaciones que requieren un ID de cliente (GET, PUT, DELETE, archivar, restaurar, etc.)
const validatorClientId = [
  check("id").exists().notEmpty().isMongoId().withMessage("El ID del cliente no es válido"),
  (req, res, next) => validateResults(req, res, next)
];

// Validador para actualizar un cliente (campos opcionales)
const validatorUpdateClient = [
  check("id").exists().notEmpty().isMongoId().withMessage("El ID del cliente no es válido"),
  check("name").optional().notEmpty().withMessage("Si se envía, el nombre no puede estar vacío"),
  check("cif").optional().notEmpty().withMessage("Si se envía, el CIF no puede estar vacío"),
  check("address.street").optional().notEmpty().withMessage("La calle no puede estar vacía"),
  check("address.number").optional().notEmpty().isNumeric().withMessage("El número debe ser numérico"),
  check("address.postal").optional().notEmpty().isNumeric().withMessage("El código postal debe ser numérico"),
  check("address.city").optional().notEmpty().withMessage("La ciudad no puede estar vacía"),
  check("address.province").optional().notEmpty().withMessage("La provincia no puede estar vacía"),
  (req, res, next) => validateResults(req, res, next)
];

module.exports = {
  validatorCreateClient,
  validatorClientId,
  validatorUpdateClient
};
