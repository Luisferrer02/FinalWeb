//controllers/auth.js
const { matchedData } = require("express-validator");
const { tokenSign } = require("../utils/handleJwt");
const { encrypt, compare } = require("../utils/handlePassword");
const { handleHttpError } = require("../utils/handleError");
const { usersModel } = require("../models");
const { sendEmail } = require("../utils/handleMails");

const registerCtrl = async (req, res) => {
  try {
    // Obtiene los datos ya validados
    const data = matchedData(req);

    // Verifica si ya existe el usuario
    const existingUser = await usersModel.findOne({ email: data.email });
    if (existingUser) {
      return handleHttpError(res, "EMAIL_ALREADY_EXISTS", 409);
    }

    const passwordHash = await encrypt(data.password);
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await encrypt(rawCode, 6);

    const newUserData = {
      ...data,
      password: passwordHash,
      isEmailVerified: false,
      emailVerificationCodeHash: codeHash,
      emailVerificationCodeSentAt: Date.now(),
      emailVerificationAttempts: 0,
      status: "pending",
    };
    const dataUser = await usersModel.create(newUserData);
    // Oculta la contraseña en la respuesta
    dataUser.set("password", undefined, { strict: false });

    // Genera el token JWT
    const token = await tokenSign(dataUser);

    // Envía el email de verificación (fire-and-forget)
    const emailOptions = {
      from: process.env.EMAIL,
      to: dataUser.email,
      subject: "Verificación de Email",
      text: `Hola ${dataUser.name}, tu código de verificación es: ${rawCode}`
    };
    sendEmail(emailOptions)
      .then(() => console.log("Email de verificación enviado"))
      .catch((error) => console.error("Error enviando email:", error));

    res.send({
      token,
      user: {
        _id: dataUser._id,
        email: dataUser.email,
        role: dataUser.role,
        isEmailVerified: dataUser.isEmailVerified,
        status: dataUser.status
      }
    });
  } catch (err) {
    console.error(err);
    return handleHttpError(res, "ERROR_REGISTER_USER", 500);
  }
};

const loginCtrl = async (req, res) => {
  try {
    const data = matchedData(req);
    const user = await usersModel.findOne({ email: data.email })
      .select("password name role email isEmailVerified");

    if (!user) return handleHttpError(res, "USER_NOT_EXISTS", 404);
    if (!user.isEmailVerified) return handleHttpError(res, "EMAIL_NOT_VERIFIED", 403);

    const isValid = await compare(data.password, user.password);
    if (!isValid) return handleHttpError(res, "INVALID_PASSWORD", 401);

    // Oculta el password en la respuesta
    user.set("password", undefined, { strict: false });
    const token = await tokenSign(user);
    res.send({ token, user });
  } catch (err) {
    console.error(err);
    return handleHttpError(res, "ERROR_LOGIN_USER", 500);
  }
};

module.exports = { registerCtrl, loginCtrl };
