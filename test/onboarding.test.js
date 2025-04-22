// tests/validators.onboardingCompany.test.js

const { validationResult } = require('express-validator');
const {
  validatorOnboardingCompany,
  validatorOnboardingUser
} = require('../validators/onboarding');

jest.mock('express-validator', () => ({
  ...jest.requireActual('express-validator'),
  validationResult: jest.fn()
}));

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

describe('validators/onboardingCompany.js – cobertura completa', () => {

  beforeEach(() => jest.clearAllMocks());

  const validators = [
    { name: 'validatorOnboardingCompany', validator: validatorOnboardingCompany },
    { name: 'validatorOnboardingUser', validator: validatorOnboardingUser }
  ];

  validators.forEach(({ name, validator }) => {
    test(`${name} ⇒ next() cuando no hay errores`, () => {
      const req = {};
      const res = makeRes();
      const next = jest.fn();

      validationResult.mockReturnValue({ throw: jest.fn() });

      const middleware = validator[validator.length - 1];
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test(`${name} ⇒ responde 422 cuando hay errores`, () => {
        const req = {};
        const res = makeRes();
        const next = jest.fn();
      
        // Simula que validationResult().throw() lanza un error real
        validationResult.mockImplementation(() => ({
          throw: () => {
            throw {
              array: () => ['error']
            };
          }
        }));
      
        const middleware = validator[validator.length - 1];
        middleware(req, res, next);
      
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json).toHaveBeenCalledWith({ errors: ['error'] });
      });
      
  });
});
