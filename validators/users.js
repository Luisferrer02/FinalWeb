//validators/users.js

const { check } = require('express-validator');
const { validateResults } = require('../utils/handleValidator');

const validatorGetUser = [
    check('id').exists().notEmpty().isMongoId(),
    (req, res, next) => validateResults(req, res, next)
]

const validatorUpdateUser = [
    check("id").exists().notEmpty().isMongoId(),
    check("name").optional().notEmpty(),
    check("age").optional().notEmpty().isInt(),
    check("email").optional().notEmpty().isEmail(),
    check("password").optional().notEmpty(),
    check("role").exists().notEmpty(),
    (req, res, next) => validateResults(req, res, next),
]

const validateRegister = [
  check("email")
    .exists().withMessage("El email es obligatorio")
    .bail()
    .isEmail().withMessage("El email no es válido"),
  check("password")
    .exists().withMessage("La contraseña es obligatoria")
    .bail()
    .isLength({ min: 8 }).withMessage("La contraseña debe tener al menos 8 caracteres"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 422 -> Unprocessable Entity
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }
];

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
  }
];

// validators/recoverPassword.js
const validatorRecoverPasswordCode = [
  check("email").exists().notEmpty().isEmail(),
  check("currentPassword").exists().notEmpty(),
  (req, res, next) => validateResults(req, res, next)
];

const validatorNewPassword = [
  check("email").exists().notEmpty().isEmail(),
  check("recoveryCode").exists().notEmpty(),
  check("newPassword").exists().notEmpty(),
  (req, res, next) => validateResults(req, res, next)
];


module.exports = {
    validatorGetUser,
    validateRegister,
  validateEmailCode,
    validatorUpdateUser,
    validatorRecoverPasswordCode,
    validatorNewPassword
}