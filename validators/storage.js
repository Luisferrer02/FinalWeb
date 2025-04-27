//validators/storage.js

const { check } = require("express-validator")
const { validateResults } = require("../utils/handleValidator");

// Validador para obtener un elemento por ID
const validatorGetItem = [
    check("id").exists().notEmpty().isMongoId(),
    (req, res, next) => {
        return validateResults(req, res, next)
    }
]

module.exports = { validatorGetItem }