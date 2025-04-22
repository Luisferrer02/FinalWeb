/* tests/users.controller.test.js
   Cobertura exhaustiva de controllers/users.js                           */

/* ===================================================================== */
/* 1. MOCKS GLOBALES – se evalúan antes de cargar cualquier módulo       */
/* ===================================================================== */
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

/* ===================================================================== */
/* 2. IMPORTS (con mocks ya activos)                                     */
/* ===================================================================== */
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

/* ===================================================================== */
/* 3. HELPERS                                                            */
/* ===================================================================== */
const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

afterEach(() => jest.clearAllMocks());

/* ===================================================================== */
/* 4. TEST SUITE                                                         */
/* ===================================================================== */
describe("controllers/users.js – cobertura completa", () => {
  /* ------------------------------------------------------------------ */
  /* getUsers                                                            */
  /* ------------------------------------------------------------------ */
  test("getUsers → éxito", async () => {
    usersModel.find = jest.fn().mockResolvedValue(["u1"]);
    const res = makeRes();
    await getUsers({}, res);
    expect(res.send).toHaveBeenCalledWith({ data: ["u1"] });
  });

  test("getUsers → ERROR_GET_USERS", async () => {
    usersModel.find = jest.fn().mockRejectedValue(new Error());
    const res = makeRes();
    await getUsers({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_GET_USERS" });
  });

  /* ------------------------------------------------------------------ */
  /* getUser                                                             */
  /* ------------------------------------------------------------------ */
  test("getUser → encontrado", async () => {
    const user = { _id: "1" };
    ev.matchedData.mockReturnValueOnce({ id: "1" });
    usersModel.findById = jest.fn().mockResolvedValue(user);
    const res = makeRes();
    await getUser({}, res);
    expect(res.send).toHaveBeenCalledWith(user);
  });

  test("getUser → USER_NOT_FOUND", async () => {
    ev.matchedData.mockReturnValueOnce({ id: "x" });
    usersModel.findById = jest.fn().mockResolvedValue(null);
    const res = makeRes();
    await getUser({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "USER_NOT_FOUND" });
  });

  /* ------------------------------------------------------------------ */
  /* updateUser                                                          */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* deleteUser                                                          */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* updateUserRoleCtrl                                                  */
  /* ------------------------------------------------------------------ */
  test("updateUserRoleCtrl → éxito", async () => {
    const updated = { _id: "1", role: "admin" };
    ev.matchedData.mockReturnValueOnce({ id: "1", role: "admin" });
    usersModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updated);
    const res = makeRes();
    await updateUserRoleCtrl({}, res);
    expect(res.send).toHaveBeenCalledWith(updated);
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

  /* ------------------------------------------------------------------ */
  /* recoverPasswordCodeCtrl                                             */
  /* ------------------------------------------------------------------ */
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

  test("recoverPasswordCodeCtrl → INVALID_PASSWORD", async () => {
    ev.matchedData.mockReturnValueOnce({
      email: "a@a",
      currentPassword: "x",
      from: "",
    });
    usersModel.findOne = jest.fn().mockResolvedValue({ password: "hash" });
    pwdUtils.compare.mockResolvedValueOnce(false);

    const res = makeRes();
    await recoverPasswordCodeCtrl({}, res);
    expect(res.status).toHaveBeenCalledWith(401);
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

  /* ------------------------------------------------------------------ */
  /* changePasswordCtrl                                                  */
  /* ------------------------------------------------------------------ */
  test("changePasswordCtrl → éxito", async () => {
    const usr = { passwordRecoveryCode: "OK", save: jest.fn() };
    ev.matchedData.mockReturnValueOnce({
      email: "a@a",
      recoveryCode: "OK",
      newPassword: "Pass1",
    });
    usersModel.findOne = jest.fn().mockResolvedValue(usr);

    const res = makeRes();
    await changePasswordCtrl({}, res);
    expect(pwdUtils.encrypt).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: "Contraseña actualizada exitosamente",
    });
  });

  test("changePasswordCtrl → INVALID_RECOVERY_CODE", async () => {
    const usr = { passwordRecoveryCode: "ABC" };
    ev.matchedData.mockReturnValueOnce({
      email: "a@a",
      recoveryCode: "BAD",
      newPassword: "x",
    });
    usersModel.findOne = jest.fn().mockResolvedValue(usr);

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
    usersModel.findOne = jest.fn().mockResolvedValue(null);

    const res = makeRes();
    await changePasswordCtrl({}, res);
    expect(res.status).toHaveBeenCalledWith(404); // línea 128
  });

  /* ------------------------------------------------------------------ */
  /* validateEmailCtrl                                                   */
  /* ------------------------------------------------------------------ */
  test("validateEmailCtrl → INVALID_CODE_FORMAT", async () => {
    const res = makeRes();
    await validateEmailCtrl({ user: {}, body: { code: "123" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("validateEmailCtrl → INVALID_CODE", async () => {
    const usr = {
      emailVerificationCode: "ABCDEF",
      emailVerificationAttempts: 0,
      save: jest.fn(),
    };
    const res = makeRes();
    await validateEmailCtrl({ user: usr, body: { code: "ZZZZZZ" } }, res);
    expect(usr.emailVerificationAttempts).toBe(1); // línea 205 aprox.
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "INVALID_CODE" });
  });

  test("validateEmailCtrl → éxito", async () => {
    const usr = { emailVerificationCode: "123456", save: jest.fn() };
    const res = makeRes();
    await validateEmailCtrl({ user: usr, body: { code: "123456" } }, res);
    expect(res.send).toHaveBeenCalledWith({
      message: "Email verificado correctamente",
    });
  });

  /* ------------------------------------------------------------------ */
  /* onboardingPersonalCtrl                                              */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* onboardingCompanyCtrl                                               */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* updateLogoCtrl                                                      */
  /* ------------------------------------------------------------------ */
  test("updateLogoCtrl → NO_FILE_UPLOADED", async () => {
    const res = makeRes();
    await updateLogoCtrl({ user: {}, file: null }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("updateLogoCtrl → FILE_TOO_LARGE", async () => {
    const res = makeRes();
    await updateLogoCtrl({ user: {}, file: { size: 1024 * 1024 + 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(400); // línea 240
    expect(res.json).toHaveBeenCalledWith({ error: "FILE_TOO_LARGE" });
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

  /* ------------------------------------------------------------------ */
  /* getUserByTokenCtrl                                                  */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* inviteUserCtrl                                                      */
  /* ------------------------------------------------------------------ */
  test("inviteUserCtrl → éxito", async () => {
    ev.matchedData.mockReturnValueOnce({ email: "new@x.com" });
    usersModel.findOne = jest.fn().mockResolvedValue(null);
    usersModel.create = jest.fn().mockResolvedValue({ email: "new@x.com" });
    pwdUtils.encrypt.mockResolvedValueOnce("hash");

    const res = makeRes();
    await inviteUserCtrl({ user: { _id: "host" } }, res);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invitación enviada correctamente",
      invitedUser: { email: "new@x.com" },
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
    usersModel.create = jest.fn().mockResolvedValue({ email: "mail@x.com" });
    pwdUtils.encrypt.mockResolvedValueOnce("hash");
    sendEmail.mockRejectedValueOnce(new Error("smtp down"));

    const res = makeRes();
    await inviteUserCtrl({ user: { _id: "host" } }, res);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error enviando email de invitación:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  test("inviteUserCtrl → USER_NOT_FOUND (sin invitador)", async () => {
    const res = makeRes();
    await inviteUserCtrl({ user: null }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
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

    expect(usr.name).toBe("Old"); // se mantuvo valor previo
    expect(usr.save).toHaveBeenCalled(); // línea ejecutada
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

    expect(usr.company.companyName).toBe("ACME"); // sigue igual
    expect(usr.save).toHaveBeenCalled(); // línea evaluada
    expect(res.json).toHaveBeenCalledWith({
      message: "Datos de la compañía actualizados",
      company: usr.company,
    });
  });

  /* -------------------------------------------------------------- */
  /* 3) validateEmailCtrl – USER_NOT_FOUND                          */
  /* -------------------------------------------------------------- */
  test("validateEmailCtrl ⇢ USER_NOT_FOUND", async () => {
    const res = makeRes();
    await validateEmailCtrl({ user: null, body: { code: "123456" } }, res);
    expect(res.status).toHaveBeenCalledWith(404); // línea gris  – ejecutada
    expect(res.json).toHaveBeenCalledWith({ error: "USER_NOT_FOUND" });
  });
  /*
    test('onboardingCompanyCtrl ⇢ crea company vacía ("" defaults)', async () => {
        // 1) usuario SIN propiedad company
        const usr = { save: jest.fn() };          // no hay usr.company
        // 2) matchedData devuelve objeto vacío  (no llega companyName,cif,address)
        ev.matchedData.mockReturnValueOnce({});   // <-- activa 3er OR de cada línea
      
        const res = makeRes();
        await onboardingCompanyCtrl({ user: usr }, res);
      
        // 3) se crea el objeto con strings vacíos
        expect(usr.company).toEqual({
          companyName: '',
          cif:         '',
          address:     '',
        });
        // 4) se guardó y respondió OK
        expect(usr.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
          message: 'Datos de la compañía actualizados',
          company: usr.company,
        });
      });*/
});

/* ===================================================================== */
/* 5. Ramas de catch que aún faltaban (líneas “grises”)                  */
/* ===================================================================== */
describe("controllers/users.js – catch blocks restantes", () => {
  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  });

  /* --- getUser → ERROR_GET_USER ------------------------------------ */
  test("getUser ⇢ matchedData lanza ⇒ ERROR_GET_USER", async () => {
    ev.matchedData.mockImplementationOnce(() => {
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
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_RECOVER_PASSWORD" });
  });

  /* --- changePasswordCtrl → ERROR_CHANGE_PASSWORD ------------------ */
  test("changePasswordCtrl ⇢ findOne lanza ⇒ ERROR_CHANGE_PASSWORD", async () => {
    ev.matchedData.mockReturnValueOnce({
      email: "a@a",
      recoveryCode: "1",
      newPassword: "X",
    });
    usersModel.findOne = jest.fn().mockRejectedValue(new Error("db down"));
    const res = makeRes();
    await changePasswordCtrl({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "ERROR_CHANGE_PASSWORD" });
  });

  /* --- validateEmailCtrl → ERROR_VERIFY_EMAIL ---------------------- */
  test("validateEmailCtrl ⇢ user.save lanza ⇒ ERROR_VERIFY_EMAIL", async () => {
    const usr = {
      emailVerificationCode: "123456",
      save: jest.fn().mockRejectedValue(new Error()),
    };
    const res = makeRes();
    await validateEmailCtrl({ user: usr, body: { code: "123456" } }, res);
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
    const usr = { company: {}, save: jest.fn().mockRejectedValue(new Error()) };
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

/* ===================================================================== */
/* 6. Cobertura de los console.error dentro de los sendEmail.catch       */
/* ===================================================================== */
describe('controllers/users.js – sendEmail.catch internos', () => {
    const makeRes = () => ({
      status: jest.fn().mockReturnThis(),
      json  : jest.fn().mockReturnThis(),
      send  : jest.fn().mockReturnThis(),
    });
  
    /* ------------------------------------------------------------------ */
    /* recoverPasswordCodeCtrl – sendEmail falla                          */
    /* ------------------------------------------------------------------ */
    test('recoverPasswordCodeCtrl ⇢ sendEmail.catch registra error', async () => {
      // ‑‑ mocks mínimos para pasar la parte “happy” hasta el email
      const user = { password: 'hash', save: jest.fn() };
      ev.matchedData.mockReturnValueOnce({
        email: 'u@x.com', currentPassword: '123', from: '',
      });
      usersModel.findOne = jest.fn().mockResolvedValue(user);
      const { compare } = require('../utils/handlePassword');
      compare.mockResolvedValueOnce(true);
  
      // forzamos fallo en sendEmail
      const { sendEmail } = require('../utils/handleMails');
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      sendEmail.mockRejectedValueOnce(new Error('smtp down'));
  
      const res = makeRes();
      await recoverPasswordCodeCtrl({}, res);      // no debe romper flujo
  
      expect(errSpy).toHaveBeenCalledWith(
        'Error enviando email de recuperación:',
        expect.any(Error),
      );
      errSpy.mockRestore();
    });
  
    /* ------------------------------------------------------------------ */
    /* changePasswordCtrl – sendEmail falla                               */
    /* ------------------------------------------------------------------ */
    test('changePasswordCtrl ⇢ sendEmail.catch registra error', async () => {
      // usuario válido con código correcto
      const user = { passwordRecoveryCode: 'OK123', save: jest.fn() };
      ev.matchedData.mockReturnValueOnce({
        email: 'u@x.com', recoveryCode: 'OK123', newPassword: 'NewPass1',
      });
      usersModel.findOne = jest.fn().mockResolvedValue(user);
  
      // encrypt (no importa contenido) y fallo en sendEmail
      const { encrypt } = require('../utils/handlePassword');
      encrypt.mockResolvedValueOnce('newHash');
      const { sendEmail } = require('../utils/handleMails');
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      sendEmail.mockRejectedValueOnce(new Error('smtp fail'));
  
      const res = makeRes();
      await changePasswordCtrl({}, res);           // catch interno
  
      expect(errSpy).toHaveBeenCalledWith(
        'Error enviando email de confirmación:',
        expect.any(Error),
      );
      errSpy.mockRestore();
    });
  });
  
  /* ===================================================================== */
/* Cobertura de la rama “fallback => cadena vacía” en onboardingCompany  */
/* ===================================================================== */
describe('onboardingCompanyCtrl – fallback a "" cuando no hay datos previos', () => {
    const makeRes = () => ({
      status: jest.fn().mockReturnThis(),
      json  : jest.fn().mockReturnThis(),
      send  : jest.fn().mockReturnThis(),
    });
  
    test('sin body y sin user.company ⇒ valores ""', async () => {
      // usuario SIN objeto company aún
      const usr = { save: jest.fn() };
  
      // matchedData devuelve objeto vacío  → no se actualiza desde body
      const { matchedData } = require('express-validator');
      matchedData.mockReturnValueOnce({});
  
      const res = makeRes();
      // llamada al controlador
      const { onboardingCompanyCtrl } = require('../controllers/users');
      await onboardingCompanyCtrl({ user: usr }, res);
  
      // se creó company y cada campo es ""
      expect(usr.company).toEqual({
        companyName: '',
        cif: '',
        address: '',
      });
  
      expect(res.json).toHaveBeenCalledWith({
        message: 'Datos de la compañía actualizados',
        company: usr.company,
      });
    });
  });
  