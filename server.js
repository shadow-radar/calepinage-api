// ============================================================
//  SERVEUR EXPRESS — calepinage-api
//  BNA Bardage — Proxy Météo + Notifications Push + Cron
// ============================================================
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const meteo   = require('./meteo');
const notifs  = require('./notifs');
const cron    = require('./cron');

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
//  DÉMARRAGE
// ============================================================
app.listen(PORT, function() {
  console.log('🚀 calepinage-api démarré sur port ' + PORT);
  console.log('🌍 CORS autorisé : ' + (process.env.FRONT_URL || 'localhost'));

  // Démarrer les cron jobs
  cron.demarrerCronJobs();
});
