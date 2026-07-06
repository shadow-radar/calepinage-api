// ============================================================
//  CRON JOBS — Tâches planifiées
// ============================================================
const cron   = require('node-cron');
const meteo  = require('./meteo');
const notifs = require('./notifs');

// Adresse par défaut (sera remplacée par celle du chantier actif)
var adresseChantier = process.env.ADRESSE_CHANTIER || 'Lyon, France';

function setAdresseChantier(adresse) {
  adresseChantier = adresse;
  console.log('📍 Adresse chantier mise à jour :', adresse);
}

function demarrerCronJobs() {
  console.log('⏰ Démarrage des Cron jobs...');

  // --- Lundi matin 7h00 — Récap semaine ---
  cron.schedule('0 7 * * 1', async function() {
    console.log('📅 Cron lundi 7h — Récap semaine');
    try {
      var data = await meteo.getMeteoHebdo(adresseChantier);
      await notifs.notifSemaine(data);
    } catch(err) {
      console.error('Erreur cron lundi :', err.message);
    }
  }, { timezone: 'Europe/Paris' });

  // --- Tous les jours 6h00 — Météo matin ---
  cron.schedule('0 6 * * 1-5', async function() {
    console.log('☀️ Cron 6h — Météo matin');
    try {
      var data = await meteo.getMeteoSemaine(adresseChantier);
      await notifs.notifMatin(data);
    } catch(err) {
      console.error('Erreur cron 6h :', err.message);
    }
  }, { timezone: 'Europe/Paris' });

  // --- Tous les jours 12h00 — Point météo midi ---
  cron.schedule('0 12 * * 1-5', async function() {
    console.log('🕛 Cron 12h — Météo midi');
    try {
      var data = await meteo.getMeteoSemaine(adresseChantier);
      await notifs.notifMidi(data);
    } catch(err) {
      console.error('Erreur cron 12h :', err.message);
    }
  }, { timezone: 'Europe/Paris' });

  console.log('✅ Cron jobs actifs : lundi 7h + lun-ven 6h + lun-ven 12h');
}

module.exports = { demarrerCronJobs, setAdresseChantier };
