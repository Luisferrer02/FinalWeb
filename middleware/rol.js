// middleware/rol.js
const { handleHttpError } = require("../utils/handleError");

const checkRol = (roles) => (req, res, next) => {
  try {
    const user = req.headers.user ? JSON.parse(req.headers.user) : null;

    if (!user) {
      handleHttpError(res, "ERROR_PERMISSIONS", 403); // Si no hay un usuario, devolvemos un error
      return;
    }

    const userRol = user.role; // Obtenemos el rol del usuario
    const checkValueRol = roles.includes(userRol); // Verificamos si el rol está permitido

    if (!checkValueRol) {
      handleHttpError(res, "NOT_ALLOWED", 403); // Si el rol no está permitido, devolvemos un error
      return;
    }

    next(); // Si todo está bien, continuamos al siguiente middleware
  } catch (err) {
    handleHttpError(res, "ERROR_PERMISSIONS", 403); // En caso de error inesperado, devolvemos un error
  }
};

module.exports = checkRol;
