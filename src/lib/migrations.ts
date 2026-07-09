// Version actuelle du schéma
export const SCHEMA_VERSION = 1;

// Migrations à appliquer par document
export const migrations: Record<string, (doc: any, fromVersion: number) => any> = {
  accounts: (doc, from) => {
    if (from < 1) {
      // Migration v0 → v1 : renommer assignedSite en siteCode (exemple futur)
      // if (doc.assignedSite && !doc.siteCode) {
      //   doc.siteCode = doc.assignedSite;
      //   delete doc.assignedSite;
      // }
    }
    return doc;
  },
  articles: (doc, from) => {
    if (from < 1) {
      // Assurer backward compat avec priceHistory compact
      if (doc.priceHistory && Array.isArray(doc.priceHistory)) {
        doc.priceHistory = doc.priceHistory.map((e: any) => {
          // Vieux format : { price, date, movementId, ... }
          // Nouveau format compact : { p, d, q }
          if ('price' in e && !('p' in e)) {
            return { p: e.price, d: e.date?.slice(0, 10) || '', q: e.quantityAttached || 0 };
          }
          return e;
        });
      }
    }
    return doc;
  },
  mouvements: (doc, from) => {
    if (from < 1) {
      // Migration items : ajouter condition si absent (rétrocompat ReturnsManagement)
      if (doc.items && Array.isArray(doc.items)) {
        doc.items = doc.items.map((item: any) => ({
          ...item,
          // articleDesignation/Ref/Unit : snapshot ajouté en v41
          articleDesignation: item.articleDesignation || '',
          articleRef: item.articleRef || '',
          articleUnit: item.articleUnit || 'PIECE',
        }));
      }
    }
    return doc;
  },
  transferts: (doc, from) => {
    if (from < 1) {
      // Normaliser les statuts bilingues
      if (doc.status === 'EN_TRANSIT') doc.status = 'IN_TRANSIT';
      if (doc.status === 'RECU') doc.status = 'RECEIVED';
    }
    return doc;
  }
};

// Appliquer les migrations à un document
export function migrateDocument(collection: string, doc: any): any {
  const docVersion = doc.__schemaVersion || 0;
  if (docVersion >= SCHEMA_VERSION) return doc;
  
  const migrator = migrations[collection];
  if (!migrator) return doc;
  
  const migrated = migrator({ ...doc }, docVersion);
  return { ...migrated, __schemaVersion: SCHEMA_VERSION };
}
