//middleware/session.js

const { handleHttpError } = require("../utils/handleError")
const { verifyToken } = require("../utils/handleJwt")
const usersModel = require("../models/nosql/users")

const authMiddleware = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      handleHttpError(res, "NOT_TOKEN", 401)
      return
    }
    // Se espera el formato "Bearer <token>"
    const token = req.headers.authorization.split(" ").pop();
    let dataToken;
    try {
      dataToken = await verifyToken(token);
    } catch (err) {
      if (err.name === "TOKEN_EXPIRED") {
        return handleHttpError(res, "TOKEN_EXPIRED", 498);
      }
      return handleHttpError(res, "TOKEN_INVALID", 401);
    }
    const userId = dataToken._id;
    if (!userId) {
      handleHttpError(res, "ERROR_ID_TOKEN", 401);
      return;
    }
    // Inyecta el usuario en la petición para usarlo en los controladores
    const user = await usersModel.findById(userId)
    req.user = user
    next()
  } catch (err) {
    handleHttpError(res, "NOT_SESSION", 401)
  }
}

module.exports = authMiddleware
