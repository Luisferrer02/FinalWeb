//controllers/users.js
const { encrypt, compare } = require("../utils/handlePassword");
const { usersModel } = require("../models");
const { matchedData } = require("express-validator");
const { handleHttpError } = require("../utils/handleError");
const { sendEmail } = require("../utils/handleMails");

const getUsers = async (req, res) => {
    try {
      const data = await usersModel.find({});
      res.send({ data });
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
      return handleHttpError(res, "ERROR_GET_USERS", 500);
    }
  };

  const getUser = async (req, res) => {
    try {
      const { id } = matchedData(req);
      const data = await usersModel.findById(id);
      if (!data) return handleHttpError(res, "USER_NOT_FOUND", 404);
      res.send(data);
    } catch (err) {
      console.error("Error al obtener usuario:", err);
      return handleHttpError(res, "ERROR_GET_USER", 500);
    }
  };

  const updateUser = async (req, res) => {
    try {
      const { id, ...body } = matchedData(req);
      const data = await usersModel.findOneAndUpdate({ _id: id }, body, { new: true });
      if (!data) return res.status(404).json({ error: "Usuario no encontrado" });
      res.json({ message: "Usuario actualizado con éxito", data });
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      return handleHttpError(res, "ERROR_UPDATE_USER", 500);
    }
  };

  const deleteUser = async (req, res) => {
    try {
      const user = req.user;
      if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);
      
      const softDelete = req.query.soft !== "false"; // soft por defecto
      if (softDelete) {
        user.deleted = true;
        await user.save();
        return res.json({ message: "Usuario eliminado (soft delete) con éxito" });
      } else {
        await usersModel.deleteOne({ _id: user._id });
        return res.json({ message: "Usuario eliminado (hard delete) con éxito" });
      }
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      return handleHttpError(res, "ERROR_DELETE_USER", 500);
    }
  };
  

  const updateUserRoleCtrl = async (req, res) => {
    try {
      const { id, role } = matchedData(req);
      const updatedUser = await usersModel.findByIdAndUpdate(id, { role }, { new: true });
      if (!updatedUser) return handleHttpError(res, "USER_NOT_FOUND", 404);
      res.send(updatedUser);
    } catch (err) {
      console.error("Error al actualizar rol:", err);
      return handleHttpError(res, "ERROR_UPDATE_USER_ROLE", 500);
    }
  };

  const recoverPasswordCodeCtrl = async (req, res) => {
    try {
      const { email, currentPassword, from } = matchedData(req);
      const user = await usersModel.findOne({ email });
      if (!user) return handleHttpError(res, "USER_NOT_EXISTS", 404);
  
      const validPass = await compare(currentPassword, user.password);
      if (!validPass) return handleHttpError(res, "INVALID_PASSWORD", 401);
  
      const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.passwordRecoveryCode = recoveryCode;
      await user.save();
      
      console.log(`Código de recuperación generado para ${email}: ${recoveryCode}`);
      
      const emailOptions = {
        from: from || process.env.EMAIL,
        to: email,
        subject: "Código para Cambio de Contraseña",
        text: `Tu código de recuperación es: ${recoveryCode}`
      };
      sendEmail(emailOptions)
        .then(() => console.log("Email de recuperación enviado"))
        .catch((error) => console.error("Error enviando email de recuperación:", error));
      
      res.json({ message: "Código de recuperación enviado al correo del usuario" });
    } catch (error) {
      console.error("Error en recoverPasswordCodeCtrl:", error);
      return handleHttpError(res, "ERROR_RECOVER_PASSWORD", 500);
    }
  };

  const changePasswordCtrl = async (req, res) => {
    try {
      const { email, recoveryCode, newPassword } = matchedData(req);
      const user = await usersModel.findOne({ email });
      if (!user) return handleHttpError(res, "USER_NOT_EXISTS", 404);
      
      if (!user.passwordRecoveryCode || user.passwordRecoveryCode !== recoveryCode) {
        return handleHttpError(res, "INVALID_RECOVERY_CODE", 400);
      }
      
      user.password = await encrypt(newPassword);
      user.passwordRecoveryCode = null;
      await user.save();
      
      console.log(`Contraseña actualizada para ${email}`);
      
      const emailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Confirmación de Cambio de Contraseña",
        text: "Tu contraseña se ha actualizado exitosamente."
      };
      sendEmail(emailOptions)
        .then(() => console.log("Email de confirmación enviado"))
        .catch((error) => console.error("Error enviando email de confirmación:", error));
        
      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      console.error("Error en changePasswordCtrl:", error);
      return handleHttpError(res, "ERROR_CHANGE_PASSWORD", 500);
    }
  };

