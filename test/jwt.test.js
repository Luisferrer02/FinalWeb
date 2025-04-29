// tests/handleJwt.test.js

// Asegúrate de que el JWT_SECRET está definido
beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });
  
  const { verifyToken } = require('../utils/handleJwt');
  
  describe('utils/handleJwt – verifyToken error branch', () => {
      test('should throw TOKEN_INVALID for malformed token', () => {
          // Cuando el JWT es inválido, verifyToken lanza un error con name y message = "TOKEN_INVALID"
          expect(() => verifyToken('this.is.not.a.jwt')).toThrowError(
            expect.objectContaining({ name: 'TOKEN_INVALID', message: 'TOKEN_INVALID' })
          );
        });
  });

  describe('utils/handleJwt – verifyToken expirado', () => {
    test('should throw TOKEN_EXPIRED for expired token', () => {
      const jwt = require('jsonwebtoken');
  
      // Hacemos que jwt.verify lance exactamente un TokenExpiredError
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      });
  
      const { verifyToken } = require('../utils/handleJwt');
  
      expect(() => verifyToken('any.expired.token')).toThrowError(
        expect.objectContaining({ name: 'TOKEN_EXPIRED', message: 'TOKEN_EXPIRED' })
      );
  
      jwt.verify.mockRestore(); // limpia el spy para no afectar a otros tests
    });
  });
  