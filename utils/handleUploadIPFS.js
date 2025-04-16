// utils/handleUploadIPFS.js
const FormData = require('form-data');

const pinataApiKey = process.env.PINATA_KEY;
const pinataSecretApiKey = process.env.PINATA_SECRET;

const uploadToPinata = async (fileBuffer, fileName) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  let data = new FormData();

  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    console.error("El fileBuffer no es válido:", fileBuffer);
    throw new Error("FileBuffer inválido");
  }

  data.append('file', fileBuffer, fileName);
  const metadata = JSON.stringify({ name: fileName });
  data.append('pinataMetadata', metadata);
  const options = JSON.stringify({ cidVersion: 0 });
  data.append('pinataOptions', options);

  try {
    // Importa dinámicamente node-fetch, ya que es un módulo ES
    const fetch = require('node-fetch');

    const headers = {
      ...data.getHeaders(),
      'pinata_api_key': pinataApiKey,
      'pinata_secret_api_key': pinataSecretApiKey
    };

    console.log("Headers enviados a Pinata:", headers);
    console.log("Metadata enviada:", metadata);
    console.log("Options enviadas:", options);
    console.log("Tamaño del fileBuffer:", fileBuffer.length);

    const response = await fetch(url, {
      method: 'POST',
      body: data,
      headers
    });

    console.log("Respuesta de Pinata:", response.status, response.statusText);

    if (!response.ok) {
      const responseText = await response.text();
      console.error("Error de respuesta de Pinata:", responseText);
      throw new Error(`Error al subir el archivo: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log("Respuesta JSON de Pinata:", responseData);
    return responseData;
  } catch (error) {
    console.error('Error al subir el archivo a Pinata:', error);
    throw error;
  }
};

module.exports = { uploadToPinata };
