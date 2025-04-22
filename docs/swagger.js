// docs/swagger.js
const path = require('path');
const YAML = require('yamljs');

const specPath = path.join(__dirname, 'swagger.yaml');
const swaggerDocument = YAML.load(specPath);

module.exports = swaggerDocument;
