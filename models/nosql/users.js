//models/nosql/users.js

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      default: "",
      trim: true
    },
    nif: {
      type: String,
      default: "",
      trim: true
    },
    age: {
      type: Number
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["user", "admin", "guest"],
      default: "user"
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationCode: {
      type: String,
      default: null
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: "pending"
    },
    company: {
      companyName: { type: String, default: "" },
      cif: { type: String, default: "" },
      address: { type: String, default: "" }
    },
    logo: {
      type: String,
      default: ""
    },
    deleted: {
      type: Boolean,
      default: false
    },
    passwordRecoveryCode: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Método para ocultar información sensible
UserSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordRecoveryCode;
  return userObject;
};

module.exports = mongoose.model("User", UserSchema);
