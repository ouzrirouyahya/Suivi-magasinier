import { Article, Mouvement, EnginMaster, PerfoMaster, AgentMaster, SiteCode } from './types';

export const SITES: { code: SiteCode; label: string }[] = [
  { code: 'SMI', label: 'Site SMI' },
  { code: 'OUMEJRANE', label: 'Site Ouméjrane' },
  { code: 'KOUDIA', label: 'Site Koudia' },
  { code: 'BOU-AZZER', label: 'Site Bou-Azzer' },
  { code: 'OUANSIMI', label: 'Site Ouansimi' }
];

export const SERVICES = [
  'MAINTENANCE',
  'FORAGE',
  'TRANSPORT & LOGISTIQUE',
  'HSE',
  'ADMINISTRATION',
  'MÉCANICIEN',
  'FOREUR / MINEUR'
];

export const INITIAL_ENGINS: EnginMaster[] = [
  { id: 'e1_smi', code: 'EX-01', label: 'Excavatrice Cat 336', site: 'SMI', type: 'PELLE' },
  { id: 'e2_smi', code: 'DT-12', label: 'Dumper Terex 40t', site: 'SMI', type: 'DUMPER' },
  { id: 'e1_oumj', code: 'A40G-01', label: 'Tombereau Volvo', site: 'OUMEJRANE', type: 'DUMPER' },
];

export const INITIAL_PERFOS: PerfoMaster[] = [
  { id: 'p1_smi', code: 'PERFO 1', site: 'SMI' },
  { id: 'p2_smi', code: 'PERFO 2', site: 'SMI' },
];

export const INITIAL_AGENTS: AgentMaster[] = [
  { id: 'a1', matricule: 'M001', firstname: 'Ahmed', lastname: 'Brahimi', service: 'MAINTENANCE', site: 'SMI' },
  { id: 'a2', matricule: 'M042', firstname: 'Jean', lastname: 'Dupont', service: 'FORAGE', site: 'SMI' },
  { id: 'a3', matricule: 'M105', firstname: 'Momo', lastname: 'Diallo', service: 'LOGISTIQUE', site: 'SMI' },
  { id: 'a4', matricule: 'M220', firstname: 'Karim', lastname: 'Nasri', service: 'MAINTENANCE', site: 'OUMEJRANE' },
  { id: 'a5', matricule: 'M315', firstname: 'Said', lastname: 'Belkacem', service: 'FORAGE', site: 'OUMEJRANE' },
];

