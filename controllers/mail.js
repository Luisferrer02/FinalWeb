//controllers/mail.js
const { sendEmail } = require('../utils/handleMails');
const { handleHttpError } = require('../utils/handleError');
const { matchedData } = require('express-validator');

//TODO Credenciales Email Google OAuth

const send = async (req, res) => {
  try {
    const emailData = matchedData(req);
    const result = await sendEmail(emailData);
    res.send(result);
  } catch (err) {
    console.error("Error en envío de email:", err);
    return handleHttpError(res, 'ERROR_SEND_EMAIL');
  }
};

module.exports = { send };
