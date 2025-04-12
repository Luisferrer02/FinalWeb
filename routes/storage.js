//routes/storage.js

const express = require("express");
const router = express.Router();
const { uploadMiddleWareMemory } = require("../utils/handleStorage");
const { getItems, getItem, createItem, updateImage, deleteItem } = require("../controllers/storage");
const { validatorGetItem } = require('../validators/storage');

router.get("/", getItems);
router.get("/:id", validatorGetItem, getItem);
router.post("/", uploadMiddleWareMemory.single("image"), createItem);
router.put("/:id", uploadMiddleWareMemory.single("image"), updateImage);
router.delete("/:id", validatorGetItem, deleteItem);

module.exports = router;
