//models/index.js

const usersModel = require("./nosql/user");
const storageModel = require("./nosql/storage");
const clientsModel = require("./nosql/clients");

module.exports = { usersModel, storageModel, clientsModel };
