const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: function () {
        return this.status === "active"; //esto hace que solo sea obligatorio si el usuario es activo, es decir que ya ha aceptado la invitación
      },
    },
    lastName: {
      type: String,
      default: "",
      trim: true,
    },
    nif: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.status === "active"; //Para que solo sea requerido una vez esta activo
      },
    },
    role: {
      type: String,
      enum: ["user", "admin", "guest"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean, //Indica si el correo ha sido verificado
      default: false,
    },
    emailVerificationCodeHash: {
      type: String, //Hash del código de verificación de correo electrónico
      default: null,
      select: false,
    },
    emailVerificationCodeSentAt: {
      type: Date, //Marca la fecha y hora en la que se envió el código de verificación
      default: null,
    },
    emailVerificationAttempts: {
      type: Number, //Número de intentos de verificación de correo electrónico  
      default: 0,
    },
    status: {
      type: String, //Active/Pending segun si ha aceptado la invitación o no
      default: "pending",
    },
    company: {
      companyName: { type: String, default: "" },
      cif: { type: String, default: "" },
      address: { type: String, default: "" },
    },
    logo: {
      type: String, //URL de la imagen del logo
      default: "",
    },
    deleted: {
      type: Boolean, //Indica si el usuario ha sido eliminado
      default: false,
    },
    inviteTokenHash: {
      type: String, //Hash del token de invitación
      default: null,
      select: false,
    },
    inviteSentAt: {
      type: Date, //Marca la fecha y hora en la que se envió la invitación
      default: null,
    },
    passwordRecoveryCodeHash: {
      type: String, //Hash del código de recuperación de contraseña
      default: null,
      select: false,
    },
    passwordRecoveryCodeSentAt: {
      type: Date, //Marca la fecha y hora en la que se envió el código de recuperación de contraseña
      default: null,
    },
  },
  {
    timestamps: true, //Añade createdAt y updatedAt
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//Método para ocultar información sensible
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordRecoveryCodeHash;
  delete obj.emailVerificationCodeHash;
  delete obj.inviteTokenHash;
  return obj;
};

module.exports = mongoose.model("User", UserSchema);
