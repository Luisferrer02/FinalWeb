//routes/deliverynotes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/session");
const { uploadMiddleWareMemory } = require("../utils/handleStorage");

const {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNote,
  updateDeliveryNote,
  generateDeliveryNotePdf,
  signDeliveryNote
} = require("../controllers/deliveryNote");

const {
  validatorCreateDeliveryNote,
  validatorDeliveryNoteId
} = require("../validators/deliveryNote");

// Crear albarán
router.post("/", authMiddleware, validatorCreateDeliveryNote, createDeliveryNote);

// Listar albaranes del usuario
router.get("/", authMiddleware, getDeliveryNotes);

// Mostrar detalle de un albarán (populate)
router.get("/:id", authMiddleware, validatorDeliveryNoteId, getDeliveryNote);

// Generar y descargar PDF del albarán
router.get("/pdf/:id", authMiddleware, validatorDeliveryNoteId, generateDeliveryNotePdf);

// Firmar albarán (subir imagen de firma)
router.post("/sign/:id", authMiddleware, validatorDeliveryNoteId, uploadMiddleWareMemory.single("image"), signDeliveryNote);

router.put("/:id", authMiddleware, validatorDeliveryNoteId, updateDeliveryNote);

module.exports = router;
