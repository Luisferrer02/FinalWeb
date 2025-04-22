//routes/clients.js
const express = require("express");
const router = express.Router();

// Middlewares
const authMiddleware = require("../middleware/session");
const { uploadMiddleWareMemory } = require("../utils/handleStorage");
const { getClients, addClient, getArchivedClients, getClient, updateClient, deleteClient, archiveClient, restoreClient, updateLogoClient } = require("../controllers/clients");
const { validatorCreateClient, validatorClientId, validatorUpdateClient } = require("../validators/clients");


// GET /api/client – Obtiene clientes del usuario
router.get("/", authMiddleware, getClients);

// POST /api/client – Agrega un nuevo cliente
router.post("/", authMiddleware, validatorCreateClient, addClient);

// GET /api/client/archive – Obtiene clientes archivados
router.get("/archive", authMiddleware, getArchivedClients);

// GET /api/client/:id – Obtiene un cliente específico
router.get("/:id", authMiddleware, validatorClientId, getClient);

// PUT /api/client/:id – Actualiza un cliente
router.put("/:id", authMiddleware, validatorUpdateClient, updateClient);

// DELETE /api/client/:id – Borra un cliente (hard delete)
router.delete("/:id", authMiddleware, validatorClientId, deleteClient);

// PATCH /api/client/logo/:id – Sube logo y actualiza URL
router.patch("/logo/:id", authMiddleware, validatorClientId, uploadMiddleWareMemory.single("image"), updateLogoClient);

// DELETE /api/client/archive/:id – Archiva un cliente (soft delete)
router.delete("/archive/:id", authMiddleware, validatorClientId, archiveClient);

// PATCH /api/client/restore/:id – Restaura un cliente archivado
router.patch("/restore/:id", authMiddleware, validatorClientId, restoreClient);

module.exports = router;
