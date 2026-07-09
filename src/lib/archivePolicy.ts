import { SITE_CODES } from './constants';

export const ARCHIVE_POLICY = {
  // Durée de rétention en ligne (jours)
  online: {
    mouvements: 365,          // 1 an actif
    auditLogs: 365,           // 1 an actif
    notifications: 90,        // 3 mois
    messageTelemetry: 30,     // 1 mois
    messages: 365,            // 1 an
    bannerViews: 90,          // 3 mois
    anomalyReports: 180,      // 6 mois
    purchaseRequests: 365,    // 1 an
    distributionEPI: 365,     // 1 an
  },
  // Collections permanentes (ne pas archiver)
  permanent: [
    'transferts',             // Traçabilité légale inter-sites
    'inventaires',            // Conformité audit minier
    'deletionRequests',       // Traçabilité RH
    'monthlyClosings',        // Comptabilité officielle
    'accounts',               // Gestion utilisateurs
    'articles',               // Référentiel stock
    'catalog',                // Bibliothèque technique
    'hydromines_catalog',     // Catalogue officiel Hydromines
  ]
} as const;

// Calculer la date limite pour une collection
export function getArchiveThreshold(collection: keyof typeof ARCHIVE_POLICY.online): Date {
  const days = ARCHIVE_POLICY.online[collection];
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return threshold;
}

// Estimer le volume actuel
export function estimateCollectionGrowth(
  docsPerDay: number,
  years: number
): { totalDocs: number; onlineDocs: number; archivedDocs: number } {
  const totalDays = years * 365;
  const totalDocs = docsPerDay * 5 * totalDays; // × 5 chantiers
  return {
    totalDocs,
    onlineDocs: docsPerDay * 5 * 365,  // 1 an en ligne
    archivedDocs: Math.max(0, totalDocs - (docsPerDay * 5 * 365))
  };
}
