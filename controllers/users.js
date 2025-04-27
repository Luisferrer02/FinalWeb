// controllers/users.js

const { encrypt, compare } = require("../utils/handlePassword");
const { usersModel } = require("../models");
const { matchedData } = require("express-validator");
const { handleHttpError } = require("../utils/handleError");
const { sendEmail } = require("../utils/handleMails");
const { v4: uuidv4 } = require("uuid");

/**
 * Obtener todos los usuarios
 */
const getUsers = async (req, res) => {
  try {
    const data = await usersModel.find({});
    res.json({ data });
  } catch (err) {
    console.error("Error al obtener usuarios:", err);
    return handleHttpError(res, "ERROR_GET_USERS", 500);
  }
};

/**
 * Obtener un usuario por ID
 */
const getUser = async (req, res) => {
  try {
    const { id } = matchedData(req);
    const data = await usersModel.findById(id);
    if (!data) return handleHttpError(res, "USER_NOT_FOUND", 404);
    res.json(data);
  } catch (err) {
    console.error("Error al obtener usuario:", err);
    return handleHttpError(res, "ERROR_GET_USER", 500);
  }
};

/**
 * Actualizar datos de un usuario
 */
const updateUser = async (req, res) => {
  try {
    const { id, ...body } = matchedData(req);
    const data = await usersModel.findOneAndUpdate({ _id: id }, body, { new: true });
    if (!data) return handleHttpError(res, "USER_NOT_FOUND", 404);
    res.json({ message: "Usuario actualizado con éxito", data });
  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    return handleHttpError(res, "ERROR_UPDATE_USER", 500);
  }
};

/**
 * Eliminar usuario (soft o hard)
 */
const deleteUser = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);

    const soft = req.query.soft !== "false";
    if (soft) {
      user.deleted = true;
      await user.save();
      return res.json({ message: "Usuario eliminado (soft delete) con éxito" });
    } else {
      await usersModel.deleteOne({ _id: user._id });
      return res.json({ message: "Usuario eliminado (hard delete) con éxito" });
    }
  } catch (err) {
    console.error("Error al eliminar usuario:", err);
    return handleHttpError(res, "ERROR_DELETE_USER", 500);
  }
};

/**
 * Cambiar rol de usuario (sólo admin)
 */
const updateUserRoleCtrl = async (req, res) => {
  try {
    const { id, role } = matchedData(req);
    const updatedUser = await usersModel.findByIdAndUpdate(id, { role }, { new: true });
    if (!updatedUser) return handleHttpError(res, "USER_NOT_FOUND", 404);
    res.json(updatedUser);
  } catch (err) {
    console.error("Error al actualizar rol:", err);
    return handleHttpError(res, "ERROR_UPDATE_USER_ROLE", 500);
  }
};

/**
 * Generar y enviar código de recuperación de contraseña (hash)
 */
const recoverPasswordCodeCtrl = async (req, res) => {
  try {
    const { email, from } = matchedData(req);
    const user = await usersModel.findOne({ email });
    if (!user) return handleHttpError(res, "USER_NOT_EXISTS", 404);

    // Generar código, almacenar hash y timestamp
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordRecoveryCodeHash = await encrypt(rawCode, 6);
    user.passwordRecoveryCodeSentAt = Date.now();
    await user.save();

    const emailOptions = {
      from: from || process.env.EMAIL,
      to: email,
      subject: "Código para Cambio de Contraseña",
      text: `Tu código de recuperación es: ${rawCode}`
    };
    await sendEmail(emailOptions);

    res.json({ message: "Código de recuperación enviado al correo del usuario" });
  } catch (err) {
    console.error("Error en recoverPasswordCodeCtrl:", err);
    return handleHttpError(res, "ERROR_RECOVER_PASSWORD", 500);
  }
};

/**
 * Cambiar contraseña usando código de recuperación (hash)
 */
const changePasswordCtrl = async (req, res) => {
  try {
    const { email, recoveryCode, newPassword } = matchedData(req);
    const user = await usersModel.findOne({ email }).select("+passwordRecoveryCodeHash +passwordRecoveryCodeSentAt");    if (!user) return handleHttpError(res, "USER_NOT_EXISTS", 404);

    const validCode = await compare(recoveryCode, user.passwordRecoveryCodeHash);
    if (!validCode) return handleHttpError(res, "INVALID_RECOVERY_CODE", 400);

    // Actualizar contraseña y limpiar campos de recuperación
    user.password = await encrypt(newPassword);
    user.passwordRecoveryCodeHash = null;
    user.passwordRecoveryCodeSentAt = null;
    await user.save();

    const emailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Confirmación de Cambio de Contraseña",
      text: "Tu contraseña se ha actualizado exitosamente."
    };
    await sendEmail(emailOptions);

    res.json({ message: "Contraseña actualizada exitosamente" });
  } catch (err) {
    console.error("Error en changePasswordCtrl:", err);
    return handleHttpError(res, "ERROR_CHANGE_PASSWORD", 500);
  }
};

/**
 * Verificar email con código (hash)
 */
