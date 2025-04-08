const { matchedData } = require("express-validator");
const { handleHttpError } = require("../utils/handleError");
const { storageModel } = require("../models");
const { uploadToPinata } = require("../utils/handleUploadIPFS");

const getItems = async (req, res) => {
  try {
    const data = await storageModel.find({});
    res.send(data);
  } catch (error) {
    console.error("Error al obtener items:", error);
    return handleHttpError(res, "ERROR_GET_ITEMS", 500);
  }
};

const getItem = async (req, res) => {
  try {
    const { id } = matchedData(req);
    const item = await storageModel.findById(id);
    if (!item) return handleHttpError(res, "FILE_NOT_FOUND", 404);
    res.send(item);
  } catch (error) {
    console.error("Error al obtener item:", error);
    return handleHttpError(res, "ERROR_GET_ITEM", 500);
  }
};

const createItem = async (req, res) => {
  try {
    if (!req.file) return handleHttpError(res, "NO_FILE_UPLOADED", 400);

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    
    const pinataResponse = await uploadToPinata(fileBuffer, fileName);
    const ipfsHash = pinataResponse.IpfsHash;
    const ipfsUrl = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${ipfsHash}`;

    const fileData = { originalName: fileName, ipfs: ipfsUrl };
    const data = await storageModel.create(fileData);
    res.send(data);
  } catch (error) {
    console.error("Error al crear item:", error);
    return handleHttpError(res, "ERROR_CREATE_ITEM", 500);
  }
};

const updateImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return handleHttpError(res, "NO_FILE_UPLOADED", 400);
    
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    
    const pinataResponse = await uploadToPinata(fileBuffer, fileName);
    const ipfsHash = pinataResponse.IpfsHash;
    const ipfsUrl = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${ipfsHash}`;

    const data = await storageModel.findOneAndUpdate({ _id: id }, { ipfs: ipfsUrl }, { new: true });
    res.send(data);
  } catch (error) {
    console.error("Error al actualizar imagen:", error);
    return handleHttpError(res, "ERROR_UPDATE_IMAGE", 500);
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = matchedData(req);
    const dataFile = await storageModel.findById(id);
    if (!dataFile) return handleHttpError(res, "FILE_NOT_FOUND", 404);
    
    await storageModel.deleteOne({ _id: id });
    res.send({ message: "Archivo eliminado correctamente", data: dataFile });
  } catch (err) {
    console.error("Error al eliminar item:", err);
    return handleHttpError(res, "ERROR_DELETE_FILE", 500);
  }
};

module.exports = { getItems, getItem, createItem, updateImage, deleteItem };
