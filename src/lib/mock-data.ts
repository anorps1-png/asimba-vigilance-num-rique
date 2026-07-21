// Géodonnées statiques (regions/villes) + types/données du mode simulation
// hors-ligne de signalements.tsx (quand Supabase n'est pas configuré). Les
// jeux de données factices consommés par l'UI ont été remplacés par de vraies
// requêtes Supabase (voir src/lib/queries/).

export type Severity = "critique" | "eleve" | "moyen" | "faible";
export type AlertStatus = "nouveau" | "en_cours" | "assigne" | "resolu" | "clos";
export type Category =
  | "Incitation à la violence"
  | "Désinformation"
  | "Harcèlement"
  | "Escroquerie"
  | "Atteintes sexuelles"
  | "Discours de haine"
  | "Protection de l'enfance";

export type Platform = "Facebook" | "TikTok" | "WhatsApp" | "X (Twitter)" | "YouTube" | "Autres";

export const regions = [
  "Adamaoua",
  "Centre",
  "Est",
  "Extrême-Nord",
  "Littoral",
  "Nord",
  "Nord-Ouest",
  "Ouest",
  "Sud",
  "Sud-Ouest",
];

export const villes: Record<string, { lat: number; lng: number; region: string }> = {
  Yaoundé: { lat: 3.848, lng: 11.502, region: "Centre" },
  Douala: { lat: 4.051, lng: 9.768, region: "Littoral" },
  Bafoussam: { lat: 5.478, lng: 10.417, region: "Ouest" },
  Bamenda: { lat: 5.959, lng: 10.146, region: "Nord-Ouest" },
  Garoua: { lat: 9.302, lng: 13.397, region: "Nord" },
  Maroua: { lat: 10.591, lng: 14.316, region: "Extrême-Nord" },
  Ngaoundéré: { lat: 7.317, lng: 13.583, region: "Adamaoua" },
  Bertoua: { lat: 4.577, lng: 13.685, region: "Est" },
  Ebolowa: { lat: 2.9, lng: 11.15, region: "Sud" },
  Buéa: { lat: 4.155, lng: 9.231, region: "Sud-Ouest" },
  Kribi: { lat: 2.947, lng: 9.907, region: "Sud" },
  Limbé: { lat: 4.023, lng: 9.196, region: "Sud-Ouest" },
};

export interface Alert {
  id: string;
  reference: string;
  titre: string;
  extrait: string;
  categorie: Category;
  severite: Severity;
  score: number;
  confiance: number;
  statut: AlertStatus;
  source: Platform;
  langue: "Français" | "Anglais" | "Camfranglais" | "Pidgin";
  ville: string;
  region: string;
  detecte: string; // ISO
  motsCles: string[];
  propagation: "très rapide" | "rapide" | "modérée" | "lente";
  analyste?: string;
  resume: string;
  recommandation: string;
}

const analystes = [
  "N. Mbarga",
  "S. Ekambi",
  "A. Nkoulou",
  "F. Tchoumi",
  "L. Bakari",
  "P. Kouam",
  "R. Ngono",
];

