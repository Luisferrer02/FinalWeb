// utils/handlePassword.js
const bcryptjs = require("bcryptjs")

const encrypt = async (clearPassword, saltRounds = 10) => {
  return await bcryptjs.hash(clearPassword, saltRounds)
}

const compare = async (clearPassword, hashedPassword) => {
  // Compara la contraseña en texto plano con el hash almacenado
  const result = await bcryptjs.compare(clearPassword, hashedPassword)
  return result
}

module.exports = { encrypt, compare }
