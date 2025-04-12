// validators/onboardingCompany.js
const { check } = require("express-validator");
const { validateResults } = require("../utils/handleValidator");

const validatorOnboardingCompany = [
  check("companyName").exists().notEmpty(),
  check("cif").exists().notEmpty(),
  check("address").exists().notEmpty(),
  (req, res, next) => validateResults(req, res, next)
];

const validatorOnboardingUser = [
  check("name").exists().notEmpty(),
  check("lastName").exists().notEmpty(),
  check("nif").exists().notEmpty(),
  (req, res, next) => validateResults(req, res, next)
];

module.exports = { validatorOnboardingCompany, validatorOnboardingUser };
