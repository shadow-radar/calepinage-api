// ============================================================
//  SERVEUR EXPRESS — calepinage-api
//  BNA Bardage — Proxy Météo + Notifications Push + Cron
// ============================================================
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const meteo    = require('./meteo');
const notifs   = require('./notifs');
const cron     = require('./cron');
const auth     = require('./auth');
const calendar = require('./calendar');

const app  = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(cors({
  origin: [
    process.env.FRONT_URL || 'https://calepinage-pro.onrender.com',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'DELETE']
}));

// ============================================================
//  ROUTES MÉTÉO
// ============================================================

// GET /meteo?adresse=Lyon
app.get('/meteo', async function(req, res) {
  var adresse = req.query.adresse;
  if (!adresse) {
    return res.status(400).json({ erreur: 'Paramètre adresse manquant' });
  }
  try {
    var data = await meteo.getMeteoSemaine(adresse);
    res.json(data);
  } catch(err) {
    res.status(500).json({ erreur: err.message });
  }
});

// GET /meteo/hebdo?adresse=Lyon — récap semaine
app.get('/meteo/hebdo', async function(req, res) {
  var adresse = req.query.adresse;
  if (!adresse) {
    return res.status(400).json({ erreur: 'Paramètre adresse manquant' });
  }
  try {
    var data = await meteo.getMeteoHebdo(adresse);
    // Mettre à jour l'adresse du chantier pour les cron jobs
    cron.setAdresseChantier(adresse);
    res.json(data);
  } catch(err) {
    res.status(500).json({ erreur: err.message });
  }
});

// ============================================================
//  ROUTES NOTIFICATIONS PUSH
// ============================================================

// POST /push/subscribe — enregistrer un abonnement
app.post('/push/subscribe', function(req, res) {
  var subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ erreur: 'Abonnement invalide' });
  }
  var total = notifs.ajouterAbonnement(subscription);
  res.json({ ok: true, abonnes: total });
});

// DELETE /push/subscribe — se désabonner
app.delete('/push/subscribe', function(req, res) {
  var endpoint = req.body.endpoint;
  if (endpoint) notifs.supprimerAbonnement(endpoint);
  res.json({ ok: true });
});

// POST /push/test — tester une notification
app.post('/push/test', async function(req, res) {
  try {
    var result = await notifs.envoyerNotif(
      '🏗️ Test BNA Bardage',
      'Notifications push opérationnelles !',
      { type: 'test' }
    );
    res.json({ ok: true, result });
  } catch(err) {
    res.status(500).json({ erreur: err.message });
  }
});

// GET /push/vapid — clé publique VAPID pour le front
app.get('/push/vapid', function(req, res) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ============================================================
//  ROUTES UTILITAIRES
// ============================================================

// GET / — sanity check
app.get('/', function(req, res) {
  res.json({
    service:  'calepinage-api',
    version:  '1.0.0',
    status:   'ok',
    routes: [
      'GET  /meteo?adresse=...',
      'GET  /meteo/hebdo?adresse=...',
      'POST /push/subscribe',
      'GET  /push/vapid',
      'POST /push/test'
    ]
  });
});

// ============================================================
//  ROUTES GOOGLE CALENDAR
// ============================================================

// GET /auth/google — démarrer l'auth OAuth (une seule fois)
app.get('/auth/google', function(req, res) {
  var url = auth.getAuthUrl();
  res.redirect(url);
});

// GET /auth/callback — callback OAuth Google
app.get('/auth/callback', async function(req, res) {
  var code = req.query.code;
  if (!code) return res.status(400).send('Code manquant');
  try {
    await auth.getTokenFromCode(code);
    res.send('<h2>✅ Google Calendar connecté !</h2><p>Tu peux fermer cette page.</p>');
  } catch(err) {
    res.status(500).send('Erreur : ' + err.message);
  }
});

// GET /auth/status — vérifier si connecté
app.get('/auth/status', function(req, res) {
  res.json({ authenticated: auth.isAuthenticated() });
});

// POST /calendar/sync — synchroniser un chantier
app.post('/calendar/sync', async function(req, res) {
  var chantier = req.body;
  if (!chantier || !chantier.numeroDossier) {
    return res.status(400).json({ erreur: 'Données chantier manquantes' });
  }
  try {
    var resultats = await calendar.syncChantier(chantier);
    res.json({ ok: true, resultats });
  } catch(err) {
    res.status(500).json({ erreur: err.message });
  }
});

// DELETE /calendar/sync — supprimer les events d'un chantier
app.delete('/calendar/sync', async function(req, res) {
  var nomProjet = req.body.nomProjet;
  if (!nomProjet) return res.status(400).json({ erreur: 'nomProjet manquant' });
  try {
    await calendar.supprimerEvenementsChantier(nomProjet);
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ erreur: err.message });
  }
});

// ============================================================
//  DÉMARRAGE
// ============================================================
app.listen(PORT, function() {
  console.log('🚀 calepinage-api démarré sur port ' + PORT);
  console.log('🌍 CORS autorisé : ' + (process.env.FRONT_URL || 'localhost'));

  // Démarrer les cron jobs
  cron.demarrerCronJobs();
});
