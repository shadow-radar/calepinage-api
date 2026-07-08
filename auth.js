// ============================================================
//  AUTH — Google OAuth2 (stockage en mémoire pour Render)
// ============================================================
const { google } = require('googleapis');

// Token stocké en mémoire (perdu au redémarrage → ré-auth nécessaire)
var tokenEnMemoire = null;

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
  tokenEnMemoire = tokens;
  console.log('✅ Token Google Calendar sauvegardé en mémoire');
  return tokens;
}

// --- Charger le client authentifié ---
function getAuthenticatedClient() {
  if (!tokenEnMemoire) {
    throw new Error('Token Google Calendar non trouvé — Allez sur /auth/google');
  }
  var oauth2 = getOAuthClient();
  oauth2.setCredentials(tokenEnMemoire);

  // Rafraîchir le token si expiré
  oauth2.on('tokens', function(newTokens) {
    if (newTokens.refresh_token) {
      tokenEnMemoire.refresh_token = newTokens.refresh_token;
    }
    tokenEnMemoire.access_token = newTokens.access_token;
    console.log('🔄 Token Google Calendar rafraîchi');
  });

  return oauth2;
}

function isAuthenticated() {
  return tokenEnMemoire !== null;
}

module.exports = { getAuthUrl, getTokenFromCode, getAuthenticatedClient, isAuthenticated };
