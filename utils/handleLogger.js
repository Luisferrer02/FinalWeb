// utils/handleLogger.js

const { IncomingWebhook } = require("@slack/webhook");

// Se espera que SLACK_WEBHOOK esté definido en el .env
const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK);

/**
 * Objeto que actúa como stream y envía los mensajes a Slack.
 */
const loggerStream = {
  write: (message) => {
    // agregar aquí algún formateo o filtrar mensajes
    webhook.send({ text: message.trim() }).catch(err => console.error("Error enviando log a Slack:", err));
  },
};

module.exports = loggerStream;
