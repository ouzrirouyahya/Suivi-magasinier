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
  { id: 'e1_smi', code: 'EX-01', label: 'Scooptram ST2G #01', site: 'SMI', type: 'PELLE' },
  { id: 'e2_smi', code: 'DT-12', label: 'Scooptram ST2D #02', site: 'SMI', type: 'DUMPER' },
  { id: 'e1_oumj', code: 'A40G-01', label: 'Scooptram ST2D #15', site: 'OUMEJRANE', type: 'DUMPER' },
];

export const INITIAL_PERFOS: PerfoMaster[] = [
  { id: 'p1_smi', code: 'RIG 1 - COP 1838', site: 'SMI' },
  { id: 'p2_smi', code: 'RIG 2 - HC50', site: 'SMI' },
];

export const INITIAL_AGENTS: AgentMaster[] = [
  { id: 'a1', matricule: 'M001', firstname: 'Ahmed', lastname: 'Brahimi', service: 'MAINTENANCE', site: 'SMI' },
  { id: 'a2', matricule: 'M042', firstname: 'Jean', lastname: 'Dupont', service: 'FORAGE', site: 'SMI' },
  { id: 'a3', matricule: 'M105', firstname: 'Momo', lastname: 'Diallo', service: 'LOGISTIQUE', site: 'SMI' },
  { id: 'a4', matricule: 'M220', firstname: 'Karim', lastname: 'Nasri', service: 'MAINTENANCE', site: 'OUMEJRANE' },
  { id: 'a5', matricule: 'M315', firstname: 'Said', lastname: 'Belkacem', service: 'FORAGE', site: 'OUMEJRANE' },
];

