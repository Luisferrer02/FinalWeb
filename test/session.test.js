// tests/session.test.js

/* ------------------------------------------------------------ */
/* 1. MOCKS GLOBALES (jest hoisted)                            */
/* ------------------------------------------------------------ */
jest.mock('../utils/handleError', () => ({
  handleHttpError: jest.fn()
}));

jest.mock('../utils/handleJwt', () => ({
  verifyToken: jest.fn()
}));

jest.mock('../models/nosql/users', () => ({
  findById: jest.fn()
}));

/* ------------------------------------------------------------ */
/* 2. IMPORTS (con mocks ya activos)                           */
/* ------------------------------------------------------------ */
const { handleHttpError } = require('../utils/handleError');
const { verifyToken }     = require('../utils/handleJwt');
const usersModel          = require('../models/nosql/users');
const authMiddleware      = require('../middleware/session');

/* ------------------------------------------------------------ */
/* 3. HELPER para req/res/next                                 */
/* ------------------------------------------------------------ */
function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis()
  };
}

/* ------------------------------------------------------------ */
/* 4. TESTS                                                     */
/* ------------------------------------------------------------ */
describe('middleware/session (authMiddleware)', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('sin Authorization header → NOT_TOKEN', async () => {
    await authMiddleware(req, res, next);
    expect(handleHttpError).toHaveBeenCalledWith(res, 'NOT_TOKEN', 401);
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken devuelve null → NOT_SESSION', async () => {
    req.headers.authorization = 'Bearer sometoken';
    verifyToken.mockResolvedValueOnce(null);
    await authMiddleware(req, res, next);
    expect(verifyToken).toHaveBeenCalledWith('sometoken');
    expect(handleHttpError).toHaveBeenCalledWith(res, 'NOT_SESSION', 401);
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken devuelve objeto sin _id → ERROR_ID_TOKEN', async () => {
    req.headers.authorization = 'Bearer abc';
    verifyToken.mockResolvedValueOnce({}); // no _id
    await authMiddleware(req, res, next);
    expect(handleHttpError).toHaveBeenCalledWith(res, 'ERROR_ID_TOKEN', 401);
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken lanza TOKEN_EXPIRED → TOKEN_EXPIRED', async () => {
    req.headers.authorization = 'Bearer tok';
    const err = new Error('expired');
    err.name = 'TOKEN_EXPIRED';
    verifyToken.mockRejectedValueOnce(err);
    await authMiddleware(req, res, next);
    expect(handleHttpError).toHaveBeenCalledWith(res, 'TOKEN_EXPIRED', 498);
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken lanza otro error → TOKEN_INVALID', async () => {
    req.headers.authorization = 'Bearer tok';
    verifyToken.mockRejectedValueOnce(new Error('fail'));
    await authMiddleware(req, res, next);
    expect(handleHttpError).toHaveBeenCalledWith(res, 'TOKEN_INVALID', 401);
    expect(next).not.toHaveBeenCalled();
  });

  test('findById lanza → NOT_SESSION', async () => {
    req.headers.authorization = 'Bearer valid';
    verifyToken.mockResolvedValueOnce({ _id: 'u1' });
    usersModel.findById.mockRejectedValueOnce(new Error('db fail'));
    await authMiddleware(req, res, next);
    expect(verifyToken).toHaveBeenCalledWith('valid');
    expect(usersModel.findById).toHaveBeenCalledWith('u1');
    expect(handleHttpError).toHaveBeenCalledWith(res, 'NOT_SESSION', 401);
    expect(next).not.toHaveBeenCalled();
  });

  test('éxito total → inyecta req.user y llama next()', async () => {
    const fakeUser = { _id: 'u2', name: 'Test' };
    req.headers.authorization = 'Bearer good';
    verifyToken.mockResolvedValueOnce({ _id: 'u2' });
    usersModel.findById.mockResolvedValueOnce(fakeUser);

    await authMiddleware(req, res, next);
    expect(verifyToken).toHaveBeenCalledWith('good');
    expect(usersModel.findById).toHaveBeenCalledWith('u2');
    expect(req.user).toBe(fakeUser);
    expect(next).toHaveBeenCalled();
  });
});
