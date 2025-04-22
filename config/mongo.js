//config/mongo.js
const mongoose = require("mongoose");

const dbConnect = async () => {
  try {
    const dbUri = process.env.NODE_ENV === "test" ? process.env.DB_URI_TEST : process.env.DB_URI;
    await mongoose.connect(dbUri);
    console.log("Conectado a la BD:", dbUri);
  } catch (error) {
    console.error("Error conectando a la BD:", error);
    process.exit(1);
  }
};

module.exports = dbConnect;
