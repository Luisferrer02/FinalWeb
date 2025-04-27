const rateLimit = require("express-rate-limit");
const express = require("express");
const router = express.Router();
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "TOO_MANY_CODE_ATTEMPTS" }
});

const {
  getUsers, 
  getUser, 
  updateUser, 
  deleteUser, 
  updateUserRoleCtrl,
  validateEmailCtrl,
  onboardingPersonalCtrl,
  onboardingCompanyCtrl,
  updateLogoCtrl,
  getUserByTokenCtrl,
  recoverPasswordCodeCtrl,
  changePasswordCtrl,
  inviteUserCtrl,
  acceptInviteCtrl
} = require("../controllers/users");

const {
  validatorUpdateUser, 
  validatorGetUser, 
  validatorRecoverPasswordCode, 
  validatorNewPassword,
  validatorAcceptInvite,
  validateEmailCode,
  validatorInviteUser
} = require("../validators/users");

const {
  validatorOnboardingCompany, 
  validatorOnboardingUser
} = require("../validators/onboarding");

const authMiddleware = require("../middleware/session");
const checkRol = require("../middleware/rol");
const { uploadMiddleWareMemory } = require("../utils/handleStorage");

// GET /api/user/me – Obtiene el usuario autenticado
router.get("/me", authMiddleware, getUserByTokenCtrl);
// DELETE /api/user/me – Elimina el usuario autenticado
router.delete("/me", authMiddleware, deleteUser);
// PATCH /api/user/logo – Actualiza el logo del usuario autenticado
router.patch("/logo", authMiddleware, uploadMiddleWareMemory.single("image"), updateLogoCtrl);

// POST /api/user/invite – Invita a un nuevo usuario
router.post("/invite", authMiddleware, checkRol(["admin"]), validatorInviteUser, inviteUserCtrl);
// POST /api/user/accept-invite – Acepta la invitación de un nuevo usuario
router.post("/accept-invite", validatorAcceptInvite, acceptInviteCtrl);

// GET /api/user – Obtiene todos los usuarios
router.get("/", authMiddleware, getUsers);
// GET /api/user/:id – Obtiene un usuario por ID
router.get("/:id", authMiddleware, validatorGetUser, getUser);
// PATCH /api/user/:id – Actualiza un usuario por ID
router.patch("/:id", authMiddleware, checkRol(["admin"]), validatorUpdateUser, updateUser);
// DELETE /api/user/:id – Elimina un usuario por ID
router.delete("/:id", authMiddleware, checkRol(["admin"]), validatorGetUser, deleteUser);
// PATCH /api/user/role/:id – Actualiza el rol de un usuario por ID
router.patch("/role/:id", authMiddleware, checkRol(["admin"]), updateUserRoleCtrl);

// POST /api/user/validate-email – Valida el código de verificación de email
router.post("/validate-email", authMiddleware, emailLimiter, validateEmailCode, validateEmailCtrl);
// PATCH /api/onboarding/personal – Actualiza los datos personales del usuario
router.patch("/onboarding/personal", authMiddleware, validatorOnboardingUser, onboardingPersonalCtrl);
// PATCH /api/onboarding/company – Actualiza los datos de la empresa del usuario
router.patch("/onboarding/company", authMiddleware, validatorOnboardingCompany, onboardingCompanyCtrl);
// POST /api/user/recover-password-code – Solicita un código de recuperación de contraseña
router.post("/recover-password-code", validatorRecoverPasswordCode, recoverPasswordCodeCtrl);
// PATCH /api/user/recover-password – Cambia la contraseña del usuario
router.post("/change-password", validatorNewPassword, changePasswordCtrl);

module.exports = router;
