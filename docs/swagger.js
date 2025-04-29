// docs/swagger.js
const path = require('path');
const YAML = require('yamljs');

const specPath = path.join(__dirname, 'swagger.yaml');  // ahora es el bundle renombrado
const swaggerDocument = YAML.load(specPath);

module.exports = swaggerDocument;
