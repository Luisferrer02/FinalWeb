//utils/handleJwt.js

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const tokenSign = (user) => {
  const sign = jwt.sign(
    {
      _id: user._id,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
  return sign;
};

const verifyToken = (tokenJwt) => {
  try {
    return jwt.verify(tokenJwt, JWT_SECRET);
  } catch (err) {
    // Lanzamos un error con nombre diferenciado
    if (err.name === "TokenExpiredError") {
      const e = new Error("TOKEN_EXPIRED");
      e.name = "TOKEN_EXPIRED";
      throw e;
    } else {
      const e = new Error("TOKEN_INVALID");
      e.name = "TOKEN_INVALID";
      throw e;
    }
  }
};

module.exports = { tokenSign, verifyToken };
