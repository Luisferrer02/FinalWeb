// tests/rol.test.js
const checkRol = require('../middleware/rol');
const { handleHttpError } = require('../utils/handleError');

describe('middleware/rol', () => {
  function makeRes() {
    return {
      status: jest.fn().mockReturnThis(),
      json:   jest.fn(),
    };
  }

  afterEach(() => jest.clearAllMocks());

  test('sin user → ERROR_PERMISSIONS', () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();
    checkRol(['admin'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'ERROR_PERMISSIONS' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rol no permitido → NOT_ALLOWED', () => {
    const req = { headers: { user: JSON.stringify({ role: 'user' }) } };
    const res = makeRes();
    const next = jest.fn();
    checkRol(['admin'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'NOT_ALLOWED' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rol permitido → llama a next()', () => {
    const req = { headers: { user: JSON.stringify({ role: 'admin' }) } };
    const res = makeRes();
    const next = jest.fn();
    checkRol(['admin'])(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('parseo JSON inválido lanza ERROR_PERMISSIONS', () => {
    const req = { headers: { user: 'no-es-un-json' } };
    const res = makeRes();
    const next = jest.fn();
    checkRol(['admin'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'ERROR_PERMISSIONS' });
  });
});
