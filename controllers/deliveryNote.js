// controllers/deliveryNote.js
const DeliveryNote = require("../models/nosql/deliveryNote");
const { handleHttpError } = require("../utils/handleError");
const { uploadToPinata } = require("../utils/handleUploadIPFS");
const { PassThrough } = require("stream");
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
  // ⚠️  se resuelve de nuevo para respetar posibles mocks posteriores
  const { handleHttpError } = require('../utils/handleError');

  let streamFailed = false;

  try {
    /* ────────────────────────────────────────────────────────────────────── */
    /* 1. Busca el albarán                                                   */
    /* ────────────────────────────────────────────────────────────────────── */
    const { id } = req.params;

    let query = DeliveryNote.findById(id);
    if (typeof query.populate === 'function') {
      query = query
        .populate('userId',   'name email')
        .populate('clientId', 'name cif address logo')
        .populate('projectId','name description');
    }
    const note = await query;
    if (!note) return handleHttpError(res, 'DELIVERYNOTE_NOT_FOUND', 404);

    /* ────────────────────────────────────────────────────────────────────── */
    /* 2. Crea PDF + manejadores de error                                   */
    /* ────────────────────────────────────────────────────────────────────── */
    const doc = new PDFDocument();

    res.on('error', err => {
      if (streamFailed) return;          // ya se gestionó
      streamFailed = true;
      console.error('HTTP response error:', err);
      doc.destroy(err);
    });

    doc.on('error', err => {
      if (streamFailed) return;
      streamFailed = true;
      console.error('PDF stream error:', err);
      if (res.headersSent) return res.destroy(err);
      return handleHttpError(res, 'ERROR_GENERATE_PDF', 500);
    });

    /*  Si el mock de los tests dispara el error **aquí mismo**,             */
    /*  streamFailed=true → abortamos sin enviar cabeceras PDF               */
    if (streamFailed) return;

    /* ────────────────────────────────────────────────────────────────────── */
    /* 3. Encabezados, tubería y contenido                                   */
    /* ────────────────────────────────────────────────────────────────────── */
    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=deliverynote_${id}.pdf`
    );

    doc.pipe(res);
    buildPdfTemplate(doc, note);
    doc.end();

  } catch (err) {
    console.error('Error al generar PDF:', err);
    // Solo respondemos si aún no se ha enviado nada al cliente
    if (!res.headersSent) {
      return require('../utils/handleError')
               .handleHttpError(res, 'ERROR_GENERATE_PDF', 500);
    }
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

const updateDeliveryNote = async (req, res) => {
  try {
    const { id } = req.params;

    const existingNote = await DeliveryNote.findById(id);
    if (!existingNote) return handleHttpError(res, "DELIVERYNOTE_NOT_FOUND", 404);

    if (existingNote.isSigned) {
      return handleHttpError(res, "DELIVERYNOTE_ALREADY_SIGNED", 400);
    }

    const updatedNote = await DeliveryNote.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      req.body,
      { new: true }
    );

    res.status(200).json({ message: "Albarán actualizado correctamente", note: updatedNote });
  } catch (error) {
    console.error("Error al actualizar el albarán:", error);
    return handleHttpError(res, "ERROR_UPDATE_DELIVERYNOTE", 500);
  }
};


const signDeliveryNote = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return handleHttpError(res, "NO_FILE_UPLOADED", 400);

    const pinataSignature = await uploadToPinata(req.file.buffer, req.file.originalname);
    const signatureUrl = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${pinataSignature.IpfsHash}`;

    const note = await DeliveryNote.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      {
        isSigned: true,
        signatureUrl,
        $push: {
          attachedFiles: {
            name: req.file.originalname,
            url: signatureUrl
          }
        }
      },
      { new: true }
    ).populate("userId", "name email")
     .populate("clientId", "name cif address logo")
     .populate("projectId", "name description");

    if (!note) return handleHttpError(res, "DELIVERYNOTE_NOT_FOUND", 404);

    // Generar PDF y subirlo a IPFS
    const pdfStream = new PDFDocument();
    const passthrough = new PassThrough();
    const chunks = [];

    passthrough.on("data", chunk => chunks.push(chunk));
    passthrough.on("end", async () => {
      const finalBuffer = Buffer.concat(chunks);
      const pinataPdf = await uploadToPinata(finalBuffer, `albaran_${id}.pdf`);
      const pdfUrl = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${pinataPdf.IpfsHash}`;

      note.pdfUrl = pdfUrl;
      await note.save();

      return res.status(200).json({ message: "Albarán firmado correctamente", note });
    });

    pdfStream.pipe(passthrough);
    buildPdfTemplate(pdfStream, note);
    pdfStream.end();
  } catch (error) {
    console.error("Error al firmar albarán y generar PDF:", error);
    return handleHttpError(res, "ERROR_SIGN_DELIVERYNOTE", 500);
  }
};

module.exports = {
  buildPdfTemplate,
  createDeliveryNote,
  getDeliveryNotes,
  updateDeliveryNote,
  getDeliveryNote,
  generateDeliveryNotePdf,
  signDeliveryNote,
};
