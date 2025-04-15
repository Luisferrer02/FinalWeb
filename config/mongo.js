const mongoose = require("mongoose");

const dbConnect = async () => {
  try {
    // Si NODE_ENV es "test" se utiliza DB_URI_TEST, de lo contrario DB_URI
    const dbUri = process.env.NODE_ENV === "test" ? process.env.DB_URI_TEST : process.env.DB_URI;
    await mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conectado a la BD:", dbUri);
  } catch (error) {
    console.error("Error conectando a la BD:", error);
    process.exit(1);
  }
};

module.exports = dbConnect;
