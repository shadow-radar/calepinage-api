// ============================================================
//  AUTH — Google OAuth2 (token persisté dans Firestore)
// ============================================================
const { google }   = require('googleapis');
const firestore    = require('./firestore');

var tokenEnMemoire = null;

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl() {
  var oauth2 = getOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt:      'consent',
    scope:       ['https://www.googleapis.com/auth/calendar']
  });
}

async function getTokenFromCode(code) {
  var oauth2 = getOAuthClient();
  var { tokens } = await oauth2.getToken(code);
  tokenEnMemoire = tokens;
  await firestore.sauvegarderToken(tokens);
  console.log('✅ Token Calendar sauvegardé');
  return tokens;
}

async function getAuthenticatedClient() {
  // Charger depuis Firestore si pas en mémoire
  if (!tokenEnMemoire) {
    tokenEnMemoire = await firestore.chargerToken();
  }
  if (!tokenEnMemoire) {
    throw new Error('Token non trouvé — Allez sur /auth/google');
  }
  var oauth2 = getOAuthClient();
  oauth2.setCredentials(tokenEnMemoire);
  oauth2.on('tokens', async function(newTokens) {
    if (newTokens.refresh_token) tokenEnMemoire.refresh_token = newTokens.refresh_token;
    tokenEnMemoire.access_token = newTokens.access_token;
    await firestore.sauvegarderToken(tokenEnMemoire);
    console.log('🔄 Token rafraîchi et sauvegardé');
  });
  return oauth2;
}

async function isAuthenticated() {
  if (tokenEnMemoire) return true;
  tokenEnMemoire = await firestore.chargerToken();
  return tokenEnMemoire !== null;
}

module.exports = { getAuthUrl, getTokenFromCode, getAuthenticatedClient, isAuthenticated };
