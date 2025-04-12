const express = require("express");
const router = express.Router();
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
  inviteUserCtrl
} = require("../controllers/users");
const { validatorUpdateUser, validatorGetUser, validatorRecoverPasswordCode, validatorNewPassword  } = require("../validators/users");
const { validatorOnboardingCompany, validatorOnboardingUser } = require("../validators/onboarding");
const authMiddleware = require("../middleware/session");
const checkRol = require("../middleware/rol");
const { uploadMiddleWareMemory } = require("../utils/handleStorage");

router.get("/me", authMiddleware, getUserByTokenCtrl);
router.delete("/me", authMiddleware, deleteUser);
router.patch("/logo", authMiddleware, uploadMiddleWareMemory.single("image"), updateLogoCtrl);

router.get("/", authMiddleware, getUsers);
router.get("/:id", authMiddleware, validatorGetUser, getUser);
router.patch("/:id", authMiddleware, checkRol(["admin"]), validatorUpdateUser, updateUser);
router.delete("/:id", authMiddleware, checkRol(["admin"]), validatorGetUser, deleteUser);
router.patch("/role/:id", authMiddleware, checkRol(["admin"]), updateUserRoleCtrl);

// Endpoints nuevos:
router.post("/validate-email", authMiddleware, validateEmailCtrl);
router.patch("/onboarding/personal", authMiddleware, validatorOnboardingUser, onboardingPersonalCtrl);
router.patch("/onboarding/company", authMiddleware, validatorOnboardingCompany, onboardingCompanyCtrl);
router.post("/recover-password-code", validatorRecoverPasswordCode, recoverPasswordCodeCtrl);
router.post("/change-password", validatorNewPassword, changePasswordCtrl);

// Invitación de usuario
router.post("/invite", authMiddleware, inviteUserCtrl);

module.exports = router;