// controllers/users.js
const validateEmailCtrl = async (req, res) => {
  try {
    const userId = req.user._id;

    // Volvemos a buscar al usuario trayendo el hash
    const user = await usersModel
      .findById(userId)
      .select("+emailVerificationCodeHash +emailVerificationCodeSentAt");

    if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);

    const { code } = matchedData(req);

    // Comprueba que existan código y hash
    if (!user.emailVerificationCodeHash) {
      return handleHttpError(res, "NO_VERIFICATION_CODE_SENT", 400);
    }

    // Compara el código con el hash
    const valid = await compare(code, user.emailVerificationCodeHash);
    if (!valid) {
      user.emailVerificationAttempts++;
      await user.save();
      return handleHttpError(res, "INVALID_CODE", 400);
    }

    // Si es válido, marcamos como verificado y limpiamos campos
    user.isEmailVerified = true;
    user.status = "active";
    user.emailVerificationCodeHash = null;
    user.emailVerificationCodeSentAt = null;
    user.emailVerificationAttempts = 0;
    await user.save();

    res.json({ message: "Email verificado correctamente" });
  } catch (err) {
    console.error("Error en validateEmailCtrl:", err);
    return handleHttpError(res, "ERROR_VERIFY_EMAIL", 500);
  }
};


/**
 * Completar datos personales tras registro
 */
const onboardingPersonalCtrl = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);

    const { name, lastName, nif } = matchedData(req);
    user.name = name;
    user.lastName = lastName;
    user.nif = nif;
    await user.save();

    res.json({ message: "Datos personales actualizados", user });
  } catch (err) {
    console.error("Error en onboardingPersonalCtrl:", err);
    return handleHttpError(res, "ERROR_UPDATE_USER", 500);
  }
};

/**
 * Completar datos de la compañía tras registro
 */
const onboardingCompanyCtrl = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);

    const { companyName, cif, address } = matchedData(req);
    user.company = { companyName, cif, address };
    await user.save();

    res.json({ message: "Datos de la compañía actualizados", company: user.company });
  } catch (err) {
    console.error("Error en onboardingCompanyCtrl:", err);
    return handleHttpError(res, "ERROR_UPDATE_COMPANY", 500);
  }
};

/**
 * Actualizar logo de usuario
 */
const updateLogoCtrl = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);
    if (!req.file) return handleHttpError(res, "NO_FILE_UPLOADED", 400);

    // multer ya limita tamaño y tipo
    const { uploadToPinata } = require("../utils/handleUploadIPFS");
    const pinataRes = await uploadToPinata(req.file.buffer, req.file.originalname);
    const logoUrl = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${pinataRes.IpfsHash}`;

    user.logo = logoUrl;
    await user.save();

    res.json({ message: "Logo actualizado correctamente", logo: logoUrl });
  } catch (err) {
    console.error("Error en updateLogoCtrl:", err);
    return handleHttpError(res, "ERROR_UPDATE_LOGO", 500);
  }
};

/**
 * Devolver datos del usuario logueado (por token)
 */
const getUserByTokenCtrl = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);
    res.json({ user });
  } catch (err) {
    console.error("Error en getUserByTokenCtrl:", err);
    return handleHttpError(res, "ERROR_GET_USER", 500);
  }
};

/**
 * Invitar usuario con token de un solo uso
 */
const inviteUserCtrl = async (req, res) => {
  try {
    const inviter = req.user;
    if (!inviter) return handleHttpError(res, "USER_NOT_FOUND", 404);

    const { email } = matchedData(req);
    let invitedUser = await usersModel.findOne({ email });
    if (invitedUser) return handleHttpError(res, "USER_ALREADY_EXISTS", 409);

    invitedUser = await usersModel.create({ email, role: "guest", status: "pending" });

    const inviteToken = uuidv4();
    console.log(`→ Invite token for ${email}:`, inviteToken); //Para ver el token por consola (si no se necesita un frontend con un link funcional)
    invitedUser.inviteTokenHash = await encrypt(inviteToken, 6);
    invitedUser.inviteSentAt = Date.now();
    await invitedUser.save();

    const acceptUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;
    const emailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Invitación para unirse a la plataforma",
      text: `Has sido invitado. Completa tu registro aquí:\n${acceptUrl}`
    };
    await sendEmail(emailOptions);

    res.json({ message: "Invitación enviada correctamente" });
  } catch (err) {
    console.error("Error en inviteUserCtrl:", err);
    return handleHttpError(res, "ERROR_INVITE_USER", 500);
  }
};

const acceptInviteCtrl = async (req, res) => {
  try {
    const { token, name, lastName, email, password } = matchedData(req);

    // Buscamos al usuario creado en inviteUserCtrl (inviteTokenHash no se selecciona por defecto)
    const user = await usersModel
      .findOne({ email })
      .select('+inviteTokenHash +inviteSentAt');

    if (!user) return handleHttpError(res, 'USER_NOT_FOUND', 404);

    // Comprobamos caducidad (p. ej. 48h)
    const expired = Date.now() - user.inviteSentAt.getTime() > 1000 * 60 * 60 * 48;
    if (expired) return handleHttpError(res, 'INVITE_EXPIRED', 400);

    // Verificamos token
    const valid = await compare(token, user.inviteTokenHash);
    if (!valid) return handleHttpError(res, 'INVALID_INVITE_TOKEN', 400);

    // Actualizamos datos del usuario
    user.name = name;
    user.lastName = lastName || '';
    user.password = await encrypt(password);
    user.status = 'active';
    user.inviteTokenHash = null;
    user.inviteSentAt = null;
    await user.save();

    res.json({ message: 'Invitación aceptada. Usuario activo.' });
  } catch (err) {
    console.error('Error en acceptInviteCtrl:', err);
    return handleHttpError(res, 'ERROR_ACCEPT_INVITE', 500);
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateUserRoleCtrl,
  recoverPasswordCodeCtrl,
  changePasswordCtrl,
  validateEmailCtrl,
  onboardingPersonalCtrl,
  onboardingCompanyCtrl,
  updateLogoCtrl,
  getUserByTokenCtrl,
  inviteUserCtrl,
  acceptInviteCtrl
};
