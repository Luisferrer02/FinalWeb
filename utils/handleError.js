// utils/handleError.js
const handleHttpError = (res, message, code = 403) => {
  console.error("HTTP Error:", message);
  res.status(code).json({ error: message });
};

module.exports = { handleHttpError };
