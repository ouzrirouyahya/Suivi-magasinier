import { CatalogItem } from './types';
import { logPriceChange } from './services/priceHistory.service';

export interface EPIPriceConfig {
  id: string;
  reference: string;
  designation: string;
  basePrice: number;
  sellingPrice: number;
  currency: string;
  lastUpdated: string;
  updatedBy: string;
}

export const EPI_PRICES: EPIPriceConfig[] = [
  {
    id: 'epi_bot_01',
    reference: 'EPI-BOT-001',
    designation: 'Bottes PVC minières bout acier',
    basePrice: 130,
    sellingPrice: 130,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'epi_cha_01',
    reference: 'EPI-CHA-001',
    designation: 'Chaussures de sécurité S3',
    basePrice: 180,
    sellingPrice: 180,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'epi_lun_01',
    reference: 'EPI-LUN-001',
    designation: 'Lunettes de sécurité incassables',
    basePrice: 25,
    sellingPrice: 25,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'epi_gan_01',
    reference: 'EPI-GAN-001',
    designation: 'Gants de travail renforcés',
    basePrice: 40,
    sellingPrice: 40,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'epi_com_01',
    reference: 'EPI-COM-001',
    designation: 'Combinaison de travail coton',
    basePrice: 100,
    sellingPrice: 100,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'epi_har_01',
    reference: 'EPI-HAR-001',
    designation: 'Harnais de sécurité antichute',
    basePrice: 200,
    sellingPrice: 200,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'epi_cas_01',
    reference: 'EPI-CAS-001',
    designation: 'Casque de sécurité blanc',
    basePrice: 65,
    sellingPrice: 65,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'epi_mas_01',
    reference: 'EPI-MAS-001',
    designation: 'Masque anti-poussière 3M 6200',
    basePrice: 15,
    sellingPrice: 15,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
  {
    id: 'epi_cab_01',
    reference: 'EPI-CAB-001',
    designation: 'Casque anti-bruit serre-tête',
    basePrice: 50,
    sellingPrice: 50,
    currency: 'MAD',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
  },
];

const getPrice = (id: string): number => {
  const config = EPI_PRICES.find(p => p.id === id);
  return config?.sellingPrice || 0;
};

const RAW_ITEMS: Array<Record<string, any>> = [
  {
    id: 'epi_bot_01',
    reference: 'EPI-BOT-001',
    designation: 'Bottes PVC minières bout acier',
    unit: 'PAIRE',
    price: getPrice('epi_bot_01'),
    functionalCategory: 'Protection Pieds',
    component: 'Bottes PVC',
    subComponent: 'Bout en acier',
    compatibility: 'Tous personnels',
    suggestedType: 'EPI',
    stockQty: 85,
    minStock: 30,
    criticalStock: 15,
    leadTimeDays: 5,
    commonName: 'Bottes acier',
    searchTags: ['bottes', 'pvc', 'pieds', 'protection', 'acier'],
    notes: 'Haute résistance, semelle crantée anti-perforation',
  },
  {
    id: 'epi_cha_01',
    reference: 'EPI-CHA-001',
    designation: 'Chaussures de sécurité S3',
    unit: 'PAIRE',
    price: getPrice('epi_cha_01'),
    functionalCategory: 'Protection Pieds',
    component: 'Chaussures S3',
    subComponent: 'Cuir hydrofuge',
    compatibility: 'Tous personnels',
    suggestedType: 'EPI',
    stockQty: 110,
    minStock: 40,
    criticalStock: 20,
    leadTimeDays: 5,
    commonName: 'Chaussures S3',
    searchTags: ['chaussures', 'securite', 's3', 'pieds'],
    notes: 'Embout composite, semelle anti-perforation non métallique',
  },
  {
    id: 'epi_lun_01',
    reference: 'EPI-LUN-001',
    designation: 'Lunettes de sécurité incassables',
    unit: 'PIECE',
    price: getPrice('epi_lun_01'),
    functionalCategory: 'Protection Yeux',
    component: 'Lunettes',
    subComponent: 'Polycarbonate',
    compatibility: 'Tous personnels',
    suggestedType: 'EPI',
    stockQty: 250,
    minStock: 80,
    criticalStock: 30,
    leadTimeDays: 3,
    commonName: 'Lunettes de protection',
    searchTags: ['lunettes', 'yeux', 'polycarbonate', 'incassable'],
    notes: 'Traitement anti-buée et anti-rayures',
  },
  {
    id: 'epi_gan_01',
    reference: 'EPI-GAN-001',
    designation: 'Gants de travail renforcés',
    unit: 'PAIRE',
    price: getPrice('epi_gan_01'),
    functionalCategory: 'Protection Mains',
    component: 'Gants',
    subComponent: 'Cuir et textile',
    compatibility: 'Tous personnels',
    suggestedType: 'EPI',
    stockQty: 400,
    minStock: 150,
    criticalStock: 50,
    leadTimeDays: 3,
    commonName: 'Gants renforcés',
    searchTags: ['gants', 'mains', 'cuir', 'renforced', 'travail'],
    notes: 'Forte résistance à l\'abrasion et à la déchirure',
  },
  {
    id: 'epi_com_01',
    reference: 'EPI-COM-001',
    designation: 'Combinaison de travail coton',
    unit: 'PIECE',
    price: getPrice('epi_com_01'),
    functionalCategory: 'Protection Corps',
    component: 'Combinaison',
    subComponent: 'Coton 100%',
    compatibility: 'Tous personnels',
    suggestedType: 'EPI',
    stockQty: 180,
    minStock: 60,
    criticalStock: 25,
    leadTimeDays: 7,
    commonName: 'Bleu de travail',
    searchTags: ['combinaison', 'bleu', 'coton', 'corps', 'vêtement'],
    notes: 'Grammage lourd 300g/m², multipoches',
  },
  {
    id: 'epi_har_01',
    reference: 'EPI-HAR-001',
    designation: 'Harnais de sécurité antichute',
    unit: 'PIECE',
    price: getPrice('epi_har_01'),
    functionalCategory: 'Protection Antichute',
    component: 'Harnais',
    subComponent: 'Sangles polyester',
    compatibility: 'Tous personnels',
    suggestedType: 'EPI',
    stockQty: 30,
    minStock: 10,
    criticalStock: 5,
    leadTimeDays: 10,
    commonName: 'Harnais antichute',
    searchTags: ['harnais', 'securite', 'antichute', 'hauteur'],
    notes: '2 points d\'accrochage (dorsal et sternal), réglable',
  },
  {
    id: 'epi_cas_01',
    reference: 'EPI-CAS-001',
    designation: 'Casque de sécurité blanc',
    unit: 'PIECE',
    price: getPrice('epi_cas_01'),
    functionalCategory: 'Protection Tête',
    component: 'Casque',
    subComponent: 'Polyéthylène haute densité',
    compatibility: 'Tous personnels',
    suggestedType: 'EPI',
    stockQty: 150,
    minStock: 50,
    criticalStock: 20,
    leadTimeDays: 5,
    commonName: 'Casque de chantier',
    searchTags: ['casque', 'tête', 'blanc', 'chantier'],
    notes: 'Harnais suspension 6 points, réglage crémaillère',
  },
  {
    id: 'epi_mas_01',
    reference: 'EPI-MAS-001',
    designation: 'Masque anti-poussière 3M 6200',
    unit: 'PIECE',
    price: getPrice('epi_mas_01'),
    functionalCategory: 'Protection Respiratoire',
    component: 'Masque demi-facial',
    subComponent: 'Élastomère thermoplastique',
    compatibility: 'Tous personnels',
    suggestedType: 'EPI',
    stockQty: 90,
    minStock: 30,
    criticalStock: 10,
    leadTimeDays: 7,
    commonName: 'Demi-masque 3M',
    searchTags: ['masque', 'poussière', '3m', '6200', 'respiratoire'],
    notes: 'Demi-masque réutilisable à double cartouches (vendues séparément)',
  },
  {
    id: 'epi_cab_01',
    reference: 'EPI-CAB-001',
    designation: 'Casque anti-bruit serre-tête',
    unit: 'PIECE',
    price: getPrice('epi_cab_01'),
    functionalCategory: 'Protection Auditive',
    component: 'Casque anti-bruit',
    subComponent: 'Mousse et ABS',
    compatibility: 'Tous personnels',
    suggestedType: 'EPI',
    stockQty: 65,
    minStock: 20,
    criticalStock: 8,
    leadTimeDays: 5,
    commonName: 'Serre-tête anti-bruit',
    searchTags: ['casque', 'bruit', 'auditive', 'protection'],
    notes: 'Atténuation sonore SNR 30dB, coussinets confortables',
  },
];

export const EPI_CATALOG: CatalogItem[] = RAW_ITEMS.map(it => ({
  id: it.id,
  reference: it.reference,
  designation: it.designation,
  unit: it.unit,
  price: getPrice(it.id),
  functionalCategory: it.functionalCategory,
  component: it.component,
  subComponent: it.subComponent,
  compatibility: it.compatibility,
  suggestedType: it.suggestedType,
  stockQty: it.stockQty,
  minStock: it.minStock,
  criticalStock: it.criticalStock,
  leadTimeDays: it.leadTimeDays,
  commonName: it.commonName,
  searchTags: it.searchTags,
  notes: it.notes,
})) as CatalogItem[];

export function updateEPIPrice(
  id: string,
  newPrice: number,
  updatedBy: string = 'magasinier',
  reason?: string
): boolean {
  const config = EPI_PRICES.find(p => p.id === id);
  if (!config) return false;
  
  const oldPrice = config.sellingPrice;
  
  config.basePrice = newPrice;
  config.sellingPrice = newPrice;
  config.lastUpdated = new Date().toISOString();
  config.updatedBy = updatedBy;
  
  // Also update corresponding catalog item price inside EPI_CATALOG
  const catalogItem = EPI_CATALOG.find(item => item.id === id);
  if (catalogItem) {
    catalogItem.price = newPrice;
  }

  // Log price change asynchronously
  logPriceChange({
    itemId: id,
    itemReference: config.reference,
    itemDesignation: config.designation,
    oldPrice,
    newPrice,
    changedBy: updatedBy,
    changedByName: updatedBy,
    changedAt: new Date().toISOString(),
    reason,
    category: 'EPI',
  }).catch(console.error);

  return true;
}

export function getAllEPIPrices(): EPIPriceConfig[] {
  return [...EPI_PRICES];
}
