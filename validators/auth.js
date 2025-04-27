const { check } = require('express-validator');
const { validateResults } = require('../utils/handleValidator');

//Validator para el registro de usuarios
const validatorRegister = [
    check("name").exists().notEmpty().isLength( {min:3, max: 99} ),
    check("email").exists().notEmpty().isEmail(),
    check("password").exists().notEmpty().isLength( {min:8, max: 16} ),
    (req, res, next) => {
        return validateResults(req, res, next)
    }
 ]

// Validador para el inicio de sesión
 const validatorLogin = [
    check("email").exists().notEmpty().isEmail(),
    check("password").exists().notEmpty().isLength( {min:8, max: 16} ),
    (req, res, next) => {
        return validateResults(req, res, next)
    }
 ]
 module.exports = { validatorRegister, validatorLogin }