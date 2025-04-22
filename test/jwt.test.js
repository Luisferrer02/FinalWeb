// tests/handleJwt.test.js

// Asegúrate de que el JWT_SECRET está definido
beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });
  
  const { verifyToken } = require('../utils/handleJwt');
  
  describe('utils/handleJwt – verifyToken error branch', () => {
    test('should catch JSONWebTokenError, log it and return undefined', () => {
      // Espiamos console.log para cubrir la línea del catch
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  
      // Llamamos con un string que no es un JWT válido
      const result = verifyToken('this.is.not.a.jwt');
  
      expect(result).toBeUndefined();
      expect(logSpy).toHaveBeenCalledWith(expect.any(Error));
  
      logSpy.mockRestore();
    });
  });
  