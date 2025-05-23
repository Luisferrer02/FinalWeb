// controllers/clients.js
const Client = require('../models/nosql/clients');
const { uploadToPinata } = require("../utils/handleUploadIPFS");
const { handleHttpError } = require("../utils/handleError");

const getClients = async (req, res) => {
    try { 
        const userId = req.user._id;
        const clients = await Client.find({ userId, archived: false });
        res.status(200).json({ clients }); 
    } catch (error) {
        console.error("Error al obtener clientes:", error);
        res.status(500).json({ error: "Error al obtener clientes" });
    }
};

const addClient = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, cif, address } = req.body;

        const newClient = new Client({
            userId,
            name,
            cif,
            address
        });

        const clientSaved = await newClient.save();
        res.status(200).json({ clientSaved });
    } catch (error) {
        console.error("Error al crear cliente:", error);
        res.status(500).json({ error: "Error al crear cliente" });
    }
};

const getArchivedClients = async (req, res) => {
    try {
      const userId = req.user._id;
      const archivedClients = await Client.find({ userId, archived: true });
      res.status(200).json(archivedClients);
    } catch (error) {
      console.error("Error al obtener clientes archivados:", error);
      res.status(500).json({ error: "Error interno en el servidor" });
    }
};
  
const getClient = async (req, res) => {
    try {
      const { id } = req.params;
      const client = await Client.findById(id);
      if (!client || String(client.userId) !== String(req.user._id)) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      res.status(200).json(client);
    } catch (error) {
      console.error("Error al obtener el cliente:", error);
      res.status(500).json({ error: "Error interno en el servidor" });
    }
};
  
const updateClient = async (req, res) => {
    try {
      const { id } = req.params;
      const client = await Client.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        req.body,
        { new: true }
      );
      if (!client) return res.status(404).json({ error: "Cliente no encontrado" });
      res.status(200).json(client);
    } catch (error) {
      console.error("Error al actualizar el cliente:", error);
      res.status(500).json({ error: "Error interno en el servidor" });
    }
};
  
const deleteClient = async (req, res) => {
    try {
      const { id } = req.params;
      const client = await Client.findOneAndDelete({ _id: id, userId: req.user._id });
      if (!client) return res.status(404).json({ error: "Cliente no encontrado" });
      res.status(200).json({ message: "Cliente eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      res.status(500).json({ error: "Error interno en el servidor" });
    }
};
  
const archiveClient = async (req, res) => {
    try {
      const { id } = req.params;
      const client = await Client.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { archived: true },
        { new: true }
      );
      if (!client) return res.status(404).json({ error: "Cliente no encontrado" });
      res.status(200).json({ message: "Cliente archivado correctamente" });
    } catch (error) {
      console.error("Error al archivar cliente:", error);
      res.status(500).json({ error: "Error interno en el servidor" });
    }
};
  
const restoreClient = async (req, res) => {
    try {
      const { id } = req.params;
      const client = await Client.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { archived: false },
        { new: true }
      );
      if (!client) return res.status(404).json({ error: "Cliente no encontrado" });
      res.status(200).json({ message: "Cliente restaurado correctamente" });
    } catch (error) {
      console.error("Error al restaurar cliente:", error);
      res.status(500).json({ error: "Error interno en el servidor" });
    }
};
  
const updateLogoClient = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No se ha subido ningún archivo" });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const pinataResponse = await uploadToPinata(req.file.buffer, req.file.originalname);
    const logoUrl = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${pinataResponse.IpfsHash}`;

    const client = await Client.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { logo: logoUrl },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.status(200).json({ message: "Logo actualizado correctamente", client });

  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ error: "Cliente no encontrado" }); 
    }

    console.error("Error al actualizar logo:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};


module.exports = {
    getClients,
    addClient,
    getArchivedClients,
    getClient,
    updateClient,
    deleteClient,
    archiveClient,
    restoreClient,
    updateLogoClient,
};
