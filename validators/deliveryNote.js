const { check } = require("express-validator");
const { validateResults } = require("../utils/handleValidator");

const validatorCreateDeliveryNote = [
  check("clientId")
    .exists().withMessage("El clientId es obligatorio")
    .notEmpty().withMessage("El clientId no puede estar vacío")
    .isMongoId().withMessage("El clientId no es válido"),
  check("projectId")
    .exists().withMessage("El projectId es obligatorio")
    .notEmpty().withMessage("El projectId no puede estar vacío")
    .isMongoId().withMessage("El projectId no es válido"),
  check("items")
    .exists().withMessage("El array de items es obligatorio")
    .isArray().withMessage("El valor de items debe ser un array"),
  check("items.*.type")
    .exists().withMessage("El tipo es obligatorio")
    .isIn(["hour", "material"]).withMessage("El tipo debe ser 'hour' o 'material'"),
  check("items.*.description")
    .exists().withMessage("La descripción es obligatoria")
    .notEmpty().withMessage("La descripción no puede estar vacía"),
  check("items.*.quantity")
    .exists().withMessage("La cantidad es obligatoria")
    .isNumeric().withMessage("La cantidad debe ser un número"),
  (req, res, next) => validateResults(req, res, next)
];

const validatorDeliveryNoteId = [
  check("id")
    .exists().withMessage("El ID es obligatorio")
    .isMongoId().withMessage("El ID no es válido"),
  (req, res, next) => validateResults(req, res, next)
];

module.exports = {
  validatorCreateDeliveryNote,
  validatorDeliveryNoteId
};
