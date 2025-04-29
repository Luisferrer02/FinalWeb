// tests/validators.users.test.js

const { validationResult } = require('express-validator');
const {
  validatorGetUser,
  validatorUpdateUser,
  validateRegister,
  validateEmailCode,
  validatorRecoverPasswordCode,
  validatorNewPassword
} = require('../validators/users');

const { validateResults } = require('../utils/handleValidator');

jest.mock('express-validator', () => ({
  ...jest.requireActual('express-validator'),
  validationResult: jest.fn()
}));

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

describe('validators/users.js – cobertura completa', () => {

  beforeEach(() => jest.clearAllMocks());

  describe('validateResults', () => {
    test('devuelve errores si existen', () => {
      const req = {};
      const res = makeRes();
      const next = jest.fn();

      validationResult.mockReturnValue({
        throw: jest.fn(() => { throw { array: () => ['error'] }; }),
      });

      validateResults(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({ errors: ['error'] });
    });

    test('continúa sin errores', () => {
      const req = {};
      const res = makeRes();
      const next = jest.fn();

      validationResult.mockReturnValue({ throw: jest.fn() });

      validateResults(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validators con validateResults inline', () => {
    const validatorsInline = [
      validatorGetUser,
      validatorUpdateUser,
      validatorRecoverPasswordCode,
      validatorNewPassword
    ];

    validatorsInline.forEach((validator, index) => {
      test(`validator inline #${index + 1} llama validateResults`, () => {
        const req = {};
        const res = makeRes();
        const next = jest.fn();

        validationResult.mockReturnValue({ throw: jest.fn() });

        validator[validator.length - 1](req, res, next);

        expect(next).toHaveBeenCalled();
      });
    });
  });



  describe('validateEmailCode', () => {
    test('devuelve errores si código inválido', () => {
      const req = {};
      const res = makeRes();
      const next = jest.fn();

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => ['código inválido']
      });

      validateEmailCode[validateEmailCode.length - 1](req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({ errors: ['código inválido'] });
      expect(next).not.toHaveBeenCalled();
    });

    test('continúa sin errores', () => {
      const req = {};
      const res = makeRes();
      const next = jest.fn();

      validationResult.mockReturnValue({ isEmpty: () => true });

      validateEmailCode[validateEmailCode.length - 1](req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

});

/* ------------------------------------------------------------------ */
/* validatorInviteUser & validatorAcceptInvite                        */
/* ------------------------------------------------------------------ */
const {
  validatorInviteUser,
  validatorAcceptInvite
} = require('../validators/users');

describe('validatorInviteUser – último middleware', () => {
  test('pasa a next() cuando no hay errores', () => {
    const req  = {};
    const res  = makeRes();
    const next = jest.fn();

    // simulate “no errors”
    validationResult.mockReturnValue({ throw: jest.fn() });

    const last = validatorInviteUser[validatorInviteUser.length - 1];
    last(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('devuelve 422 cuando hay errores', () => {
    const req  = {};
    const res  = makeRes();
    const next = jest.fn();

    // simulate “errors”
    validationResult.mockReturnValue({
      throw: jest.fn(() => { throw { array: () => ['e'] }; })
    });

    const last = validatorInviteUser[validatorInviteUser.length - 1];
    last(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ errors: ['e'] });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validatorAcceptInvite – último middleware', () => {
  test('pasa a next() cuando no hay errores', () => {
    const req  = {};
    const res  = makeRes();
    const next = jest.fn();

    validationResult.mockReturnValue({ throw: jest.fn() });

    const last = validatorAcceptInvite[validatorAcceptInvite.length - 1];
    last(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('devuelve 422 cuando hay errores', () => {
    const req  = {};
    const res  = makeRes();
    const next = jest.fn();

    validationResult.mockReturnValue({
      throw: jest.fn(() => { throw { array: () => ['err'] }; })
    });

    const last = validatorAcceptInvite[validatorAcceptInvite.length - 1];
    last(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ errors: ['err'] });
    expect(next).not.toHaveBeenCalled();
  });
});
