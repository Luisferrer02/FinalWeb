//config/mongo.js

const mongoose = require("mongoose");

const dbConnect = async () => {
    try {
      await mongoose.connect(process.env.DB_URI);
      console.log("Conectado a la BD");
    } catch (error) {
      console.error("Error conectando a la BD:", error);
    }
  }
  

module.exports = dbConnect;
