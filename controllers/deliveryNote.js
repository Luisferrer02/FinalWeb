// controllers/deliveryNote.js
const DeliveryNote = require("../models/nosql/deliveryNote");
const { handleHttpError } = require("../utils/handleError");
const { uploadToPinata } = require("../utils/handleUploadIPFS");
const PDFDocument = require("pdfkit");

/**
 * Función que construye el template del PDF para el delivery note.
 * @param {PDFDocument} doc - Objeto PDF generado por pdfkit.
 * @param {Object} note - Albarán con los datos poblados (userId, clientId, projectId e items).
 */
const buildPdfTemplate = (doc, note) => {
  doc.fontSize(20).text("Albarán", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`ID: ${note._id}`);
  doc.text(`Fecha: ${note.createdAt.toISOString()}`);
  doc.moveDown();
  doc.text(`Usuario: ${note.userId.name} (${note.userId.email})`);
  doc.text(`Cliente: ${note.clientId.name}`);
  doc.text(`Proyecto: ${note.projectId.name}`);
  doc.moveDown();
  doc.text("Detalles:");
  note.items.forEach((item, i) => {
    doc.text(`${i + 1}. ${item.type} - ${item.description} (Cantidad: ${item.quantity})`);
  });
  doc.moveDown();
  if (note.isSigned && note.signatureUrl) {
    doc.text(`Firmado. Firma: ${note.signatureUrl}`);
  } else {
    doc.text("Albarán no firmado");
  }
};

const generateDeliveryNotePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await DeliveryNote.findById(id)
      .populate("userId", "name email")
      .populate("clientId", "name cif address logo")
      .populate("projectId", "name description");
    if (!note) return handleHttpError(res, "DELIVERYNOTE_NOT_FOUND", 404);

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=deliverynote_${id}.pdf`);
    
    // Se invoca la función externa para crear el template del PDF
    buildPdfTemplate(doc, note);

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error("Error al generar PDF:", error);
    return handleHttpError(res, "ERROR_GENERATE_PDF", 500);
  }
};

const createDeliveryNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const { clientId, projectId, items } = req.body;
    const newDeliveryNote = new DeliveryNote({ userId, clientId, projectId, items });
    const savedNote = await newDeliveryNote.save();
    res.status(200).json(savedNote);
  } catch (error) {
    console.error("Error al crear albarán:", error);
    return handleHttpError(res, "ERROR_CREATE_DELIVERYNOTE", 500);
  }
};

const getDeliveryNotes = async (req, res) => {
  try {
    const userId = req.user._id;
    const notes = await DeliveryNote.find({ userId });
    res.status(200).json(notes);
  } catch (error) {
    console.error("Error al obtener albaranes:", error);
    return handleHttpError(res, "ERROR_GET_DELIVERYNOTES", 500);
  }
};

const getDeliveryNote = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await DeliveryNote.findById(id)
      .populate("userId", "name email")
      .populate("clientId", "name cif address logo")
      .populate("projectId", "name description");
    if (!note) return handleHttpError(res, "DELIVERYNOTE_NOT_FOUND", 404);
    res.status(200).json(note);
  } catch (error) {
    console.error("Error al obtener el albarán:", error);
    return handleHttpError(res, "ERROR_GET_DELIVERYNOTE", 500);
  }
};

const signDeliveryNote = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return handleHttpError(res, "NO_FILE_UPLOADED", 400);

    // Subir el archivo a Pinata
    const pinataResponse = await uploadToPinata(req.file.buffer, req.file.originalname);
    const fileUrl = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${pinataResponse.IpfsHash}`;

    // Actualizar la delivery note con la URL del archivo subido
    const note = await DeliveryNote.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { 
        isSigned: true, 
        signatureUrl: fileUrl, 
        $push: { attachedFiles: { name: req.file.originalname, url: fileUrl } } // Agregar archivo a la lista de archivos adjuntos
      },
      { new: true }
    );
    if (!note) return handleHttpError(res, "DELIVERYNOTE_NOT_FOUND", 404);

    res.status(200).json({ message: "Archivo subido y albarán firmado correctamente", note });
  } catch (error) {
    console.error("Error al subir archivo y firmar albarán:", error);
    return handleHttpError(res, "ERROR_SIGN_DELIVERYNOTE", 500);
  }
};

module.exports = {
  buildPdfTemplate,
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNote,
  generateDeliveryNotePdf,
  signDeliveryNote,
};
