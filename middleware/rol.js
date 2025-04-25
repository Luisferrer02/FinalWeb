// middleware/rol.js
const { handleHttpError } = require("../utils/handleError");

/**
 * Comprueba que el usuario autenticado tenga uno de los roles permitidos.
 * @param {string[]} roles – lista de roles autorizados, p. ej. ["admin","user"]
 */
const checkRol = (roles) => (req, res, next) => {
  try {
    // authMiddleware debe haber inyectado req.user
    const user = req.user;
    if (!user) {
      // No hay sesión válida
      return handleHttpError(res, "ERROR_PERMISSIONS", 403);
    }

    // Comprueba si el rol del usuario está en la lista de permitidos
    if (!roles.includes(user.role)) {
      return handleHttpError(res, "NOT_ALLOWED", 403);
    }

    // Todo OK: continúa
    next();
  } catch (err) {
    console.error("Error checking role:", err);
    return handleHttpError(res, "ERROR_PERMISSIONS", 403);
  }
};

module.exports = checkRol;
