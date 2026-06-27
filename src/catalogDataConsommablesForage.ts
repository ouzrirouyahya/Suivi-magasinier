import { CatalogItem } from './types';

export interface ConsommablePriceConfig {
  id: string;
  reference: string;
  designation: string;
  basePrice: number;      // Prix d'achat standard (modifiable)
  sellingPrice: number;   // Prix de vente / utilisation (modifiable)
  currency: string;       // 'MAD' par défaut
  lastUpdated: string;    // Date de dernière modification
  updatedBy: string;      // Qui a modifié le prix
}

export const CONSOMMABLES_PRICES: ConsommablePriceConfig[] = [
  {
    id: 'for_bar_01',
    reference: 'FOR-BAR-180',
    designation: 'Barre conique H22 Longueur 1.8m',
    basePrice: 1200,
    sellingPrice: 1200,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'for_bar_02',
    reference: 'FOR-BAR-240',
    designation: 'Barre conique H22 Longueur 2.4m',
    basePrice: 1600,
    sellingPrice: 1600,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'for_tai_01',
    reference: 'FOR-TAI-038',
    designation: 'Taillant bouton 38mm',
    basePrice: 380,
    sellingPrice: 380,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'for_tai_02',
    reference: 'FOR-TAI-041',
    designation: 'Taillant bouton 41mm',
    basePrice: 450,
    sellingPrice: 450,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'for_tai_03',
    reference: 'FOR-TAI-045',
    designation: 'Taillant bouton 45mm',
    basePrice: 1200,
    sellingPrice: 1200,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'for_ada_01',
    reference: 'FOR-ADA-2245',
    designation: 'Adaptateur queue 22x108 / T45',
    basePrice: 2800,
    sellingPrice: 2800,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
];

const getPrice = (id: string): number => {
  const config = CONSOMMABLES_PRICES.find(p => p.id === id);
  return config?.sellingPrice || 0;
};

const RAW_ITEMS: Array<Record<string, any>> = [
  {
    id: 'for_bar_01',
    reference: 'FOR-BAR-180',
    designation: 'Barre conique H22 Longueur 1.8m',
    unit: 'PIECE',
    price: getPrice('for_bar_01'),
    functionalCategory: 'Barres de Forage',
    component: 'Barre conique',
    subComponent: 'Acier allié chrome-molybdène',
    compatibility: 'Tous perforateurs 22x108',
    suggestedType: 'CONSOMMABLES',
    stockQty: 45,
    minStock: 20,
    criticalStock: 10,
    leadTimeDays: 14,
    commonName: 'Barre 1m80',
    searchTags: ['barre', 'forage', 'conique', 'h22', '1.8m'],
    notes: 'Queue 22x108mm, acier allié traité',
  },
  {
    id: 'for_bar_02',
    reference: 'FOR-BAR-240',
    designation: 'Barre conique H22 Longueur 2.4m',
    unit: 'PIECE',
    price: getPrice('for_bar_02'),
    functionalCategory: 'Barres de Forage',
    component: 'Barre conique',
    subComponent: 'Acier allié chrome-molybdène',
    compatibility: 'Tous perforateurs 22x108',
    suggestedType: 'CONSOMMABLES',
    stockQty: 30,
    minStock: 15,
    criticalStock: 8,
    leadTimeDays: 14,
    commonName: 'Barre 2m40',
    searchTags: ['barre', 'forage', 'conique', 'h22', '2.4m'],
    notes: 'Queue 22x108mm, acier allié traité',
  },
  {
    id: 'for_tai_01',
    reference: 'FOR-TAI-038',
    designation: 'Taillant bouton 38mm',
    unit: 'PIECE',
    price: getPrice('for_tai_01'),
    functionalCategory: 'Taillants & Boutons',
    component: 'Taillant bouton',
    subComponent: 'Carbure de tungstène',
    compatibility: 'Tous perforateurs 22x108',
    suggestedType: 'CONSOMMABLES',
    stockQty: 120,
    minStock: 50,
    criticalStock: 20,
    leadTimeDays: 7,
    commonName: 'Taillant 38mm',
    searchTags: ['taillant', 'bouton', '38mm', 'carbure'],
    notes: 'Diamètre 38mm, angle 110°',
  },
  {
    id: 'for_tai_02',
    reference: 'FOR-TAI-041',
    designation: 'Taillant bouton 41mm',
    unit: 'PIECE',
    price: getPrice('for_tai_02'),
    functionalCategory: 'Taillants & Boutons',
    component: 'Taillant bouton',
    subComponent: 'Carbure de tungstène',
    compatibility: 'Tous perforateurs 22x108',
    suggestedType: 'CONSOMMABLES',
    stockQty: 80,
    minStock: 40,
    criticalStock: 15,
    leadTimeDays: 7,
    commonName: 'Taillant 41mm',
    searchTags: ['taillant', 'bouton', '41mm', 'carbure'],
    notes: 'Diamètre 41mm, angle 110°',
  },
  {
    id: 'for_tai_03',
    reference: 'FOR-TAI-045',
    designation: 'Taillant bouton 45mm',
    unit: 'PIECE',
    price: getPrice('for_tai_03'),
    functionalCategory: 'Taillants & Boutons',
    component: 'Taillant bouton',
    subComponent: 'Carbure de tungstène',
    compatibility: 'Tous perforateurs 22x108',
    suggestedType: 'CONSOMMABLES',
    stockQty: 60,
    minStock: 30,
    criticalStock: 12,
    leadTimeDays: 10,
    commonName: 'Bouton 45mm',
    searchTags: ['taillant', 'bouton', '45mm', 'carbure'],
    notes: 'Diamètre 45mm, 7 boutons',
  },
  {
    id: 'for_ada_01',
    reference: 'FOR-ADA-2245',
    designation: 'Adaptateur queue 22x108 / T45',
    unit: 'PIECE',
    price: getPrice('for_ada_01'),
    functionalCategory: 'Adaptateurs & Raccords',
    component: 'Adaptateur',
    subComponent: 'Acier allié traité',
    compatibility: 'Tous perforateurs 22x108',
    suggestedType: 'CONSOMMABLES',
    stockQty: 15,
    minStock: 8,
    criticalStock: 3,
    leadTimeDays: 30,
    commonName: 'Adaptateur 22/T45',
    searchTags: ['adaptateur', '22x108', 't45', 'raccord'],
    notes: 'Connexion 22x108 vers T45',
  },
];

export const CONSOMMABLES_FORAGE_CATALOG: CatalogItem[] = RAW_ITEMS.map(it => ({
  id: it.id,
  reference: it.reference,
  designation: it.designation,
  unit: it.unit,
  price: getPrice(it.id), // Dynamically bind price from CONSOMMABLES_PRICES
  functionalCategory: it.functionalCategory,
  component: it.component,
  subComponent: it.subComponent,
  compatibility: it.compatibility,
  suggestedType: it.suggestedType,
  stockQty: it.stockQty ?? Math.round(Math.sin(it.price) * 15 + 20),
  minStock: it.minStock ?? 10,
  criticalStock: it.criticalStock ?? 5,
  leadTimeDays: it.leadTimeDays ?? 14,
  commonName: it.commonName,
  searchTags: it.searchTags,
  notes: it.notes,
})) as CatalogItem[];

export function updateConsommablePrice(
  id: string,
  newPrice: number,
  updatedBy: string = 'magasinier'
): boolean {
  const config = CONSOMMABLES_PRICES.find(p => p.id === id);
  if (!config) return false;
  config.basePrice = newPrice;
  config.sellingPrice = newPrice;
  config.lastUpdated = new Date().toISOString();
  config.updatedBy = updatedBy;
  
  // Also update corresponding catalog item price inside CONSOMMABLES_FORAGE_CATALOG
  const catalogItem = CONSOMMABLES_FORAGE_CATALOG.find(item => item.id === id);
  if (catalogItem) {
    catalogItem.price = newPrice;
  }
  return true;
}

export function getAllConsommablesPrices(): ConsommablePriceConfig[] {
  return [...CONSOMMABLES_PRICES];
}
