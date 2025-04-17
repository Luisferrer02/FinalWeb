const { google } = require("googleapis");
const readline = require("readline");

const CLIENT_SECRET="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"
const CLIENT_ID="767932152839-e79epq9t75ah20o6cvfohgsgs668a7s3.apps.googleusercontent.com"
const REDIRECT_URI="https://developers.google.com/oauthplayground"

// Configura cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// URL para dar permisos
const SCOPES = ["https://mail.google.com/"]; // acceso completo a Gmail
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent"
});

console.log("📬 Abre este link en tu navegador y autoriza acceso:\n");
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("\n🔑 Pega aquí el código de autorización: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n✅ Tokens obtenidos correctamente:");
    console.log(JSON.stringify(tokens, null, 2));
    rl.close();
  } catch (err) {
    console.error("❌ Error al obtener tokens:", err);
    rl.close();
  }
});
