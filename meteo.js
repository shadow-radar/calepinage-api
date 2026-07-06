// ============================================================
//  MÉTÉO — Proxy Visual Crossing
// ============================================================
const fetch = require('node-fetch');

const API_KEY  = process.env.VISUALCROSSING_API_KEY;
const BASE_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

// --- Météo du jour + 7 jours ---
async function getMeteoSemaine(adresse) {
  try {
    var url = BASE_URL + '/' + encodeURIComponent(adresse) +
      '?unitGroup=metric' +
      '&lang=fr' +
      '&include=days,hours' +
      '&key=' + API_KEY;

    var res  = await fetch(url);
    var data = await res.json();

    if (!data.days) throw new Error('Réponse météo invalide');

    // Formater les données utiles pour le chantier
    var jours = data.days.slice(0, 7).map(function(d) {
      return {
        date:         d.datetime,
        tempMax:      d.tempmax,
        tempMin:      d.tempmin,
        precipitation: d.precip || 0,
        vent:         d.windspeed,
        rafales:      d.windgust || 0,
        conditions:   d.conditions,
        icone:        d.icon,
        ok_bardage:   _isFavorable(d)
      };
    });

    // Météo heure par heure pour aujourd'hui
    var heures = [];
    if (data.days[0] && data.days[0].hours) {
      heures = data.days[0].hours.map(function(h) {
        return {
          heure:        h.datetime,
          temp:         h.temp,
          precipitation: h.precip || 0,
          vent:         h.windspeed,
          conditions:   h.conditions,
          ok_bardage:   _isFavorableHeure(h)
        };
      });
    }

    return {
      adresse:   data.resolvedAddress,
      timezone:  data.timezone,
      jours,
      heures,
      resume:    _resumeChantier(jours)
    };

  } catch(err) {
    console.error('Erreur météo :', err.message);
    throw err;
  }
}

// --- Météo semaine (lundi - appel hebdo) ---
async function getMeteoHebdo(adresse) {
  return getMeteoSemaine(adresse);
}

// --- Vérifier si conditions favorables pour poser du bardage ---
function _isFavorable(jour) {
  return (
    jour.precip < 2 &&          // moins de 2mm de pluie
    jour.windspeed < 50 &&      // vent < 50 km/h
    jour.tempmax > 5            // température > 5°C
  );
}

function _isFavorableHeure(heure) {
  return (
    heure.precip < 0.5 &&
    heure.windspeed < 50 &&
    heure.temp > 5
  );
}

// --- Résumé pour notification chantier ---
function _resumeChantier(jours) {
  var bonnes = jours.filter(function(j){ return j.ok_bardage; }).length;
  var alertes = [];

  jours.forEach(function(j) {
    if (j.precipitation >= 2)  alertes.push('🌧️ Pluie ' + j.date);
    if (j.vent >= 50)          alertes.push('💨 Vent fort ' + j.date);
    if (j.tempMax <= 5)        alertes.push('🥶 Gel ' + j.date);
  });

  return {
    joursOK:    bonnes,
    joursTotaux: jours.length,
    alertes,
    message: bonnes + '/7 jours favorables pour la pose'
  };
}

module.exports = { getMeteoSemaine, getMeteoHebdo };
