// ============================================================
//  CALENDAR — Sync Google Calendar
// ============================================================
const { google } = require('googleapis');
const auth       = require('./auth');

const ETAPES = ['Métré', 'Préparation', 'Pose', 'Réception'];

const COULEURS = {
  'Métré':       '7',  // Bleu myrtille
  'Préparation': '5',  // Banane
  'Pose':        '2',  // Sauge
  'Réception':   '4'   // Flamand
};

// --- Créer ou mettre à jour les 4 événements d'un chantier ---
async function syncChantier(chantier) {
  if (!auth.isAuthenticated()) {
    throw new Error('Non authentifié — Allez sur /auth/google');
  }

  var oauth2    = auth.getAuthenticatedClient();
  var calendar  = google.calendar({ version: 'v3', auth: oauth2 });
  var resultats = [];

  for (var i = 0; i < ETAPES.length; i++) {
    var etape = ETAPES[i];
    var date  = chantier.planning && chantier.planning[etape.toLowerCase()];
    if (!date) continue;

    var titre = '[' + (chantier.nomProjet || chantier.numeroDossier) + '] — ' + etape;

    var event = {
      summary:     titre,
      description: 
        '📋 Dossier : ' + chantier.numeroDossier + '\n' +
        '👤 Client : ' + (chantier.client || '—') + '\n' +
        '📍 Adresse : ' + (chantier.adresse || '—') + '\n' +
        '📝 Notes : ' + (chantier.notes || '—'),
      start: { date: date },
      end:   { date: date },
      colorId: COULEURS[etape] || '1',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 }, // J-1
          { method: 'email', minutes: 24 * 60 }  // Email J-1
        ]
      }
    };

    try {
      // Chercher si l'événement existe déjà
      var existing = await _findEvent(calendar, titre, date);

      if (existing) {
        // Mettre à jour
        var updated = await calendar.events.update({
          calendarId: 'primary',
          eventId:    existing.id,
          resource:   event
        });
        resultats.push({ etape, action: 'updated', id: updated.data.id });
        console.log('🔄 Event mis à jour :', titre);
      } else {
        // Créer
        var created = await calendar.events.insert({
          calendarId: 'primary',
          resource:   event
        });
        resultats.push({ etape, action: 'created', id: created.data.id });
        console.log('✅ Event créé :', titre);
      }
    } catch(err) {
      console.error('Erreur event', etape, ':', err.message);
      resultats.push({ etape, action: 'error', erreur: err.message });
    }
  }

  return resultats;
}

// --- Supprimer les événements d'un chantier ---
async function supprimerEvenementsChantier(nomProjet) {
  var oauth2   = auth.getAuthenticatedClient();
  var calendar = google.calendar({ version: 'v3', auth: oauth2 });

  for (var i = 0; i < ETAPES.length; i++) {
    var titre = '[' + nomProjet + '] — ' + ETAPES[i];
    var event = await _findEvent(calendar, titre);
    if (event) {
      await calendar.events.delete({ calendarId: 'primary', eventId: event.id });
      console.log('🗑️ Event supprimé :', titre);
    }
  }
}

// --- Chercher un événement par titre ---
async function _findEvent(calendar, titre, date) {
  var params = {
    calendarId:   'primary',
    q:            titre,
    maxResults:   10,
    singleEvents: true
  };
  if (date) {
    params.timeMin = new Date(date).toISOString();
    params.timeMax = new Date(new Date(date).getTime() + 86400000).toISOString();
  }

  var res = await calendar.events.list(params);
  var events = res.data.items || [];
  return events.find(function(e){ return e.summary === titre; }) || null;
}

module.exports = { syncChantier, supprimerEvenementsChantier };
