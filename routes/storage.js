//routes/storage.js

const express = require("express");
const router = express.Router();
const { uploadMiddleWareMemory } = require("../utils/handleStorage");
const { getItems, getItem, createItem, updateImage, deleteItem } = require("../controllers/storage");
const { validatorGetItem } = require('../validators/storage');

// GET /api/storage – Obtiene todos los items
router.get("/", getItems);
// GET /api/storage/:id – Obtiene un item por ID
router.get("/:id", validatorGetItem, getItem);
// POST /api/storage – Crea un nuevo item
router.post("/", uploadMiddleWareMemory.single("image"), createItem);
// PATCH /api/storage/:id – Actualiza un item por ID
router.put("/:id", uploadMiddleWareMemory.single("image"), updateImage);
// DELETE /api/storage/:id – Elimina un item por ID
router.delete("/:id", validatorGetItem, deleteItem);

module.exports = router;
