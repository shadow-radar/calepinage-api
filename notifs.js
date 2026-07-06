// ============================================================
//  NOTIFICATIONS PUSH — Web Push
// ============================================================
const webpush = require('web-push');

// Config VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Stockage des abonnements (en mémoire, à migrer Firebase si besoin)
var abonnements = [];

// --- Enregistrer un abonnement push ---
function ajouterAbonnement(subscription) {
  var existe = abonnements.find(function(s) {
    return s.endpoint === subscription.endpoint;
  });
  if (!existe) {
    abonnements.push(subscription);
    console.log('✅ Abonnement push enregistré :', subscription.endpoint.slice(-20));
  }
  return abonnements.length;
}

// --- Supprimer un abonnement ---
function supprimerAbonnement(endpoint) {
  abonnements = abonnements.filter(function(s) {
    return s.endpoint !== endpoint;
  });
}

// --- Envoyer une notification à tous ---
async function envoyerNotif(titre, message, data) {
  if (abonnements.length === 0) {
    console.log('Aucun abonné push');
    return;
  }

  var payload = JSON.stringify({
    title: titre,
    body:  message,
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data:  data || {}
  });

  var resultats = await Promise.allSettled(
    abonnements.map(function(sub) {
      return webpush.sendNotification(sub, payload)
        .catch(function(err) {
          if (err.statusCode === 410) {
            supprimerAbonnement(sub.endpoint);
          }
          throw err;
        });
    })
  );

  var ok  = resultats.filter(function(r){ return r.status === 'fulfilled'; }).length;
  var ko  = resultats.filter(function(r){ return r.status === 'rejected'; }).length;
  console.log('Notifs envoyées : ' + ok + ' OK, ' + ko + ' KO');
  return { ok, ko };
}

// --- Notification météo matin (6h) ---
async function notifMatin(meteo) {
  var aujourd = meteo.jours[0];
  var matin   = meteo.heures.filter(function(h){ return h.heure >= '06:00:00' && h.heure <= '12:00:00'; });
  var aprem   = meteo.heures.filter(function(h){ return h.heure > '12:00:00' && h.heure <= '18:00:00'; });

  var okMatin = matin.every(function(h){ return h.ok_bardage; });
  var okAprem = aprem.every(function(h){ return h.ok_bardage; });

  var conseil = '';
  if (okMatin && okAprem)  conseil = '☀️ Journée complète favorable — Pose bardage toute la journée';
  else if (okMatin)        conseil = '🌤️ Matin OK — Pose bardage · Après-midi : ossature/perçage';
  else if (okAprem)        conseil = '🌦️ Matin défavorable — Ossature/perçage · Après-midi : pose bardage';
  else                     conseil = '🌧️ Journée défavorable — Travaux intérieurs ou ossature abritée';

  await envoyerNotif(
    '🏗️ Météo chantier — ' + aujourd.date,
    conseil + '\n' + aujourd.tempMin + '°→' + aujourd.tempMax + '° · Vent ' + aujourd.vent + 'km/h',
    { type: 'meteo_matin', date: aujourd.date }
  );
}

// --- Notification météo midi (12h) ---
async function notifMidi(meteo) {
  var aprem = meteo.heures.filter(function(h){ return h.heure > '12:00:00' && h.heure <= '18:00:00'; });
  var okAprem = aprem.length > 0 && aprem.every(function(h){ return h.ok_bardage; });

  var msg = okAprem
    ? '✅ Après-midi favorable — Continuez la pose bardage'
    : '⚠️ Conditions changeantes — Sécurisez le chantier';

  await envoyerNotif(
    '🕛 Point météo 12h',
    msg,
    { type: 'meteo_midi' }
  );
}

// --- Notification récap semaine (lundi) ---
async function notifSemaine(meteo) {
  var resume = meteo.resume;
  var alertes = resume.alertes.slice(0, 3).join(' · ') || 'Aucune alerte';

  await envoyerNotif(
    '📅 Météo semaine — ' + resume.joursOK + '/7 jours OK',
    resume.message + '\n' + alertes,
    { type: 'meteo_semaine', jours: meteo.jours }
  );
}

module.exports = {
  ajouterAbonnement,
  supprimerAbonnement,
  envoyerNotif,
  notifMatin,
  notifMidi,
  notifSemaine
};
