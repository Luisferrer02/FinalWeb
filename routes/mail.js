//routes/mail.js
const { validatorMail } = require("../validators/mail")
const express = require("express");
const authMiddleware = require("../middleware/session")

const { send } = require("../controllers/mail")
const router = express.Router()

router.post("/", authMiddleware, validatorMail, send)

module.exports = router;
