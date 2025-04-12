const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  street: { type: String, required: true, trim: true },
  number: { type: Number, required: true },
  postal: { type: Number, required: true },
  city: { type: String, required: true, trim: true },
  province: { type: String, required: true, trim: true }
}, { _id: false });

const ClientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    cif: { type: String, required: true, trim: true },
    address: { type: AddressSchema, required: true },
    logo: { type: String, default: "" },
    // Estos campos se pueden actualizar según la lógica de la app
    activeProjects: { type: Number, default: 0 },
    pendingDeliveryNotes: { type: Number, default: 0 },
    archivedProjects: { type: Number, default: 0 },
    archived: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model("Client", ClientSchema);
