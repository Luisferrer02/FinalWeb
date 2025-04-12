//validators/mail.js
const { check } = require("express-validator")
const { validateResults } = require('../utils/handleValidator');

const validatorMail = [
    check("subject").exists().notEmpty(),
    check("text").exists().notEmpty(),
    check("to").exists().notEmpty().isEmail(),
    check("from").exists().notEmpty().isEmail(),
    (req, res, next) => {
    return validateResults(req, res, next)
    }
]
    module.exports = { validatorMail }