export const INITIAL_ARTICLES: Article[] = [
  // Site SMI - ENGINS (Lourd)
  { id: 'smi_e1_m', site: 'SMI', ref: 'SMI-MOT-QSK60', designation: 'Moteur Cummins QSK60 - Reconditionné', type: 'ENGINS', category: 'Moteur', unit: 'Pcs', quantity: 2, minStock: 1, location: 'M-01', price: 145000, active: true },
  { id: 'smi_e2_h', site: 'SMI', ref: 'SMI-HYD-777', designation: 'Pompe Hydraulique CAT-777G Main', type: 'ENGINS', category: 'Hydraulique', unit: 'Pcs', quantity: 4, minStock: 2, location: 'H-12', price: 32000, active: true },
  { id: 'smi_e3_t', site: 'SMI', ref: 'SMI-TRA-D11', designation: 'Kit Train de Roulement Complet D11T', type: 'ENGINS', category: 'Train', unit: 'Kit', quantity: 1, minStock: 1, location: 'PARC-B', price: 85000, active: true },
  { id: 'smi_e4_f', site: 'SMI', ref: 'SMI-FIL-MAX', designation: 'Filtre Gasoil Séparateur Haute Capacité', type: 'ENGINS', category: 'Filtration', unit: 'Pcs', quantity: 45, minStock: 15, location: 'A-10', price: 280, active: true },
  
  // Site SMI - PERFORATEURS
  { id: 'smi_p1_c', site: 'SMI', ref: 'SMI-PER-COP18', designation: 'Marteau Atlas Copco COP 1838 (Occasion Certifiée)', type: 'PERFORATEURS', category: 'Perfo', unit: 'Pcs', quantity: 3, minStock: 2, location: 'P-05', price: 42000, active: true },
  { id: 'smi_p2_t', site: 'SMI', ref: 'SMI-PER-TIG', designation: 'Tige de Forage 12ft R32 MF', type: 'PERFORATEURS', category: 'Accessoire', unit: 'Pcs', quantity: 120, minStock: 30, location: 'EXT-01', price: 1150, active: true },
  { id: 'smi_p3_r', site: 'SMI', ref: 'SMI-PER-RET', designation: 'Taillant Retrac 76mm T45', type: 'PERFORATEURS', category: 'Consommable', unit: 'Pcs', quantity: 250, minStock: 50, location: 'P-08', price: 650, active: true },

  // Site OUMEJRANE - ENGINS
  { id: 'oumj_e1_f', site: 'OUMEJRANE', ref: 'OMJ-FIL-VOL', designation: 'Filtre Lubrifiant Volvo D13 (Pack 12)', type: 'ENGINS', category: 'Filtres', unit: 'Pack', quantity: 30, minStock: 10, location: 'W-44', price: 4800, active: true },
  { id: 'oumj_e2_a', site: 'OUMEJRANE', ref: 'OMJ-ALT-24V', designation: 'Alternateur 24V 150A Delco-Remy', type: 'ENGINS', category: 'Electrique', unit: 'Pcs', quantity: 6, minStock: 2, location: 'E-03', price: 2450, active: true },
  { id: 'oumj_e3_j', site: 'OUMEJRANE', ref: 'OMJ-JNT-740', designation: 'Kit Joints de Vérin Direction A40G', type: 'ENGINS', category: 'Hydraulique', unit: 'Kit', quantity: 12, minStock: 5, location: 'H-02', price: 950, active: true },

  // Site OUMEJRANE - PERFORATEURS
  { id: 'oumj_p1_x', site: 'OUMEJRANE', ref: 'OMJ-DX-800', designation: 'Tête de rotation SANDVIK DX800', type: 'PERFORATEURS', category: 'Composant', unit: 'Pcs', quantity: 1, minStock: 1, location: 'ATELIER-P', price: 58000, active: true },

  // Site KOUDIA - ENGINS
  { id: 'kou_e1', site: 'KOUDIA', ref: 'KOU-LUB-CAT', designation: 'Huile Transmission CAT TDTO 50 (Fût 200L)', type: 'ENGINS', category: 'Lubrifiants', unit: 'Fût', quantity: 10, minStock: 5, location: 'M-01', price: 5600, active: true },
  { id: 'kou_p1', site: 'KOUDIA', ref: 'KOU-PER-B11', designation: 'Couronne de Perçage 115mm Hard Rock', type: 'PERFORATEURS', category: 'Consommable', unit: 'Pcs', quantity: 45, minStock: 20, location: 'P-02', price: 2100, active: true },

  // Site BOU-AZZER - ENGINS
  { id: 'baz_e1', site: 'BOU-AZZER', ref: 'BAZ-MOT-DET', designation: 'Démarreur 24V Moteur Detroit Diesel', type: 'ENGINS', category: 'Electrique', unit: 'Pcs', quantity: 4, minStock: 2, location: 'E-12', price: 8900, active: true },
  { id: 'baz_c1', site: 'BOU-AZZER', ref: 'BAZ-CON-DIS', designation: 'Disque à Tronçonner Acier 230mm (Boîte 25)', type: 'CONSOMMABLES', category: 'Atelier', unit: 'Boîte', quantity: 15, minStock: 5, location: 'A-05', price: 450, active: true },

  // Site OUANSIMI - EPI
  { id: 'oua_e1', site: 'OUANSIMI', ref: 'OUA-EPI-GNT', designation: 'Gants PVC Anti-Acide Longs', type: 'EPI', category: 'Mains', unit: 'Paire', quantity: 120, minStock: 50, location: 'S-01', price: 42, active: true },
  { id: 'oua_p1', site: 'OUANSIMI', ref: 'OUA-PER-BIT', designation: 'Bit Shank T38 76mm Button Bit', type: 'PERFORATEURS', category: 'Consommables', unit: 'Pcs', quantity: 30, minStock: 10, location: 'P-01', price: 1850, active: true },

  // CONSOMMABLES (SMI)
  { id: 'gen_c1_g', site: 'SMI', ref: 'SMI-GRS-50', designation: 'Graisse EP2 Haute Température - Fût 50kg', type: 'CONSOMMABLES', category: 'Lubrifiants', unit: 'Fût', quantity: 20, minStock: 8, location: 'MAG-LUB', price: 3200, active: true },
  { id: 'gen_c2_h', site: 'SMI', ref: 'SMI-HUI-200', designation: 'Huile Hydraulique ISO 46 - Fût 200L', type: 'CONSOMMABLES', category: 'Lubrifiants', unit: 'Fût', quantity: 15, minStock: 5, location: 'MAG-LUB', price: 4850, active: true },
  { id: 'gen_c3_o', site: 'SMI', ref: 'SMI-OXY-SET', designation: 'Kit Chalumeau Oxy-Acétylène Complet', type: 'CONSOMMABLES', category: 'Soudure', unit: 'Kit', quantity: 5, minStock: 2, location: 'A-SOUD', price: 12500, active: true },

  // OUTILS TRAVAUX (SMI)
  { id: 'smi_ot1', site: 'SMI', ref: 'SMI-OT-BAR-18', designation: 'Barre conique 1,8m', type: 'OUTILS_TRAVAUX', category: 'Forage', unit: 'Pcs', quantity: 15, minStock: 5, location: 'P-09', price: 1450, active: true },
  { id: 'smi_ot2', site: 'SMI', ref: 'SMI-OT-TAI-38', designation: 'Taillant 38mm', type: 'OUTILS_TRAVAUX', category: 'Forage', unit: 'Pcs', quantity: 45, minStock: 10, location: 'P-10', price: 380, active: true },
  { id: 'smi_ot3', site: 'SMI', ref: 'SMI-OT-MAN-R32', designation: 'Manchon R32', type: 'OUTILS_TRAVAUX', category: 'Forage', unit: 'Pcs', quantity: 30, minStock: 12, location: 'P-11', price: 520, active: true },

  // EPI (SMI & OUMJ)
  { id: 'epi_1_smi', site: 'SMI', ref: 'EPI-CAS-W', designation: 'Casque de Sécurité MSA V-Gard Blanc', type: 'EPI', category: 'Tête', unit: 'Pcs', quantity: 45, minStock: 10, location: 'S-01', price: 125, active: true },
  { id: 'epi_2_smi', site: 'SMI', ref: 'EPI-GAN-C', designation: 'Gants Cuir Bovin Anti-Choc T10', type: 'EPI', category: 'Mains', unit: 'Paire', quantity: 240, minStock: 60, location: 'S-04', price: 85, active: true },
  { id: 'epi_3_smi', site: 'SMI', ref: 'EPI-LNT-S', designation: 'Lunettes de Protection Teintées UV400', type: 'EPI', category: 'Yeux', unit: 'Pcs', quantity: 180, minStock: 40, location: 'S-02', price: 45, active: true },
  { id: 'epi_1_oumj', site: 'OUMEJRANE', ref: 'OMJ-BOT-S3', designation: 'Bottes de Sécurité S3 Coquées', type: 'EPI', category: 'Pieds', unit: 'Paire', quantity: 85, minStock: 20, location: 'MAG-EPI', price: 450, active: true },
];

export const INITIAL_MOUVEMENTS: Mouvement[] = [
  {
    id: 'BS-2026-001',
    site: 'SMI',
    date: '2026-05-12T10:00:00Z',
    type: 'SORTIE',
    reference: 'REQ-INTERNAL-01',
    demandeur: 'Abdelatif R.',
    mecanicien: 'Momo Diallo',
    engin: 'e1_smi',
    service: 'MAINTENANCE',
    items: [{ articleId: 'smi_e1_m', quantity: 1, price: 145000 }],
    status: 'COMPLETE'
  }
];
