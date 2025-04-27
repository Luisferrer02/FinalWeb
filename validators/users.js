const { check, param, validationResult } = require('express-validator');
const { validateResults } = require('../utils/handleValidator');

// Validador para obtener un usuario por ID
const validatorGetUser = [
  param('id').exists().notEmpty().isMongoId().withMessage("ID no válido"),
  (req, res, next) => validateResults(req, res, next)  // Esto cubre la validación para ID inválido
];

// Validador para actualizar un usuario
const validatorUpdateUser = [
  param("id").exists().notEmpty().isMongoId().withMessage("El ID del usuario no es válido"),  check("name").optional().notEmpty().withMessage("El nombre es obligatorio si se proporciona"),
  check("email").optional().isEmail().withMessage("El email no es válido"),
  check("password").optional().notEmpty().withMessage("La contraseña es obligatoria si se proporciona"),
  check("role").optional().isIn(["user", "admin", "guest"]).withMessage("Rol inválido"),
  (req, res, next) => validateResults(req, res, next),  
];

// Validador para invitar a un usuario
const validatorInviteUser = [
  check("email")
    .exists().withMessage("El email es obligatorio")
    .isEmail().withMessage("El email debe ser válido"),
  (req, res, next) => validateResults(req, res, next)
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

// Validador para aceptar la invitación
const validatorAcceptInvite = [
  check('token')
    .exists().withMessage('El token es obligatorio')
    .isUUID().withMessage('Token no válido'),
  check('name')
    .exists().withMessage('El nombre es obligatorio')
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres'),
  check('lastName')
    .optional()
    .isString(),
  check('email')
    .exists().isEmail().withMessage('Email no válido'),
  check('password')
    .exists().isLength({ min: 8 }).withMessage('La contraseña debe tener mínimo 8 caracteres')
    .matches(/\d/).withMessage('Debe contener un número')
    .matches(/[A-Z]/).withMessage('Debe contener una mayúscula')
    .matches(/[a-z]/).withMessage('Debe contener una minúscula'),
  (req, res, next) => validateResults(req, res, next)
];

module.exports = {
  validatorGetUser,
  validateEmailCode,
  validatorUpdateUser,
  validatorRecoverPasswordCode,
  validatorNewPassword,
  validatorAcceptInvite,
  validatorInviteUser
};
