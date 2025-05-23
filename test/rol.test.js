const checkRol = require('../middleware/rol');

describe('middleware/rol', () => {
  function makeRes() {
    return {
      status: jest.fn().mockReturnThis(),
      json:   jest.fn(),
    };
  }

  afterEach(() => jest.clearAllMocks());

  test('sin user → ERROR_PERMISSIONS', () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();
    checkRol(['admin'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'ERROR_PERMISSIONS' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rol no permitido → NOT_ALLOWED', () => {
    const req = { user: { role: 'user' } };
    const res = makeRes();
    const next = jest.fn();
    checkRol(['admin'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'NOT_ALLOWED' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rol permitido → llama a next()', () => {
    const req = { user: { role: 'admin' } };
    const res = makeRes();
    const next = jest.fn();
    checkRol(['admin'])(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('error interno → captura excepción y lanza ERROR_PERMISSIONS', () => {
    const req = { user: { role: 'admin' } };
    const res = makeRes();
    const next = jest.fn();
    // Provocamos error interno: pasar `roles` no iterable
    const badMiddleware = checkRol(null);
    badMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'ERROR_PERMISSIONS' });
    expect(next).not.toHaveBeenCalled();
  });
});
