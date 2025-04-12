//utils/handleStorage.js

const multer = require('multer');

const memory = multer.memoryStorage();
const uploadMiddleWareMemory = multer({ storage: memory });

module.exports = { uploadMiddleWareMemory };