export const INITIAL_ARTICLES: Article[] = [
  // ==========================================
  // --- SITE SMI (INVENTAIRE REEL) -----------
  // ==========================================
  
  // --- MOTEUR & TRANSMISSION ---
  { 
    id: 'smi_st2g_mot_01', site: 'SMI', ref: '5580 0088 00', 
    designation: 'Bloc moteur Deutz D914 L04 complet', type: 'ENGINS', 
    category: 'Moteur', functionalCategory: 'Moteur', subCategory: 'Moteur Complet', 
    component: 'Bloc Moteur', subComponent: 'Deutz D914 L04', 
    unit: 'Pcs', quantity: 1, minStock: 1, location: 'RAY-MOT-01', 
    price: 135000, active: true, compatibility: 'Scooptram ST2G / ST2D', criticality: 'CRITIQUE'
  },
  { 
    id: 'smi_st2g_mot_03', site: 'SMI', ref: '5580 0088 01', 
    designation: 'Kit pistons complet avec segments et axes (Set)', type: 'ENGINS', 
    category: 'Moteur', functionalCategory: 'Moteur', subCategory: 'Pistons et Embiellage', 
    component: 'Piston Kit', subComponent: 'Standard', 
    unit: 'Kit', quantity: 3, minStock: 2, location: 'RAY-MOT-02', 
    price: 12500, active: true, compatibility: 'Scooptram ST2G', criticality: 'HAUTE'
  },
  { 
    id: 'smi_st2g_tra_01', site: 'SMI', ref: '5513 3820 00', 
    designation: 'Convertisseur de couple Clark C270 complet', type: 'ENGINS', 
    category: 'Transmission', functionalCategory: 'Transmission', subCategory: 'Convertisseur', 
    component: 'Convertisseur de couple', subComponent: 'Clark C270', 
    unit: 'Pcs', quantity: 1, minStock: 1, location: 'RAY-TRA-01', 
    price: 72000, active: true, compatibility: 'Scooptram ST2G', criticality: 'CRITIQUE'
  },

  // --- HYDRAULIQUE & FREINAGE ---
  { 
    id: 'smi_st2g_hyd_01', site: 'SMI', ref: '3128 3217 63', 
    designation: 'Pompe hydraulique principale à pistons Rexroth', type: 'ENGINS', 
    category: 'Hydraulique', functionalCategory: 'Hydraulique', subCategory: 'Génération de puissance', 
    component: 'Pompe Hydraulique', subComponent: 'Rexroth A10VSO', 
    unit: 'Pcs', quantity: 2, minStock: 1, location: 'RAY-HYD-10', 
    price: 42000, active: true, compatibility: 'Scooptram ST2G / ST2D', criticality: 'CRITIQUE'
  },
  { 
    id: 'smi_st2g_hyd_03', site: 'SMI', ref: '3128 3002 00', 
    designation: 'Vérin de cavage godet principal ST2G', type: 'ENGINS', 
    category: 'Hydraulique', functionalCategory: 'Hydraulique', subCategory: 'Actionneur Brancard', 
    component: 'Vérin de cavage', subComponent: 'Tige chromée', 
    unit: 'Pcs', quantity: 2, minStock: 1, location: 'PARC-VERIN', 
    price: 28500, active: true, compatibility: 'Scooptram ST2G', criticality: 'CRITIQUE'
  },
  { 
    id: 'smi_st2g_fre_01', site: 'SMI', ref: '5112 3102 00', 
    designation: 'Disque de frein humide en acier frité renforcé', type: 'ENGINS', 
    category: 'Freinage', functionalCategory: 'Freinage', subCategory: 'Disques de Freins', 
    component: 'Disques humides', subComponent: 'SAHR frité multi-disques', 
    unit: 'Pcs', quantity: 12, minStock: 6, location: 'RAY-FRE-04', 
    price: 3800, active: true, compatibility: 'Scooptram ST2G / ST2D', criticality: 'CRITIQUE'
  },

  // --- FILTRATION & GRAISSAGE ---
  { 
    id: 'smi_st2g_fil_01', site: 'SMI', ref: '5516 0027 00', 
    designation: 'Filtre à air primaire radial seal Donaldson', type: 'ENGINS', 
    category: 'Filtration', functionalCategory: 'Filtration', subCategory: 'Air Moteur', 
    component: 'Filtre à air primaire', subComponent: 'Donaldson radial seal', 
    unit: 'Pcs', quantity: 15, minStock: 5, location: 'RAY-FIL-01', 
    price: 650, active: true, compatibility: 'Scooptram ST2G / ST2D', criticality: 'MOYENNE'
  },
  { 
    id: 'smi_st2g_fil_04', site: 'SMI', ref: '5515 5015 00', 
    designation: 'Filtre à huile Fleetguard LF9009 dual-flow', type: 'ENGINS', 
    category: 'Filtration', functionalCategory: 'Filtration', subCategory: 'Huile Moteur', 
    component: 'Filtre à huile moteur', subComponent: 'Fleetguard LF9009 dual-flow', 
    unit: 'Pcs', quantity: 25, minStock: 10, location: 'RAY-FIL-03', 
    price: 290, active: true, compatibility: 'Scooptram ST2G / ST2D', criticality: 'MOYENNE'
  },

  // --- PERFORATION & CONSOMMABLES ---
  { 
    id: 'smi_perf_sub_02', site: 'SMI', ref: '8661 1639 00', 
    designation: 'Piston de frappe original pour perforateur COP 1838', type: 'PERFORATEURS', 
    category: 'Perforation', functionalCategory: 'Perforation', subCategory: 'Mécanisme de frappe', 
    component: 'Piston de frappe COP', subComponent: 'Epiroc original', 
    unit: 'Pcs', quantity: 3, minStock: 1, location: 'RAY-PERF-01', 
    price: 28200, active: true, compatibility: 'Epiroc COP 1838', criticality: 'CRITIQUE'
  },
  { 
    id: 'smi_perf_con_01', site: 'SMI', ref: 'MB-T23-801a', 
    designation: 'Taillant à boutons coniques 38mm d\'injection d\'air', type: 'PERFORATEURS', 
    category: 'Consommables', functionalCategory: 'Consommables', subCategory: 'Taillants', 
    component: 'Taillant conique 38mm', subComponent: 'Boutons carbure', 
    unit: 'Pcs', quantity: 120, minStock: 30, location: 'RAY-FOR-05', 
    price: 380, active: true, compatibility: 'Tiges hexagonales coniques', criticality: 'MOYENNE'
  },
  { 
    id: 'smi_perf_con_02', site: 'SMI', ref: 'MB-T38-801b', 
    designation: 'Taillant bouton T38 Retrac fileté 64mm Sandvik', type: 'PERFORATEURS', 
    category: 'Consommables', functionalCategory: 'Consommables', subCategory: 'Taillants', 
    component: 'Taillant fileté T38', subComponent: 'Boutons carbure de tungstène', 
    unit: 'Pcs', quantity: 45, minStock: 15, location: 'RAY-FOR-06', 
    price: 1450, active: true, compatibility: 'Tiges filetées T38', criticality: 'MOYENNE'
  },
  { 
    id: 'smi_perf_con_03', site: 'SMI', ref: 'MB-T23-702', 
    designation: 'Tige de forage jumbo filetée T38 MF 3050mm Sandvik', type: 'PERFORATEURS', 
    category: 'Consommables', functionalCategory: 'Consommables', subCategory: 'Tiges de forage', 
    component: 'Tige de forage Jumbo', subComponent: 'Fileté T38 mâle/femelle 3m', 
    unit: 'Pcs', quantity: 18, minStock: 5, location: 'PARC-FOR-A', 
    price: 4200, active: true, compatibility: 'Jumbos de forage front de taille', criticality: 'HAUTE'
  },
  { 
    id: 'smi_perf_con_04', site: 'SMI', ref: 'MB-T23-203', 
    designation: 'Shank Adapter COP 1838 cannelé filetage T38', type: 'PERFORATEURS', 
    category: 'Consommables', functionalCategory: 'Consommables', subCategory: 'Liaisons filetées', 
    component: 'Adaptateur d\'emmanchement', subComponent: 'Shank Adapter T38 COP', 
    unit: 'Pcs', quantity: 8, minStock: 2, location: 'RAY-FOR-12', 
    price: 5800, active: true, compatibility: 'Epiroc COP 1838', criticality: 'HAUTE'
  },

  // ==========================================
  // --- SITE OUMEJRANE -----------------------
  // ==========================================
  { 
    id: 'oumj_st2g_mot_04', site: 'OUMEJRANE', ref: '5580 0088 35', 
    designation: 'Turbocompresseur Garrett GT22 d\'origine', type: 'ENGINS', 
    category: 'Moteur', functionalCategory: 'Moteur', subCategory: 'Suralimentation', 
    component: 'Turbocompresseur', subComponent: 'Garrett GT22', 
    unit: 'Pcs', quantity: 2, minStock: 1, location: 'M-12', 
    price: 16800, active: true, compatibility: 'Scooptram ST2G / ST2D', criticality: 'HAUTE'
  },
  { 
    id: 'oumj_st2g_hyd_04', site: 'OUMEJRANE', ref: '3128 3004 00', 
    designation: 'Vérin hydraulique de direction double effet', type: 'ENGINS', 
    category: 'Hydraulique', functionalCategory: 'Hydraulique', subCategory: 'Actionneur Direction', 
    component: 'Vérin de direction', subComponent: 'Double effet', 
    unit: 'Pcs', quantity: 1, minStock: 1, location: 'H-03', 
    price: 19500, active: true, compatibility: 'Scooptram ST2G / ST2D', criticality: 'CRITIQUE'
  },
  { 
    id: 'oumj_st2g_fil_03', site: 'OUMEJRANE', ref: '5516 0029 00', 
    designation: 'Filtre gasoil séparateur d\'eau Fleetguard FS1000', type: 'ENGINS', 
    category: 'Filtration', functionalCategory: 'Filtration', subCategory: 'Carburant', 
    component: 'Filtre à gasoil séparateur d\'eau', subComponent: 'Fleetguard FS1000', 
    unit: 'Pcs', quantity: 14, minStock: 5, location: 'F-08', 
    price: 380, active: true, compatibility: 'Scooptram ST2G / ST2D', criticality: 'MOYENNE'
  },
  { 
    id: 'oumj_perf_sub_01', site: 'OUMEJRANE', ref: 'MB-T23-101', 
    designation: 'Piston principal de frappe en alliage dur renforcé', type: 'PERFORATEURS', 
    category: 'Perforation', functionalCategory: 'Perforation', subCategory: 'Mécanisme de frappe', 
    component: 'Piston de frappe', subComponent: 'Alliage aciéré', 
    unit: 'Pcs', quantity: 2, minStock: 1, location: 'P-01', 
    price: 16500, active: true, compatibility: 'Perfo Montabert HC50 / Tamrock', criticality: 'CRITIQUE'
  },

  // ==========================================
  // --- SITE KOUDIA --------------------------
  // ==========================================
  { 
    id: 'kou_st2g_ele_01', site: 'KOUDIA', ref: '5516 0034 00', 
    designation: 'Alternateur minier scellé Delco Remy 24V 150A', type: 'ENGINS', 
    category: 'Électricité', functionalCategory: 'Électricité', subCategory: 'Génération', 
    component: 'Alternateur minier', subComponent: 'Delco Remy scellé 24V', 
    unit: 'Pcs', quantity: 4, minStock: 1, location: 'RAY-E05', 
    price: 9500, active: true, compatibility: 'ST2G / ST2D / Jumbos', criticality: 'HAUTE'
  },
  { 
    id: 'kou_perf_sub_03', site: 'KOUDIA', ref: 'MB-T23-201', 
    designation: 'Barre rifle (vis hélicoïdale de guidage rotation)', type: 'PERFORATEURS', 
    category: 'Perforation', functionalCategory: 'Perforation', subCategory: 'Mécanisme de rotation', 
    component: 'Barre rifle', subComponent: 'Cannelures hélice', 
    unit: 'Pcs', quantity: 2, minStock: 1, location: 'RAY-ROT-1', 
    price: 12500, active: true, compatibility: 'Perforateurs manuels / Jacklegs', criticality: 'HAUTE'
  },

  // ==========================================
  // --- SITE BOU-AZZER -----------------------
  // ==========================================
  { 
    id: 'baz_st2g_tra_01', site: 'BOU-AZZER', ref: '5513 3820 00', 
    designation: 'Convertisseur de couple Clark C270 complet', type: 'ENGINS', 
    category: 'Transmission', functionalCategory: 'Transmission', subCategory: 'Convertisseur', 
    component: 'Convertisseur de couple', subComponent: 'Clark C270', 
    unit: 'Pcs', quantity: 1, minStock: 1, location: 'RAY-T01', 
    price: 72000, active: true, compatibility: 'Scooptram ST2G', criticality: 'CRITIQUE'
  },
  { 
    id: 'baz_st2g_fre_02', site: 'BOU-AZZER', ref: '5112 3103 01', 
    designation: 'Accumulateur de freinage à membrane d\'azote Hydac', type: 'ENGINS', 
    category: 'Freinage', functionalCategory: 'Freinage', subCategory: 'Pression hydraulique', 
    component: 'Accumulateur de freinage', subComponent: 'Hydac membrane N2', 
    unit: 'Pcs', quantity: 5, minStock: 2, location: 'RAY-F11', 
    price: 8500, active: true, compatibility: 'Scooptram ST2G / ST2D', criticality: 'CRITIQUE'
  },

  // ==========================================
  // --- SITE OUANSIMI ------------------------
  // ==========================================
  { 
    id: 'oua_st2g_ele_03', site: 'OUANSIMI', ref: '5516 0034 22', 
    designation: 'Projecteur haute intensité anti-corrosion minier LED', type: 'ENGINS', 
    category: 'Électricité', functionalCategory: 'Électricité', subCategory: 'Éclairage', 
    component: 'Projecteur LED minier', subComponent: 'IP69K 24V dc', 
    unit: 'Pcs', quantity: 10, minStock: 3, location: 'RAY-E10', 
    price: 2200, active: true, compatibility: 'Tous engins de chantier', criticality: 'MOYENNE'
  },
  { 
    id: 'oua_perf_con_06', site: 'OUANSIMI', ref: 'MB-T23-701', 
    designation: 'Fleuret de forage conique R25 Hex 22 de longueur 1.8m', type: 'PERFORATEURS', 
    category: 'Consommables', functionalCategory: 'Consommables', subCategory: 'Tiges de forage', 
    component: 'Fleuret conique 1.8m', subComponent: 'HEX 22 conique 11°', 
    unit: 'Pcs', quantity: 30, minStock: 10, location: 'RAY-FOR-02', 
    price: 1180, active: true, compatibility: 'Perforateurs portatifs jacklegs', criticality: 'HAUTE'
  }
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
    items: [{ articleId: 'smi_st2g_mot_01', quantity: 1, price: 135000 }],
    status: 'COMPLETE'
  }
];
