//models/index.js

const usersModel = require("./nosql/users");
const storageModel = require("./nosql/storage");
const clientsModel = require("./nosql/clients");

module.exports = { usersModel, storageModel, clientsModel };
