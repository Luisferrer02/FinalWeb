// utils/handlePassword.js
const bcryptjs = require("bcryptjs")

const encrypt = async (clearPassword) => {
  // Se utiliza un salt de 10 para generar el hash
  const hash = await bcryptjs.hash(clearPassword, 10)
  return hash
}

const compare = async (clearPassword, hashedPassword) => {
  // Compara la contraseña en texto plano con el hash almacenado
  const result = await bcryptjs.compare(clearPassword, hashedPassword)
  return result
}

module.exports = { encrypt, compare }
