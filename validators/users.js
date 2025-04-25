const { check, param, validationResult } = require('express-validator');
const { validateResults } = require('../utils/handleValidator');

// Validador para obtener un usuario por ID
const validatorGetUser = [
  check('id').exists().notEmpty().isMongoId().withMessage("ID no válido"),
  (req, res, next) => validateResults(req, res, next)  // Esto cubre la validación para ID inválido
];

// Validador para actualizar un usuario
const validatorUpdateUser = [
  param("id").exists().notEmpty().isMongoId().withMessage("El ID del usuario no es válido"),  check("name").optional().notEmpty().withMessage("El nombre es obligatorio si se proporciona"),
  check("age").optional().isInt({ min: 1 }).withMessage("La edad debe ser un número entero positivo"),
  check("email").optional().isEmail().withMessage("El email no es válido"),
  check("password").optional().notEmpty().withMessage("La contraseña es obligatoria si se proporciona"),
  check("role").optional().isIn(["user", "admin", "guest"]).withMessage("Rol inválido"),
  (req, res, next) => validateResults(req, res, next),  
];

// Validador para el registro de un usuario
const validateRegister = [
  check("email")
    .exists().withMessage("El email es obligatorio")
    .bail()
    .isEmail().withMessage("El email no es válido"),
  check("password")
    .exists().withMessage("La contraseña es obligatoria")
    .bail()
    .isLength({ min: 8 }).withMessage("La contraseña debe tener al menos 8 caracteres")
    .bail()
    .matches(/\d/).withMessage("La contraseña debe contener al menos un número")
    .matches(/[A-Z]/).withMessage("La contraseña debe contener al menos una letra mayúscula")
    .matches(/[a-z]/).withMessage("La contraseña debe contener al menos una letra minúscula"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 422 -> Unprocessable Entity
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }  // Aquí se maneja el error de validación de email y password
];

// Validador para el código de verificación del email
const validateEmailCode = [
  check("code")
    .exists().withMessage("El código es obligatorio")
    .bail()
    .isLength({ min: 6, max: 6 }).withMessage("El código debe tener 6 dígitos")
    .isNumeric().withMessage("El código debe ser numérico"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }  // Aquí se maneja el error del código de verificación
];

// Validador para el código de recuperación de contraseña
const validatorRecoverPasswordCode = [
  check("email").exists().notEmpty().isEmail().withMessage("El email es obligatorio y debe ser válido"),
  check("currentPassword").exists().notEmpty().withMessage("La contraseña actual es obligatoria"),
  (req, res, next) => validateResults(req, res, next)  // Esto cubre la validación de los datos de recuperación
];

// Validador para la nueva contraseña
const validatorNewPassword = [
  check("email").exists().notEmpty().isEmail().withMessage("El email es obligatorio y debe ser válido"),
  check("recoveryCode").exists().notEmpty().withMessage("El código de recuperación es obligatorio"),
  check("newPassword")
    .exists().withMessage("La nueva contraseña es obligatoria")
    .bail()
    .isLength({ min: 8 }).withMessage("La nueva contraseña debe tener al menos 8 caracteres")
    .bail()
    .matches(/\d/).withMessage("La nueva contraseña debe contener al menos un número")
    .matches(/[A-Z]/).withMessage("La nueva contraseña debe contener al menos una letra mayúscula")
    .matches(/[a-z]/).withMessage("La nueva contraseña debe contener al menos una letra minúscula"),
  (req, res, next) => validateResults(req, res, next)  // Esto cubre la validación de la nueva contraseña
];

module.exports = {
  validatorGetUser,
  validateRegister,
  validateEmailCode,
  validatorUpdateUser,
  validatorRecoverPasswordCode,
  validatorNewPassword
};
