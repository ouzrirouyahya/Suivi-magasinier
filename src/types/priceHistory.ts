export interface PriceChangeRecord {
  id: string;
  itemId: string;
  itemReference: string;
  itemDesignation: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;        // UID ou nom du magasinier
  changedByName: string;    // Nom affichable
  changedAt: string;        // ISO timestamp
  reason?: string;          // Raison du changement (optionnel)
  category: string;         // 'CONSOMMABLES' | 'EPI' | 'OUTILS_TRAVAUX'
}
