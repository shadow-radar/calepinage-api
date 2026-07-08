// ============================================================
//  FIRESTORE — Firebase Admin SDK (côté serveur)
// ============================================================
const admin = require('firebase-admin');

// Init Firebase Admin via variable d'environnement
var app;
try {
  var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialisé');
} catch(err) {
  console.error('❌ Erreur Firebase Admin :', err.message);
}

var db = admin.firestore();

// ============================================================
//  CHANTIERS — CRUD Firestore
// ============================================================

// --- Sauvegarder un chantier ---
async function sauvegarderChantier(data) {
  try {
    var id = data.numeroDossier;
    await db.collection('chantiers').doc(id).set({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ Chantier sauvegardé :', id);
    return id;
  } catch(err) {
    console.error('Erreur Firestore save :', err.message);
    throw err;
  }
}

// --- Charger un chantier ---
async function chargerChantier(numeroDossier) {
  try {
    var snap = await db.collection('chantiers').doc(numeroDossier).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  } catch(err) {
    console.error('Erreur Firestore get :', err.message);
    throw err;
  }
}

// --- Lister tous les chantiers ---
async function listerChantiers() {
  try {
    var snap = await db.collection('chantiers')
      .orderBy('updatedAt', 'desc')
      .get();
    var liste = [];
    snap.forEach(function(doc) {
      liste.push({ id: doc.id, ...doc.data() });
    });
    return liste;
  } catch(err) {
    console.error('Erreur Firestore list :', err.message);
    throw err;
  }
}

// --- Supprimer un chantier ---
async function supprimerChantier(numeroDossier) {
  try {
    await db.collection('chantiers').doc(numeroDossier).delete();
    console.log('🗑️ Chantier supprimé :', numeroDossier);
  } catch(err) {
    console.error('Erreur Firestore delete :', err.message);
    throw err;
  }
}

// --- Sauvegarder token Google Calendar ---
async function sauvegarderToken(token) {
  try {
    await db.collection('config').doc('google_token').set({
      token,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Token Calendar sauvegardé dans Firestore');
  } catch(err) {
    console.error('Erreur save token :', err.message);
  }
}

// --- Charger token Google Calendar ---
async function chargerToken() {
  try {
    var snap = await db.collection('config').doc('google_token').get();
    if (!snap.exists) return null;
    return snap.data().token;
  } catch(err) {
    console.error('Erreur load token :', err.message);
    return null;
  }
}

module.exports = {
  sauvegarderChantier,
  chargerChantier,
  listerChantiers,
  supprimerChantier,
  sauvegarderToken,
  chargerToken
};
