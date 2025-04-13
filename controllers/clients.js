const Client = require('../models/nosql/clients');

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
}

// Devuelve los clientes archivados del usuario autenticado
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
  
  // Devuelve un cliente específico por ID (asegurando que pertenezca al usuario)
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
  
  // Actualiza un cliente específico
  const updateClient = async (req, res) => {
    try {
      const { id } = req.params;
      // Solo actualizamos si el cliente pertenece al usuario autenticado
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
  
  // Realiza un hard delete del cliente (borrado físico)
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
  
  // Marca el cliente como archivado (soft delete)
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
  
  // Restaura un cliente archivado
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
  
  // Actualiza el logo del cliente subiendo una imagen (se espera usar un middleware de file upload)
  const updateLogoClient = async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.file) return res.status(400).json({ error: "No se ha subido ningún archivo" });
  
      // Aquí puedes integrar tu lógica de almacenamiento (por ejemplo, usando un helper que suba a tu servicio de archivos)
      // Supongamos que obtienes la URL del logo subido:
      const logoUrl = `http://myfiles/storage/${req.file.filename || req.file.originalname}`;
  
      const client = await Client.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { logo: logoUrl },
        { new: true }
      );
      if (!client) return res.status(404).json({ error: "Cliente no encontrado" });
      res.status(200).json({ message: "Logo actualizado correctamente", client });
    } catch (error) {
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
    updateLogoClient
  };