const validateEmailCtrl = async (req, res) => {
    try {
      const user = req.user;
      if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);
      
      const { code } = req.body;
      if (!code || code.length !== 6) {
        return handleHttpError(res, "INVALID_CODE_FORMAT", 400);
      }
      
      if (user.emailVerificationCode !== code) {
        user.emailVerificationAttempts += 1;
        await user.save();
        return handleHttpError(res, "INVALID_CODE", 400);
      }
      
      user.isEmailVerified = true;
      user.status = "active";
      user.emailVerificationCode = null;
      user.emailVerificationAttempts = 0;
      await user.save();
      
      res.send({ message: "Email verificado correctamente" });
    } catch (error) {
      console.error("Error en validateEmailCtrl:", error);
      return handleHttpError(res, "ERROR_VERIFY_EMAIL", 500);
    }
};
  
const onboardingPersonalCtrl = async (req, res) => {
    try {
      const user = req.user;
      if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);
      
      const { name, lastName, nif } = matchedData(req);
      user.name = name || user.name;
      user.lastName = lastName || user.lastName;
      user.nif = nif || user.nif;
      await user.save();
      res.json({ message: "Datos personales actualizados", user });
    } catch (error) {
      console.error("Error en onboardingPersonalCtrl:", error);
      return handleHttpError(res, "ERROR_UPDATE_USER", 500);
    }
};
  
const onboardingCompanyCtrl = async (req, res) => {
    try {
      const user = req.user;
      if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);
      
      const { companyName, cif, address } = matchedData(req);
      user.company = {
        companyName: companyName || (user.company && user.company.companyName) || "",
        cif: cif || (user.company && user.company.cif) || "",
        address: address || (user.company && user.company.address) || "",
      };
      await user.save();
      res.json({ message: "Datos de la compañía actualizados", company: user.company });
    } catch (error) {
      console.error("Error en onboardingCompanyCtrl:", error);
      return handleHttpError(res, "ERROR_UPDATE_COMPANY", 500);
    }
};

const updateLogoCtrl = async (req, res) => {
    try {
      const user = req.user;
      if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);
      if (!req.file) return handleHttpError(res, "NO_FILE_UPLOADED", 400);
      if (req.file.size > 1024 * 1024) return handleHttpError(res, "FILE_TOO_LARGE", 400);
      
      const { uploadToPinata } = require("../utils/handleUploadIPFS");
      const pinataResponse = await uploadToPinata(req.file.buffer, req.file.originalname);
      const ipfsHash = pinataResponse.IpfsHash;
      const logoUrl = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${ipfsHash}`;
      
      user.logo = logoUrl;
      await user.save();
      
      res.json({ message: "Logo actualizado correctamente", logo: logoUrl });
    } catch (error) {
      console.error("Error en updateLogoCtrl:", error);
      return handleHttpError(res, "ERROR_UPDATE_LOGO", 500);
    }
};

const getUserByTokenCtrl = async (req, res) => {
    try {
      const user = req.user;
      if (!user) return handleHttpError(res, "USER_NOT_FOUND", 404);
      res.json({ user });
    } catch (error) {
      console.error("Error en getUserByTokenCtrl:", error);
      return handleHttpError(res, "ERROR_GET_USER", 500);
    }
  };
  
const inviteUserCtrl = async (req, res) => {
    try {
      const inviter = req.user;
      if (!inviter) return handleHttpError(res, "USER_NOT_FOUND", 404);
      
      const { email } = matchedData(req);
      let invitedUser = await usersModel.findOne({ email });
      if (invitedUser) return handleHttpError(res, "USER_ALREADY_EXISTS", 409);
      
      const preliminaryPassword = await encrypt("1234");
      invitedUser = await usersModel.create({
        email,
        password: preliminaryPassword,
        role: "guest",
        status: "pending"
      });
      
      const emailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Invitación para unirse a la plataforma",
        text: `Has sido invitado a unirte a la plataforma.\nCredenciales:\nEmail: ${email}\nPassword: 1234`
      };
      sendEmail(emailOptions)
        .then(() => console.log("Email de invitación enviado"))
        .catch((error) => console.error("Error enviando email de invitación:", error));
      
      res.json({ message: "Invitación enviada correctamente", invitedUser });
    } catch (error) {
      console.error("Error en inviteUserCtrl:", error);
      return handleHttpError(res, "ERROR_INVITE_USER", 500);
    }
};
  

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateUserRoleCtrl,
  validateEmailCtrl,
  onboardingPersonalCtrl,
  onboardingCompanyCtrl,
  updateLogoCtrl,
  getUserByTokenCtrl,
  inviteUserCtrl,
  recoverPasswordCodeCtrl,
  changePasswordCtrl
};
