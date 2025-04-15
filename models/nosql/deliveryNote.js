const mongoose = require("mongoose");

const DeliveryNoteItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["hour", "material"],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true
  }
}, { _id: false });

const DeliveryNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    items: {
      type: [DeliveryNoteItemSchema],
      required: true
    },
    // Marca si el albarán ha sido firmado
    isSigned: {
      type: Boolean,
      default: false
    },
    // Almacena la URL de la imagen de la firma (por ejemplo, tras subir a IPFS)
    signatureUrl: {
      type: String,
      default: null
    },
    // URL del PDF subido a la nube (opcional)
    pdfUrl: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true, // Crea createdAt y updatedAt automáticamente
    versionKey: false
  }
);

module.exports = mongoose.model("DeliveryNote", DeliveryNoteSchema);
