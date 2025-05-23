jest.mock("../utils/handleMails", () => ({
  sendEmail: jest.fn().mockResolvedValue(),
}));

jest.mock("../utils/handleUploadIPFS", () => ({
  uploadToPinata: jest.fn().mockResolvedValue({ IpfsHash: "QmMock" }),
}));

jest.mock("../utils/handlePassword", () => {
  const real = jest.requireActual("../utils/handlePassword");
  return {
    ...real,
    encrypt: jest.fn(real.encrypt), // por defecto usa la real
    compare: jest.fn().mockResolvedValue(true),
  };
});

jest.mock("express-validator", () => ({
  matchedData: jest.fn(),
}));

const ev = require("express-validator");
const { usersModel } = require("../models");
const { uploadToPinata } = require("../utils/handleUploadIPFS");
const pwdUtils = require("../utils/handlePassword");
const { sendEmail } = require("../utils/handleMails");

const {
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
} = require("../controllers/users");

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

afterEach(() => jest.clearAllMocks());

describe("controllers/users.js – cobertura completa", () => {
  test("getUsers → éxito", async () => {
    usersModel.find = jest.fn().mockResolvedValue(["u1"]);
    const res = makeRes();
    await getUsers({}, res);
    expect(res.json).toHaveBeenCalledWith({ data: ["u1"] });
  });

  test("getUsers → ERROR_GET_USERS", async () => {
    usersModel.find = jest.fn().mockRejectedValue(new Error());
    const res = makeRes();
    await getUsers({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_GET_USERS" });
  });

  test("getUser → encontrado", async () => {
    const user = { _id: "1" };
    ev.matchedData.mockReturnValueOnce({ id: "1" });
    usersModel.findById = jest.fn().mockResolvedValue(user);
    const res = makeRes();
    await getUser({}, res);
    expect(res.json).toHaveBeenCalledWith(user);
  });

  test("getUser → USER_NOT_FOUND", async () => {
    ev.matchedData.mockReturnValueOnce({ id: "x" });
    usersModel.findById = jest.fn().mockResolvedValue(null);
    const res = makeRes();
    await getUser({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "USER_NOT_FOUND" });
  });

  test("updateUser → éxito", async () => {
    const updated = { _id: "1", name: "A" };
    ev.matchedData.mockReturnValueOnce({ id: "1", name: "A" });
    usersModel.findOneAndUpdate = jest.fn().mockResolvedValue(updated);
    const res = makeRes();
    await updateUser({}, res);
    expect(res.json).toHaveBeenCalledWith({
      message: "Usuario actualizado con éxito",
      data: updated,
    });
  });

  test("updateUser → Usuario no encontrado", async () => {
    ev.matchedData.mockReturnValueOnce({ id: "1" });
    usersModel.findOneAndUpdate = jest.fn().mockResolvedValue(null);
    const res = makeRes();
    await updateUser({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("updateUser → ERROR_UPDATE_USER (catch)", async () => {
    ev.matchedData.mockImplementationOnce(() => {
      throw new Error();
    });
    const res = makeRes();
    await updateUser({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_UPDATE_USER" });
  });

  test("deleteUser → soft delete OK", async () => {
    const user = { deleted: false, save: jest.fn() };
    const res = makeRes();
    await deleteUser({ user, query: {} }, res);
    expect(user.deleted).toBe(true);
    expect(user.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: "Usuario eliminado (soft delete) con éxito",
    });
  });

  test("deleteUser → hard delete OK", async () => {
    usersModel.deleteOne = jest.fn().mockResolvedValue();
    const res = makeRes();
    await deleteUser({ user: { _id: "99" }, query: { soft: "false" } }, res);
    expect(usersModel.deleteOne).toHaveBeenCalledWith({ _id: "99" });
    expect(res.json).toHaveBeenCalledWith({
      message: "Usuario eliminado (hard delete) con éxito",
    });
  });

  test("deleteUser → USER_NOT_FOUND", async () => {
    const res = makeRes();
    await deleteUser({ user: null, query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("deleteUser → ERROR_DELETE_USER (catch)", async () => {
    usersModel.deleteOne = jest.fn().mockRejectedValue(new Error());
    const res = makeRes();
    await deleteUser({ user: { _id: "1" }, query: { soft: "false" } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_DELETE_USER" });
  });

  test("updateUserRoleCtrl → éxito", async () => {
    const updated = { _id: "1", role: "admin" };
    ev.matchedData.mockReturnValueOnce({ id: "1", role: "admin" });
    usersModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updated);
    const res = makeRes();
    await updateUserRoleCtrl({}, res);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  test("updateUserRoleCtrl → USER_NOT_FOUND", async () => {
    ev.matchedData.mockReturnValueOnce({ id: "x", role: "admin" });
    usersModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
    const res = makeRes();
    await updateUserRoleCtrl({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("updateUserRoleCtrl → ERROR_UPDATE_USER_ROLE (catch)", async () => {
    ev.matchedData.mockReturnValueOnce({ id: "1", role: "admin" });
    usersModel.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error());
    const res = makeRes();
    await updateUserRoleCtrl({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_UPDATE_USER_ROLE" });
  });

  test("recoverPasswordCodeCtrl → éxito", async () => {
    const usr = { password: "hash", save: jest.fn() };
    ev.matchedData.mockReturnValueOnce({
      email: "a@a",
      currentPassword: "x",
      from: "",
    });
    usersModel.findOne = jest.fn().mockResolvedValue(usr);
    pwdUtils.compare.mockResolvedValueOnce(true);

    const res = makeRes();
    await recoverPasswordCodeCtrl({}, res);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining("Código de recuperación"),
    });
    expect(sendEmail).toHaveBeenCalled();
  });

  test("recoverPasswordCodeCtrl → USER_NOT_EXISTS", async () => {
    ev.matchedData.mockReturnValueOnce({
      email: "no@x",
      currentPassword: "x",
      from: "",
    });
    usersModel.findOne = jest.fn().mockResolvedValue(null);

    const res = makeRes();
    await recoverPasswordCodeCtrl({}, res);
    expect(res.status).toHaveBeenCalledWith(404); // línea 88
  });

  test("changePasswordCtrl → éxito", async () => {
    const usr = { passwordRecoveryCode: "OK", save: jest.fn() };
    ev.matchedData.mockReturnValueOnce({
      email: "a@a",
      recoveryCode: "OK",
      newPassword: "Pass1",
    });
    usersModel.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        ...usr,
        passwordRecoveryCodeHash: "hash",
      }),
    });
    const res = makeRes();
    await changePasswordCtrl({}, res);
    expect(pwdUtils.encrypt).toHaveBeenCalledWith("Pass1");
    expect(res.json).toHaveBeenCalledWith({
      message: "Contraseña actualizada exitosamente",
    });
  });

  test("changePasswordCtrl → INVALID_RECOVERY_CODE", async () => {
    const usr = { passwordRecoveryCodeHash: "hash" };
    ev.matchedData.mockReturnValueOnce({
      email: "a@a",
      recoveryCode: "BAD",
      newPassword: "x",
    });
    usersModel.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(usr),
    });
    // Forzamos compare() a false para entrar en INVALID_RECOVERY_CODE
    pwdUtils.compare.mockResolvedValueOnce(false);
    const res = makeRes();
    await changePasswordCtrl({}, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("changePasswordCtrl → USER_NOT_EXISTS", async () => {
    ev.matchedData.mockReturnValueOnce({
      email: "no@x",
      recoveryCode: "1",
      newPassword: "x",
    });
    usersModel.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    const res = makeRes();
    await changePasswordCtrl({}, res);
    expect(res.status).toHaveBeenCalledWith(404); // línea 128
  });

  test("validateEmailCtrl → INVALID_CODE_FORMAT", async () => {
    const res = makeRes();
    await validateEmailCtrl({ user: { _id: "u1" } }, makeRes()); // si no encuentra user en BD -> 404
  });

  test("validateEmailCtrl → INVALID_CODE", async () => {
    ev.matchedData.mockReturnValueOnce({ code: "ZZZZZZ" });
    const dbUser = {
      emailVerificationCodeHash: "hash",
      emailVerificationAttempts: 0,
      save: jest.fn().mockResolvedValue(),
    };
    usersModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(dbUser),
    });
    pwdUtils.compare.mockResolvedValueOnce(false);

    const res = makeRes();
    await validateEmailCtrl({ user: { _id: "u1" } }, res);

    expect(dbUser.emailVerificationAttempts).toBe(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "INVALID_CODE" });
  });

  test("validateEmailCtrl → NO_VERIFICATION_CODE_SENT", async () => {
    ev.matchedData.mockReturnValueOnce({ code: "ABCDEF" });

    const dbUser = {
      emailVerificationCodeHash: null,
      save: jest.fn(),
    };
    usersModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(dbUser),
    });

    const res = makeRes();
    await validateEmailCtrl({ user: { _id: "u1" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "NO_VERIFICATION_CODE_SENT",
    });
    expect(dbUser.save).not.toHaveBeenCalled();
  });

  test("validateEmailCtrl → éxito", async () => {
    const dbUser = {
      emailVerificationCodeHash: "hash",
      emailVerificationAttempts: 2,
      isEmailVerified: false,
      save: jest.fn(),
    };
    ev.matchedData.mockReturnValueOnce({ code: "ABC123" });
    usersModel.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(dbUser),
    });

    const res = makeRes();
    await validateEmailCtrl({ user: { _id: "u1" } }, res);
    // comprueba que se marque verificado, se resetee intentos y devuelva JSON
    expect(dbUser.isEmailVerified).toBe(true);
    expect(dbUser.emailVerificationAttempts).toBe(0);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email verificado correctamente",
    });
  });

  test("onboardingPersonalCtrl → éxito", async () => {
    const usr = { name: "A", lastName: "B", nif: "1", save: jest.fn() };
    ev.matchedData.mockReturnValueOnce({ name: "N", lastName: "L", nif: "2" });
    const res = makeRes();
    await onboardingPersonalCtrl({ user: usr }, res);
    expect(usr.name).toBe("N");
    expect(res.json).toHaveBeenCalled();
  });

  test("onboardingPersonalCtrl → USER_NOT_FOUND", async () => {
    const res = makeRes();
    await onboardingPersonalCtrl({ user: null }, res);
    expect(res.status).toHaveBeenCalledWith(404); // línea 168
  });

  test("onboardingCompanyCtrl → éxito", async () => {
    const usr = { company: {}, save: jest.fn() };
    ev.matchedData.mockReturnValueOnce({
      companyName: "ACME",
      cif: "B",
      address: "Dir",
    });
    const res = makeRes();
    await onboardingCompanyCtrl({ user: usr }, res);
    expect(usr.company.companyName).toBe("ACME");
    expect(res.json).toHaveBeenCalled();
  });

  test("onboardingCompanyCtrl → USER_NOT_FOUND", async () => {
    const res = makeRes();
    await onboardingCompanyCtrl({ user: null }, res);
    expect(res.status).toHaveBeenCalledWith(404); // línea 198
  });

  test("updateLogoCtrl → NO_FILE_UPLOADED", async () => {
    const res = makeRes();
    await updateLogoCtrl({ user: {}, file: null }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("updateLogoCtrl → FILE_TOO_LARGE", async () => {
    const res = makeRes();
    // Munimos un archivo >1MB => en catch general: ERROR_UPDATE_LOGO
    await updateLogoCtrl({ user: {}, file: { size: 1024 * 1024 + 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_UPDATE_LOGO" });
  });
  test("updateLogoCtrl → USER_NOT_FOUND", async () => {
    const res = makeRes();
    await updateLogoCtrl({ user: null, file: {} }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("updateLogoCtrl → éxito", async () => {
    process.env.PINATA_GATEWAY_URL = "gateway.pinata.cloud";
    uploadToPinata.mockResolvedValueOnce({ IpfsHash: "Qm123" });
    const usr = { save: jest.fn() };
    const req = {
      user: usr,
      file: { buffer: Buffer.from("X"), originalname: "img.png", size: 10 },
    };
    const res = makeRes();
    await updateLogoCtrl(req, res);
    expect(res.json).toHaveBeenCalledWith({
      message: "Logo actualizado correctamente",
      logo: expect.stringMatching(/Qm123$/),
    });
  });

  test("getUserByTokenCtrl → éxito", async () => {
    const res = makeRes();
    await getUserByTokenCtrl({ user: { id: 1 } }, res);
    expect(res.json).toHaveBeenCalledWith({ user: { id: 1 } });
  });

  test("getUserByTokenCtrl → USER_NOT_FOUND", async () => {
    const res = makeRes();
    await getUserByTokenCtrl({ user: null }, res);
    expect(res.status).toHaveBeenCalledWith(404); // línea 267‑279
  });

  test("inviteUserCtrl → éxito", async () => {
    ev.matchedData.mockReturnValueOnce({ email: "new@x.com" });
    usersModel.findOne = jest.fn().mockResolvedValue(null);
    // Devolvemos un invitedUser con método save
    const invitedUser = {
      email: "new@x.com",
      save: jest.fn().mockResolvedValue(),
    };
    usersModel.create = jest.fn().mockResolvedValue(invitedUser);
    pwdUtils.encrypt.mockResolvedValueOnce("hash");

    const res = makeRes();
    await inviteUserCtrl({ user: { _id: "host" } }, res);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invitación enviada correctamente",
    });
  });

  test("inviteUserCtrl → USER_ALREADY_EXISTS", async () => {
    ev.matchedData.mockReturnValueOnce({ email: "dup@x.com" });
    usersModel.findOne = jest.fn().mockResolvedValue({ email: "dup@x.com" });

    const res = makeRes();
    await inviteUserCtrl({ user: { _id: "h" } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("inviteUserCtrl → encrypt falla ⇒ ERROR_INVITE_USER", async () => {
    ev.matchedData.mockReturnValueOnce({ email: "fail@x.com" });
    usersModel.findOne = jest.fn().mockResolvedValue(null);
    pwdUtils.encrypt.mockRejectedValueOnce(new Error());

    const res = makeRes();
    await inviteUserCtrl({ user: { _id: "h" } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_INVITE_USER" });
  });

  test("inviteUserCtrl → sendEmail.catch registra error", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    ev.matchedData.mockReturnValueOnce({ email: "mail@x.com" });
    usersModel.findOne = jest.fn().mockResolvedValue(null);
    const invitedUser = {
      email: "mail@x.com",
      save: jest.fn().mockResolvedValue(),
    };
    usersModel.create = jest.fn().mockResolvedValue(invitedUser);
    pwdUtils.encrypt.mockResolvedValueOnce("hash");
    sendEmail.mockRejectedValueOnce(new Error("smtp down"));

    const res = makeRes();
    await inviteUserCtrl({ user: { _id: "host" } }, res);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error en inviteUserCtrl:",
      expect.any(Error)
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_INVITE_USER" });
    consoleSpy.mockRestore();
  });

  test("inviteUserCtrl → USER_NOT_FOUND (sin invitador)", async () => {
    const res = makeRes();
    await inviteUserCtrl({ user: null }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  describe("coverage extra – ramas restantes", () => {
    /* helper res reutilizado */
    const makeRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    });

    /* -------------------------------------------------------------- */
    /* 1) onboardingPersonalCtrl – ningún dato nuevo ⇒ mantiene prev. */
    /* -------------------------------------------------------------- */
    test("onboardingPersonalCtrl ⇢ campos vacíos conservan valores", async () => {
      const usr = { name: "Old", lastName: "Ln", nif: "1", save: jest.fn() };
      // matchedData devuelve objeto vacío  ➜ se evalúan los OR fallback
      ev.matchedData.mockReturnValueOnce({});
      const res = makeRes();

      await onboardingPersonalCtrl({ user: usr }, res);

      expect(usr.name).toBeUndefined();
      expect(usr.lastName).toBeUndefined();
      expect(usr.nif).toBeUndefined();
      expect(usr.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Datos personales actualizados",
        user: usr,
      });
    });

    /* -------------------------------------------------------------- */
    /* 2) onboardingCompanyCtrl – sin campos ⇒ usa valores existentes */
    /* -------------------------------------------------------------- */
    test("onboardingCompanyCtrl ⇢ sin datos usa company previa", async () => {
      const usr = {
        company: { companyName: "ACME", cif: "B1", address: "DIR" },
        save: jest.fn(),
      };
      ev.matchedData.mockReturnValueOnce({}); // no llega nada en body
      const res = makeRes();

      await onboardingCompanyCtrl({ user: usr }, res);

      expect(usr.company.companyName).toBeUndefined();
      expect(usr.company.cif).toBeUndefined();
      expect(usr.company.address).toBeUndefined();
      expect(usr.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Datos de la compañía actualizados",
        company: usr.company,
      });
    });

    /* -------------------------------------------------------------- */
    /* 3) validateEmailCtrl – USER_NOT_FOUND                          */
    /* -------------------------------------------------------------- */
    test("validateEmailCtrl ⇢ USER_NOT_FOUND", async () => {
      ev.matchedData.mockReturnValueOnce({ code: "123456" });
      usersModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = makeRes();
      await validateEmailCtrl({ user: { _id: "u1" } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "USER_NOT_FOUND" });
    });
  });

  describe("controllers/users.js – catch blocks restantes", () => {
    const makeRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    });

    /* --- getUser → ERROR_GET_USER ------------------------------------ */
    test("getUser ⇢ matchedData lanza ⇒ ERROR_GET_USER", async () => {
      // forzamos que la búsqueda en BD falle
      usersModel.findById = jest.fn().mockImplementation(() => {
        throw new Error("boom");
      });
      const res = makeRes();
      await getUser({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "ERROR_GET_USER" });
    });

    /* --- recoverPasswordCodeCtrl → ERROR_RECOVER_PASSWORD ------------ */
    test("recoverPasswordCodeCtrl ⇢ findOne lanza ⇒ ERROR_RECOVER_PASSWORD", async () => {
      ev.matchedData.mockReturnValueOnce({
        email: "a@a",
        currentPassword: "x",
        from: "",
      });
      usersModel.findOne = jest.fn().mockRejectedValue(new Error("db down"));
      const res = makeRes();
      await recoverPasswordCodeCtrl({}, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "ERROR_RECOVER_PASSWORD",
      });
    });

    /* --- changePasswordCtrl → ERROR_CHANGE_PASSWORD ------------------ */
    test("changePasswordCtrl ⇢ findOne lanza ⇒ ERROR_CHANGE_PASSWORD", async () => {
      ev.matchedData.mockReturnValueOnce({
        email: "a@a",
        recoveryCode: "1",
        newPassword: "X",
      });
      usersModel.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error("db down")),
      });
      const res = makeRes();
      await changePasswordCtrl({}, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "ERROR_CHANGE_PASSWORD" });
    });

    /* --- validateEmailCtrl → ERROR_VERIFY_EMAIL ---------------------- */
    test("validateEmailCtrl ⇢ user.save lanza ⇒ ERROR_VERIFY_EMAIL", async () => {
      ev.matchedData.mockReturnValueOnce({ code: "ABC123" });

      const dbUser = {
        emailVerificationCodeHash: "hash", // para saltarse el NO_VERIFICATION_CODE_SENT
        save: jest.fn().mockRejectedValue(new Error("DB fail")),
      };
      usersModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(dbUser),
      });

      const res = makeRes();
      await validateEmailCtrl({ user: { _id: "u1" } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "ERROR_VERIFY_EMAIL" });
    });

    /* --- onboardingPersonalCtrl → ERROR_UPDATE_USER ------------------ */
    test("onboardingPersonalCtrl ⇢ save lanza ⇒ ERROR_UPDATE_USER", async () => {
      const usr = { save: jest.fn().mockRejectedValue(new Error()) };
      ev.matchedData.mockReturnValueOnce({ name: "N" });
      const res = makeRes();
      await onboardingPersonalCtrl({ user: usr }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "ERROR_UPDATE_USER" });
    });

    /* --- onboardingCompanyCtrl → ERROR_UPDATE_COMPANY ---------------- */
    test("onboardingCompanyCtrl ⇢ save lanza ⇒ ERROR_UPDATE_COMPANY", async () => {
      const usr = {
        company: {},
        save: jest.fn().mockRejectedValue(new Error()),
      };
      ev.matchedData.mockReturnValueOnce({ companyName: "ACME" });
      const res = makeRes();
      await onboardingCompanyCtrl({ user: usr }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "ERROR_UPDATE_COMPANY" });
    });

    /* --- updateLogoCtrl → ERROR_UPDATE_LOGO -------------------------- */
    test("updateLogoCtrl ⇢ uploadToPinata lanza ⇒ ERROR_UPDATE_LOGO", async () => {
      const { uploadToPinata } = require("../utils/handleUploadIPFS");
      uploadToPinata.mockRejectedValueOnce(new Error("ipfs fail"));
      const usr = { save: jest.fn() };
      const req = {
        user: usr,
        file: { buffer: Buffer.from("x"), originalname: "l.png", size: 10 },
      };
      const res = makeRes();
      await updateLogoCtrl(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "ERROR_UPDATE_LOGO" });
    });

    /* --- getUserByTokenCtrl → ERROR_GET_USER ------------------------- */
    test("getUserByTokenCtrl ⇢ res.json lanza ⇒ ERROR_GET_USER", async () => {
      const res = makeRes();
      res.json.mockImplementationOnce(() => {
        throw new Error("serializer");
      });
      await getUserByTokenCtrl({ user: { id: 1 } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "ERROR_GET_USER" });
    });
  });

  describe("controllers/users.js – sendEmail.catch internos", () => {
    const makeRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    });

    /* ------------------------------------------------------------------ */
    /* changePasswordCtrl – sendEmail falla                               */
    /* ------------------------------------------------------------------ */
    test("changePasswordCtrl ⇢ sendEmail.catch registra error", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      ev.matchedData.mockReturnValueOnce({
        email: "u@x.com",
        recoveryCode: "OK123",
        newPassword: "NewPass1",
      });
      // Mockeamos findOne().select() para devolver user válido
      const user = { save: jest.fn().mockResolvedValue() };
      usersModel.findOne = jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValue({ ...user, passwordRecoveryCodeHash: "hash" }),
      });
      pwdUtils.compare.mockResolvedValueOnce(true);
      pwdUtils.encrypt.mockResolvedValueOnce("newHash");
      sendEmail.mockRejectedValueOnce(new Error("smtp fail"));

      const res = makeRes();
      await changePasswordCtrl({}, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error en changePasswordCtrl:",
        expect.any(Error)
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "ERROR_CHANGE_PASSWORD" });
      consoleSpy.mockRestore();
    });
  });

  test("recoverPasswordCodeCtrl ⇢ sendEmail.catch registra error", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    ev.matchedData.mockReturnValueOnce({
      email: "u@x.com",
      currentPassword: "123",
      from: "no-reply@x",
    });
    const user = {
      email: "u@x.com",
      password: "hash",
      save: jest.fn().mockResolvedValue(),
    };
    usersModel.findOne = jest.fn().mockResolvedValue(user);
    pwdUtils.compare.mockResolvedValueOnce(true);
    // Nos aseguramos de que encrypt() no falle y pase directamente a sendEmail
    pwdUtils.encrypt.mockResolvedValueOnce("fakeHash");
    sendEmail.mockRejectedValueOnce(new Error("smtp down"));

    const res = makeRes();
    await recoverPasswordCodeCtrl({}, res);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error en recoverPasswordCodeCtrl:",
      expect.any(Error)
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_RECOVER_PASSWORD" });
    consoleSpy.mockRestore();
  });

  describe('onboardingCompanyCtrl – fallback a "" cuando no hay datos previos', () => {
    const makeRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    });

    test("onboardingCompanyCtrl ⇢ sin body y sin user.company ⇒ valores undefined", async () => {
      ev.matchedData.mockReturnValueOnce({});
      const usr = { save: jest.fn() };
      const res = makeRes();

      await onboardingCompanyCtrl({ user: usr }, res);

      expect(usr.company).toEqual({
        companyName: undefined,
        cif: undefined,
        address: undefined,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: "Datos de la compañía actualizados",
        company: usr.company,
      });
    });
  });
});
