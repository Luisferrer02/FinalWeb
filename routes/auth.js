//routes/auth.js
const rateLimit = require("express-rate-limit");
const express = require("express");
const router = express.Router();
const { validatorRegister, validatorLogin } = require("../validators/auth");
const { registerCtrl, loginCtrl } = require("../controllers/auth");
// Max 10 intentos en 15 min
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "TOO_MANY_LOGIN_ATTEMPTS" },
});

// POST /api/auth/register – Registro de usuario
router.post("/register", validatorRegister, registerCtrl);
// POST /api/auth/login – Inicio de sesión
router.post("/login", loginLimiter, validatorLogin, loginCtrl);

module.exports = router;
