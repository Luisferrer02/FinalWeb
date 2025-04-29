// test/acceptInvite.controller.test.js

jest.mock("express-validator", () => ({
    matchedData: jest.fn(),
  }));
  
  jest.mock("../models", () => ({
    usersModel: {
      findOne: jest.fn(),
    },
  }));
  
  jest.mock("../utils/handlePassword", () => {
    const real = jest.requireActual("../utils/handlePassword");
    return {
      ...real,
      compare: jest.fn(),
      encrypt: jest.fn(),
    };
  });
  
  const ev = require("express-validator");
  const { usersModel } = require("../models");
  const pwdUtils = require("../utils/handlePassword");
  const { acceptInviteCtrl } = require("../controllers/users");
  
  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  });
  
  describe("acceptInviteCtrl", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    test("acceptInviteCtrl → éxito", async () => {
      ev.matchedData.mockReturnValueOnce({
        token: "tok123",
        name: "Juan",
        lastName: "Pérez",
        email: "juan@ejemplo.com",
        password: "Pass1234",
      });
  
      const recent = new Date(Date.now() - 1000 * 60 * 60); // hace 1h
      const user = {
        inviteTokenHash: "hashInv",
        inviteSentAt: recent,
        save: jest.fn().mockResolvedValue(),
      };
      usersModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });
  
      pwdUtils.compare.mockResolvedValueOnce(true);
      pwdUtils.encrypt.mockResolvedValueOnce("hashedPass");
  
      const res = makeRes();
      await acceptInviteCtrl({}, res);
  
      expect(user.name).toBe("Juan");
      expect(user.lastName).toBe("Pérez");
      expect(user.password).toBe("hashedPass");
      expect(user.status).toBe("active");
      expect(user.inviteTokenHash).toBeNull();
      expect(user.inviteSentAt).toBeNull();
      expect(user.save).toHaveBeenCalled();
  
      expect(res.json).toHaveBeenCalledWith({
        message: "Invitación aceptada. Usuario activo.",
      });
    });
  
    test("acceptInviteCtrl → USER_NOT_FOUND", async () => {
      ev.matchedData.mockReturnValueOnce({
        token: "tok123",
        name: "Juan",
        lastName: "Pérez",
        email: "noexiste@x.com",
        password: "Pass1234",
      });
  
      usersModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
  
      const res = makeRes();
      await acceptInviteCtrl({}, res);
  
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "USER_NOT_FOUND" });
    });
  
    test("acceptInviteCtrl → INVITE_EXPIRED", async () => {
      ev.matchedData.mockReturnValueOnce({
        token: "tok123",
        name: "Juan",
        lastName: "Pérez",
        email: "juan@ejemplo.com",
        password: "Pass1234",
      });
  
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 49); // hace 49h
      usersModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          inviteTokenHash: "hashInv",
          inviteSentAt: oldDate,
        }),
      });
  
      const res = makeRes();
      await acceptInviteCtrl({}, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "INVITE_EXPIRED" });
    });
  
    test("acceptInviteCtrl → INVALID_INVITE_TOKEN", async () => {
      ev.matchedData.mockReturnValueOnce({
        token: "badtok",
        name: "Juan",
        lastName: "Pérez",
        email: "juan@ejemplo.com",
        password: "Pass1234",
      });
  
      const recent = new Date(Date.now() - 1000 * 60 * 60); // hace 1h
      usersModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          inviteTokenHash: "hashInv",
          inviteSentAt: recent,
        }),
      });
  
      pwdUtils.compare.mockResolvedValueOnce(false);
  
      const res = makeRes();
      await acceptInviteCtrl({}, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "INVALID_INVITE_TOKEN" });
    });
  
    test("acceptInviteCtrl → ERROR_ACCEPT_INVITE (catch)", async () => {
      ev.matchedData.mockImplementationOnce(() => {
        throw new Error("boom");
      });
  
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const res = makeRes();
      await acceptInviteCtrl({}, res);
  
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error en acceptInviteCtrl:",
        expect.any(Error)
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "ERROR_ACCEPT_INVITE" });
  
      consoleSpy.mockRestore();
    });
  });
  