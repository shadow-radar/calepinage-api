// ============================================================
//  AUTH — Google OAuth2
// ============================================================
const { google } = require('googleapis');
const fs         = require('fs');
const path       = require('path');

const TOKEN_PATH = path.join(__dirname, 'token.json');

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// --- URL d'autorisation (étape 1) ---
function getAuthUrl() {
  var oauth2 = getOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt:      'consent',
    scope:       ['https://www.googleapis.com/auth/calendar']
  });
}

// --- Échanger le code contre un token (étape 2) ---
async function getTokenFromCode(code) {
  var oauth2 = getOAuthClient();
  var { tokens } = await oauth2.getToken(code);
  // Sauvegarder le token
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('✅ Token Google Calendar sauvegardé');
  return tokens;
}

// --- Charger le client authentifié ---
function getAuthenticatedClient() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('Token Google Calendar non trouvé — Allez sur /auth/google');
  }
  var tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
  var oauth2  = getOAuthClient();
  oauth2.setCredentials(tokens);

  // Rafraîchir le token si expiré
  oauth2.on('tokens', function(newTokens) {
    if (newTokens.refresh_token) {
      tokens.refresh_token = newTokens.refresh_token;
    }
    tokens.access_token = newTokens.access_token;
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('🔄 Token Google Calendar rafraîchi');
  });

  return oauth2;
}

function isAuthenticated() {
  return fs.existsSync(TOKEN_PATH);
}

module.exports = { getAuthUrl, getTokenFromCode, getAuthenticatedClient, isAuthenticated };
