const express = require('express');
const app = express();
require('dotenv').config();

// Configuración de middlewares y rutas
app.get('/', (req, res) => {
  res.send('Hola Mundo');
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
