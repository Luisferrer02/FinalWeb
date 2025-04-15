// utils/handleError.js

/**
 * Envía una respuesta de error HTTP.
 * @param {Response} res - Objeto respuesta de Express.
 * @param {string} message - Mensaje o código de error.
 * @param {number} code - Código HTTP (por defecto 403).
 */
const handleHttpError = (res, message, code = 403) => {
  console.error("HTTP Error:", message);
  res.status(code).json({ error: message });
};

module.exports = { handleHttpError };
