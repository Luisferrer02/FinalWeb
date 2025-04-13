const { check } = require("express-validator");
const { validateResults } = require("../utils/handleValidator");

const validatorCreateProject = [
  check("name")
    .exists().withMessage("El nombre del proyecto es obligatorio")
    .notEmpty().withMessage("El nombre no puede estar vacío"),
  check("clientId")
    .exists().withMessage("El clientId es obligatorio")
    .notEmpty().withMessage("El clientId no puede estar vacío")
    .isMongoId().withMessage("El clientId no es válido"),
  check("description")
    .optional()
    .isString().withMessage("La descripción debe ser una cadena de texto"),
  (req, res, next) => validateResults(req, res, next)
];

const validatorProjectId = [
  check("id")
    .exists().withMessage("El ID del proyecto es obligatorio")
    .notEmpty().withMessage("El ID no puede estar vacío")
    .isMongoId().withMessage("El ID del proyecto no es válido"),
  (req, res, next) => validateResults(req, res, next)
];

const validatorUpdateProject = [
  check("id")
    .exists().withMessage("El ID del proyecto es obligatorio")
    .notEmpty().withMessage("El ID no puede estar vacío")
    .isMongoId().withMessage("El ID del proyecto no es válido"),
  check("name")
    .optional()
    .notEmpty().withMessage("Si se envía, el nombre no puede estar vacío"),
  check("clientId")
    .optional()
    .isMongoId().withMessage("El clientId no es válido"),
  check("description")
    .optional()
    .isString().withMessage("La descripción debe ser una cadena de texto"),
  (req, res, next) => validateResults(req, res, next)
];

module.exports = {
  validatorCreateProject,
  validatorProjectId,
  validatorUpdateProject
};
