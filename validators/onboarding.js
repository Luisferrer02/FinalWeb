// validators/onboardingCompany.js
const { check } = require("express-validator");
const { validateResults } = require("../utils/handleValidator");
const runValidateResults = (req, res, next) => validateResults(req, res, next);

// Validador para el onboarding de la empresa
const validatorOnboardingCompany = [
  check("companyName").exists().notEmpty(),
  check("cif").exists().notEmpty(),
  check("address").exists().notEmpty(),
  runValidateResults,
];

// Validador para el onboarding del usuario
const validatorOnboardingUser = [
  check("name").exists().notEmpty(),
  check("lastName").exists().notEmpty(),
  check("nif").exists().notEmpty(),
  runValidateResults,
];

module.exports = { validatorOnboardingCompany, validatorOnboardingUser };
