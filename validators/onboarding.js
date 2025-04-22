// validators/onboardingCompany.js
const { check } = require("express-validator");
const { validateResults } = require("../utils/handleValidator");
const runValidateResults = (req, res, next) => validateResults(req, res, next);

const validatorOnboardingCompany = [
  check("companyName").exists().notEmpty(),
  check("cif").exists().notEmpty(),
  check("address").exists().notEmpty(),
  runValidateResults,
];

const validatorOnboardingUser = [
  check("name").exists().notEmpty(),
  check("lastName").exists().notEmpty(),
  check("nif").exists().notEmpty(),
  runValidateResults,
];

module.exports = { validatorOnboardingCompany, validatorOnboardingUser };