const titres: Array<Omit<Alert, "id" | "reference" | "detecte" | "analyste">> = [
  {
    titre: "Appel à attaquer un quartier ce soir à Douala",
    extrait:
      "Le contenu appelle explicitement à s'en prendre à un groupe de personnes dans le quartier cité. Plusieurs expressions de violence détectées.",
    categorie: "Incitation à la violence",
    severite: "critique",
    score: 92,
    confiance: 96,
    statut: "nouveau",
    source: "Facebook",
    langue: "Français",
    ville: "Douala",
    region: "Littoral",
    motsCles: ["attaquer", "tuer", "vengeance", "quartier", "groupe"],
    propagation: "très rapide",
    resume:
      "Publication virale (2 300 partages en 3 h) appelant à des représailles physiques contre une communauté à Bépanda.",
    recommandation:
      "Transmettre immédiatement aux autorités compétentes et déclencher la surveillance de propagation.",
  },
  {
    titre: "Vidéo de désinformation sur une épidémie fictive",
    extrait:
      "Vidéo TikTok affirmant qu'une épidémie mortelle a débuté à Yaoundé. Aucune source officielle ne confirme.",
    categorie: "Désinformation",
    severite: "eleve",
    score: 78,
    confiance: 89,
    statut: "en_cours",
    source: "TikTok",
    langue: "Français",
    ville: "Yaoundé",
    region: "Centre",
    motsCles: ["épidémie", "mort", "hôpital", "gouvernement"],
    propagation: "rapide",
    resume:
      "Contenu générant panique et méfiance envers les autorités sanitaires. 48 000 vues en 12 h.",
    recommandation: "Publier un démenti officiel avec le Ministère de la Santé Publique.",
  },
  {
    titre: "Harcèlement d'une jeune fille en ligne",
    extrait:
      "Fil de commentaires ciblant nommément une lycéenne de 16 ans avec insultes, menaces et divulgation d'informations personnelles.",
    categorie: "Harcèlement",
    severite: "eleve",
    score: 81,
    confiance: 93,
    statut: "assigne",
    source: "Facebook",
    langue: "Français",
    ville: "Bafoussam",
    region: "Ouest",
    motsCles: ["harcèlement", "menaces", "doxxing", "mineure"],
    propagation: "modérée",
    resume:
      "Cyberharcèlement organisé, éléments constitutifs d'atteinte à la vie privée d'une mineure.",
    recommandation:
      "Signaler à la plateforme et transmettre à la Brigade Spéciale de la Cybercriminalité.",
  },
  {
    titre: "Rumeur sur une coupure d'Internet nationale",
    extrait:
      "Message WhatsApp affirmant que le gouvernement coupera Internet pendant 72 h. Aucun communiqué officiel.",
    categorie: "Désinformation",
    severite: "moyen",
    score: 58,
    confiance: 82,
    statut: "en_cours",
    source: "WhatsApp",
    langue: "Français",
    ville: "Yaoundé",
    region: "Centre",
    motsCles: ["coupure", "internet", "gouvernement", "72h"],
    propagation: "rapide",
    resume: "Rumeur diffusée dans plus de 40 groupes WhatsApp signalés.",
    recommandation: "Diffuser un fact-check public via les partenaires média.",
  },
  {
    titre: "Fausse information sur les examens GCE",
    extrait:
      "Publication affirmant que les résultats du GCE ont été annulés. Information démentie par le GCE Board.",
    categorie: "Désinformation",
    severite: "moyen",
    score: 54,
    confiance: 90,
    statut: "nouveau",
    source: "Facebook",
    langue: "Anglais",
    ville: "Buéa",
    region: "Sud-Ouest",
    motsCles: ["GCE", "examens", "annulés", "résultats"],
    propagation: "modérée",
    resume: "Contenu pouvant provoquer de la panique chez les candidats et leurs familles.",
    recommandation: "Coordonner un démenti avec le GCE Board.",
  },
  {
    titre: "Escroquerie à la loterie MTN présumée",
    extrait:
      "SMS et lien signalés par 42 citoyens promettant un gain de 5 000 000 FCFA au nom de MTN Cameroon.",
    categorie: "Escroquerie",
    severite: "eleve",
    score: 74,
    confiance: 95,
    statut: "en_cours",
    source: "WhatsApp",
    langue: "Français",
    ville: "Douala",
    region: "Littoral",
    motsCles: ["loterie", "MTN", "gain", "code", "carte"],
    propagation: "rapide",
    resume: "Campagne d'hameçonnage active visant des utilisateurs mobiles.",
    recommandation: "Alerter MTN Cameroon et les opérateurs pour blocage des numéros émetteurs.",
  },
  {
    titre: "Contenu sensible impliquant un mineur détecté",
    extrait:
      "Image signalée automatiquement par le classifieur de protection de l'enfance. Analyse humaine requise.",
    categorie: "Protection de l'enfance",
    severite: "critique",
    score: 97,
    confiance: 98,
    statut: "assigne",
    source: "X (Twitter)",
    langue: "Français",
    ville: "Yaoundé",
    region: "Centre",
    motsCles: ["mineur", "image", "protection"],
    propagation: "lente",
    resume: "Signalement automatique par le module de protection. Contenu masqué en attente.",
    recommandation: "Escalade immédiate vers la cellule spécialisée et INTERPOL.",
  },
  {
    titre: "Discours de haine ethnique dans un live",
    extrait: "Direct Facebook avec propos ciblant une communauté ethnique. 14 signalements reçus.",
    categorie: "Discours de haine",
    severite: "eleve",
    score: 83,
    confiance: 91,
    statut: "en_cours",
    source: "Facebook",
    langue: "Camfranglais",
    ville: "Bamenda",
    region: "Nord-Ouest",
    motsCles: ["haine", "ethnie", "insultes"],
    propagation: "modérée",
    resume: "Live suivi par 1 200 personnes, éléments haineux répétés.",
    recommandation: "Signalement plateforme + suivi juridique.",
  },
  {
    titre: "Arnaque à l'emploi fictif à l'étranger",
    extrait:
      "Publication promettant des emplois au Canada moyennant frais de dossier. Multiples victimes.",
    categorie: "Escroquerie",
    severite: "moyen",
    score: 61,
    confiance: 88,
    statut: "resolu",
    source: "Facebook",
    langue: "Français",
    ville: "Garoua",
    region: "Nord",
    motsCles: ["emploi", "Canada", "visa", "frais"],
    propagation: "lente",
    resume: "Réseau d'escroquerie identifié, 3 comptes signalés supprimés.",
    recommandation: "Publication d'un guide de prévention.",
  },
  {
    titre: "Fausse alerte inondation à Maroua",
    extrait:
      "Message annonçant l'évacuation immédiate du centre-ville. Aucune confirmation officielle.",
    categorie: "Désinformation",
    severite: "faible",
    score: 34,
    confiance: 76,
    statut: "clos",
    source: "WhatsApp",
    langue: "Français",
    ville: "Maroua",
    region: "Extrême-Nord",
    motsCles: ["inondation", "évacuation", "urgence"],
    propagation: "lente",
    resume: "Rumeur circonscrite après vérification avec la Protection Civile.",
    recommandation: "Aucune action supplémentaire requise.",
  },
];

function pad(n: number, w = 6) {
  return String(n).padStart(w, "0");
}

export const alerts: Alert[] = Array.from({ length: 24 }).map((_, i) => {
  const base = titres[i % titres.length];
  const date = new Date();
  date.setHours(date.getHours() - i * 3 - 2);
  return {
    ...base,
    id: `alert-${i + 1}`,
    reference: `#A-2026-${pad(128 - i)}`,
    detecte: date.toISOString(),
    analyste: i % 3 === 0 ? undefined : analystes[i % analystes.length],
  };
});

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
