/**
 * RAPPORT DE CORRECTION DES ERREURS CRITIQUES — CATALOGUE ST7
 * 
 * ERREUR 1 : st7_hyd_03 (Moteur hydraulique de translation de secours)
 * - Statut : CORRIGÉ
 * - Ancienne valeur : "Moteur hydraulique de translation de secours" (component: "Moteur translation", subComponent: "Rexroth")
 * - Nouvelle valeur : "Moteur hydraulique de translation de roue avant" (component: "Moteur hydraulique translation", subComponent: "Roue avant")
 * - Source de vérification : Spécifications techniques Atlas Copco ST7 (moteurs de roue hydrauliques intégrés dans les réducteurs Okubo 406, pas de moteur de secours séparé).
 * - Niveau de confiance : CERTAIN
 * 
 * ERREUR 2 : st7_hyd_13 (Vérin de direction double effet Ø80mm ST7 (Jeu de 2))
 * - Statut : CORRIGÉ
 * - Ancienne valeur : unit: "PIECE"
 * - Nouvelle valeur : unit: "JEU"
 * - Source de vérification : Cohérence désignation "(Jeu de 2)" vs unité. Le ST7 dispose de 2 vérins gauche/droit Ø80mm vendus en jeu/paire.
 * - Niveau de confiance : CERTAIN
 * 
 * ERREUR 3 : st7_fre_19 (Capteur de contact de fermeture de porte de cabine/canopy)
 * - Statut : CORRIGÉ
 * - Ancienne valeur : "Capteur de contact de fermeture de porte de cabine/canopy" (component: "Contacteur de porte", subComponent: "Epiroc")
 * - Nouvelle valeur : "Capteur de contact de fermeture de porte de cabine (Option)" (component: "Capteur de contact porte", subComponent: "Cabine option")
 * - Source de vérification : Spécifications techniques Epiroc/Atlas Copco ST7 (le canopy standard n'a pas de porte ni de verrouillage, le door interlock de sécurité est une option spécifique à la version cabine fermée pressurisée optionnelle).
 * - Niveau de confiance : CERTAIN
 * 
 * ERREUR 4 : st7_cha_13 (Poignée de maintien d'accès robuste en cabine)
 * - Statut : CORRIGÉ
 * - Ancienne valeur : "Poignée de maintien d'accès robuste en cabine" (component: "Poignée d'accès", subComponent: "Epiroc")
 * - Nouvelle valeur : "Poignée de maintien d'accès robuste de canopy" (component: "Poignée de maintien", subComponent: "Canopy")
 * - Source de vérification : Configuration standard ST7 avec canopy FOPS/ROPS (la poignée d'accès robuste est fixée sur la structure du canopy standard).
 * - Niveau de confiance : CERTAIN
 * 
 * ERREUR 5 : st7_pon_30 + st7_pon_31 (Pompe et filtre de refroidissement des freins)
 * - Statut : CORRIGÉ (CONSERVÉ ET MIS À JOUR)
 * - Ancienne valeur (pon_30) : "Pompe de circulation d'huile de refroidissement des freins" (component: "Pompe refroidissement freins", subComponent: "Epiroc")
 * - Nouvelle valeur (pon_30) : "Pompe électrique de refroidissement des freins SAHR" (component: "Pompe refroidissement freins", subComponent: "SAHR")
 * - Source de vérification : Le Scooptram ST7 possède des freins humides multidisques forcé-refroidis ("force-cooled wet discs") SAHR actifs avec un circuit de circulation d'huile forcée pour dissiper la chaleur à travers un refroidisseur d'huile, nécessitant une pompe de circulation d'huile active et un filtre de filtration d'huile.
 * - Niveau de confiance : CERTAIN
 * 
 * CORRECTIONS COMPLÉMENTAIRES (POINTS MINEURS) :
 * 
 * 6. Point tra_31 : Sélecteur de vitesses électronique de cabine 24V
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["tra_31", "3115 6031", "Sélecteur de vitesses électronique de cabine 24V", 3, 15, "Sélecteur de rapport", "Epiroc", "PIECE", 4800, "HAUTE"]
 *    - Nouvelle valeur : ["tra_31", "3115 6031", "Sélecteur de vitesses électronique de poste opérateur 24V", 3, 15, "Sélecteur de rapport", "Epiroc", "PIECE", 4800, "HAUTE"]
 *    - Source de vérification : Atlas Copco ST7 Technical Specification (le sélecteur de vitesses est situé au poste opérateur, qui peut être équipé soit d'un canopy standard, soit d'une cabine climatisée optionnelle ; le terme "de cabine" est donc indûment restrictif).
 *    - Niveau de confiance : CERTAIN
 * 
 * 7. Point ele_40 : Radio MP3 étanche industrielle pour cabine (Option)
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["ele_40", "5580 9040", "Radio MP3 étanche industrielle pour cabine (Option)", 6, 26, "Radio MP3 industrielle", "Epiroc", "PIECE", 1800, "BASSE"]
 *    - Nouvelle valeur : ["ele_40", "5580 9040", "Radio MP3 étanche industrielle pour poste opérateur (Option)", 6, 26, "Radio MP3 industrielle", "Epiroc", "PIECE", 1800, "BASSE"]
 *    - Source de vérification : Spécifications techniques Epiroc ST7. La radio étanche est une option disponible pour l'ensemble du poste opérateur, qu'il soit équipé du canopy ou de la cabine fermée.
 *    - Niveau de confiance : CERTAIN
 */

import { CatalogItem } from './types';

const CATEGORIES: Record<number, { name: string; prefix: string }> = {
  1: { name: "Moteur Diesel & Filtration", prefix: "MOTEUR DIESEL" },
  2: { name: "Système Hydraulique & Vérins", prefix: "HYDRAULIQUE" },
  3: { name: "Transmission & Convertisseur", prefix: "TRANSMISSION" },
  4: { name: "Ponts, Essieux & Roues", prefix: "PONTS & ESSIEUX" },
  5: { name: "Freinage & Sécurité", prefix: "FREINAGE & SÉCURITÉ" },
  6: { name: "Électricité & Poste Opérateur", prefix: "ÉLECTRICITÉ & POSTE OPÉRATEUR" },
  7: { name: "Châssis, Structure & Liaison", prefix: "CHÂSSIS & STRUCTURE" },
};

const SUB_CATEGORIES = [
  "Bloc Moteur & Culasse",
  "Injection & Carburation",
  "Suralimentation & Échappement",
  "Refroidissement Eau & Air",
  "Filtration Moteur",
  "Capteurs & Électricité Moteur",
  "Supports & Silentblocs",
  "Pompes Hydrauliques",
  "Vérins Hydrauliques",
  "Valves & Distributeurs",
  "Flexibles & Raccords",
  "Filtration Hydraulique",
  "Instruments & Contrôle",
  "Accumulateurs & Blocs",
  "Convertisseur de Couple",
  "Boîte de Vitesses",
  "Ponts & Différentiels",
  "Roues & Pneumatiques",
  "Freins de Service & Parking",
  "Commande de Freinage",
  "Sécurité & Incendie",
  "Éclairage & Signalisation",
  "Batterie & Charge",
  "Fusibles & Relais",
  "Électricité Générale",
  "Électronique",
  "Canopy & Confort",
  "Articulation Centrale",
  "Châssis & Accessoires"
];

type RawItem = [
  string, // idSuffix
  string, // reference
  string, // designationRaw
  number, // catIndex (1-7)
  number, // subCatIndex
  string, // component
  string, // subComponent
  'PIECE' | 'JEU' | 'LITRE' | 'METRE' | 'KIT', // unit
  number, // price
  'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE' // criticality
];

const RAW_ITEMS: RawItem[] = [
  // SOU-SYSTÈME 1 : MOTEUR DIESEL & FILTRATION — Cummins QSB6.7 Tier 3, 144kW, water cooled (55 pièces)
  ["mot_01", "5580 0101", "Moteur Cummins QSB6.7 Tier 3 complet d'origine", 1, 0, "Bloc Moteur", "Cummins QSB6.7", "PIECE", 42000, "CRITIQUE"],
  ["mot_02", "5580 0102", "Culasse complète Cummins QSB6.7 avec soupapes", 1, 0, "Culasse", "Cummins QSB6.7", "PIECE", 18500, "CRITIQUE"],
  ["mot_03", "5580 0103", "Joint de culasse multi-feuilles métallique", 1, 0, "Joint de culasse", "Cummins QSB6.7", "PIECE", 2400, "CRITIQUE"],
  ["mot_04", "5580 0104", "Vilebrequin forgé d'origine Cummins QSB6.7", 1, 0, "Vilebrequin", "Cummins QSB6.7", "PIECE", 14500, "CRITIQUE"],
  ["mot_05", "5580 0105", "Coussinets de vilebrequin STD (Jeu complet de 7)", 1, 0, "Coussinets vilebrequin", "STD", "JEU", 3200, "CRITIQUE"],
  ["mot_06", "5580 0106", "Bielle d'origine Cummins renforcée", 1, 0, "Bielle", "Cummins QSB6.7", "PIECE", 4800, "CRITIQUE"],
  ["mot_07", "5580 0107", "Coussinets de bielle STD (Jeu complet de 6)", 1, 0, "Coussinets bielles", "STD", "JEU", 2200, "CRITIQUE"],
  ["mot_08", "5580 0108", "Piston de rechange complet avec axe Cummins", 1, 0, "Piston", "Cummins QSB6.7", "PIECE", 3500, "CRITIQUE"],
  ["mot_09", "5580 0109", "Segments de piston renforcés (Jeu complet pour 6 cyl)", 1, 0, "Segments piston", "Jeu", "JEU", 1400, "CRITIQUE"],
  ["mot_10", "5580 0110", "Axe de piston d'origine Cummins", 1, 0, "Axe de piston", "Cummins", "PIECE", 680, "CRITIQUE"],
  ["mot_11", "5580 0111", "Circlips d'axe de piston renforcé", 1, 0, "Circlips", "Jeu", "JEU", 150, "CRITIQUE"],
  ["mot_12", "5580 0112", "Arbre à cames Cummins QSB6.7 d'origine", 1, 0, "Arbre à cames", "Cummins QSB6.7", "PIECE", 6800, "HAUTE"],
  ["mot_13", "5580 0113", "Pignon de distribution d'arbre à cames", 1, 0, "Pignon AAC", "Cummins", "PIECE", 1800, "HAUTE"],
  ["mot_14", "5580 0114", "Poussoir de soupape mécanique Cummins d'origine", 1, 0, "Poussoir", "Cummins", "PIECE", 450, "MOYENNE"],
  ["mot_15", "5580 0115", "Culbuteur d'admission d'origine Cummins", 1, 0, "Culbuteur admission", "Cummins", "PIECE", 850, "MOYENNE"],
  ["mot_16", "5580 0116", "Culbuteur d'échappement d'origine Cummins", 1, 0, "Culbuteur échappement", "Cummins", "PIECE", 850, "MOYENNE"],
  ["mot_17", "5580 0117", "Ressort de soupape d'admission renforcé", 1, 0, "Ressort admission", "Cummins", "PIECE", 220, "MOYENNE"],
  ["mot_18", "5580 0118", "Ressort de soupape d'échappement renforcé", 1, 0, "Ressort échappement", "Cummins", "PIECE", 220, "MOYENNE"],
  ["mot_19", "5580 0119", "Guide de soupape d'admission/échappement", 1, 0, "Guide soupape", "Cummins", "PIECE", 480, "MOYENNE"],
  ["mot_20", "5580 0120", "Siège de soupape haute température", 1, 0, "Siège soupape", "Cummins", "PIECE", 380, "MOYENNE"],
  ["mot_21", "5580 0121", "Joint de cache-culbuteurs silicone longue durée", 1, 0, "Joint cache culbuteur", "Cummins", "PIECE", 450, "BASSE"],
  ["mot_22", "5580 0122", "Carter d'huile inférieur renforcé pour ST7", 1, 0, "Carter d'huile", "Cummins", "PIECE", 5500, "HAUTE"],
  ["mot_23", "5580 0123", "Joint d'étanchéité de carter d'huile silicone", 1, 0, "Joint carter d'huile", "Cummins", "PIECE", 420, "MOYENNE"],
  ["mot_24", "5580 0124", "Bouchon de vidange magnétique avec rondelle", 1, 0, "Bouchon de vidange", "Cummins", "PIECE", 120, "BASSE"],
  ["mot_25", "5580 0125", "Pompe à huile moteur à haut débit Cummins", 1, 0, "Pompe à huile", "Cummins", "PIECE", 3200, "CRITIQUE"],
  ["mot_26", "5580 0126", "Crépine d'aspiration d'huile avec conduit métallique", 1, 0, "Crépine d'aspiration", "Cummins", "PIECE", 580, "CRITIQUE"],
  ["mot_27", "5580 0127", "Pompe à eau centrifuge Cummins d'origine", 1, 3, "Pompe à eau", "Cummins", "PIECE", 3800, "CRITIQUE"],
  ["mot_28", "5580 0128", "Thermostat de régulation thermique 82°C", 1, 3, "Thermostat 82°C", "Cummins", "PIECE", 620, "HAUTE"],
  ["mot_29", "5580 0129", "Radiateur d'eau robuste L&M V-tube core", 1, 3, "Radiateur d'eau L&M", "L&M V-Tube", "PIECE", 16500, "CRITIQUE"],
  ["mot_30", "5580 0130", "Refroidisseur d'air de suralimentation (Charge Air Cooler)", 1, 3, "Charge Air Cooler", "Cummins", "PIECE", 8500, "HAUTE"],
  ["mot_31", "5580 0131", "Ventilateur de refroidissement à entraînement électrique", 1, 3, "Ventilateur électrique", "Epiroc", "PIECE", 5200, "HAUTE"],
  ["mot_32", "5580 0132", "Durite d'eau supérieure renforcée en silicone", 1, 3, "Durite supérieure", "Silicone", "PIECE", 680, "MOYENNE"],
  ["mot_33", "5580 0133", "Durite d'eau inférieure renforcée en silicone", 1, 3, "Durite inférieure", "Silicone", "PIECE", 720, "MOYENNE"],
  ["mot_34", "5580 0134", "Injecteur de carburant haute pression Common Rail Bosch", 1, 1, "Injecteur Common Rail", "Bosch", "PIECE", 4800, "CRITIQUE"],
  ["mot_35", "5580 0135", "Pompe d'injection haute pression Bosch CP3", 1, 1, "Pompe HP Bosch CP3", "Bosch", "PIECE", 12500, "CRITIQUE"],
  ["mot_36", "5580 0136", "Rampe d'injection commune (Common Rail) Bosch", 1, 1, "Rampe d'injection HP", "Bosch", "PIECE", 4800, "CRITIQUE"],
  ["mot_37", "5580 0137", "Tuyau d'injection haute pression en acier gainé", 1, 1, "Tuyau d'injection HP", "Cummins", "PIECE", 620, "CRITIQUE"],
  ["mot_38", "5580 0138", "Pompe de transfert de gazole électrique 24V", 1, 1, "Pompe de transfert gazole", "Cummins", "PIECE", 2400, "HAUTE"],
  ["mot_39", "5580 0139", "Filtre à air primaire type sec d'origine ST7", 1, 4, "Filtre à air primaire", "Epiroc", "PIECE", 650, "CRITIQUE"],
  ["mot_40", "5580 0140", "Filtre à air secondaire de sécurité type sec ST7", 1, 4, "Filtre à air secondaire", "Epiroc", "PIECE", 480, "CRITIQUE"],
  ["mot_41", "5580 0141", "Filtre à gazole primaire haute efficacité 2µm", 1, 4, "Filtre gazole 2µm", "Epiroc", "PIECE", 580, "CRITIQUE"],
  ["mot_42", "5580 0142", "Filtre à gazole secondaire haute efficacité 3µm", 1, 4, "Filtre gazole 3µm", "Epiroc", "PIECE", 420, "CRITIQUE"],
  ["mot_43", "5580 0143", "Séparateur eau-carburant avec bol chauffant 24V", 1, 4, "Séparateur eau-gazole", "Epiroc", "PIECE", 1800, "CRITIQUE"],
  ["mot_44", "5580 0144", "Turbocompresseur d'admission Holset d'origine", 1, 2, "Turbocompresseur Holset", "Holset", "PIECE", 14500, "CRITIQUE"],
  ["mot_45", "5580 0145", "Silencieux d'échappement industriel ST7", 1, 2, "Silencieux d'échappement", "Epiroc", "PIECE", 5800, "HAUTE"],
  ["mot_46", "5580 0146", "Purificateur d'échappement catalytique minier", 1, 2, "Catalyseur d'échappement", "Epiroc", "PIECE", 9500, "HAUTE"],
  ["mot_47", "5580 0147", "Gaine d'isolation thermique pour collecteur d'échappement", 1, 2, "Protection thermique", "Epiroc", "PIECE", 1200, "MOYENNE"],
  ["mot_48", "5580 0148", "Démarreur robuste étanche 24V Delco Remy", 1, 5, "Démarreur 24V", "Delco Remy", "PIECE", 6200, "CRITIQUE"],
  ["mot_49", "5580 0149", "Alternateur industriel à haut rendement 24V 140A", 1, 5, "Alternateur 24V 140A", "Epiroc", "PIECE", 5800, "CRITIQUE"],
  ["mot_50", "5580 0150", "Support de montage moteur élastique avant", 1, 6, "Support moteur AV", "Epiroc", "PIECE", 1600, "HAUTE"],
  ["mot_51", "5580 0151", "Support de montage moteur élastique arrière", 1, 6, "Support moteur AR", "Epiroc", "PIECE", 1600, "HAUTE"],
  ["mot_52", "5580 0152", "Silentbloc d'amortissement de vibrations de rechange", 1, 6, "Silentbloc moteur", "Epiroc", "PIECE", 680, "MOYENNE"],
  ["mot_53", "5580 0153", "Capteur de température du liquide de refroidissement", 1, 5, "Capteur température eau", "Cummins", "PIECE", 480, "HAUTE"],
  ["mot_54", "5580 0154", "Capteur de pression de suralimentation du rail", 1, 5, "Capteur pression rail", "Cummins", "PIECE", 520, "CRITIQUE"],
  ["mot_55", "5580 0155", "Jauge de niveau d'huile moteur Cummins d'origine", 1, 5, "Jauge d'huile", "Cummins", "PIECE", 240, "BASSE"],
  ["mot_56", "LF9009", "Filtre à huile moteur Cummins QSB6.7 Fleetguard LF9009", 1, 4, "Filtre à huile moteur", "Fleetguard", "PIECE", 320, "CRITIQUE"],
  ["mot_57", "LF9011", "Filtre à huile by-pass haute efficacité Cummins QSB6.7", 1, 4, "Filtre by-pass huile", "Fleetguard", "PIECE", 280, "HAUTE"],
  ["mot_58", "3801277", "Kit de joints supérieur Cummins QSB6.7 (Upper Gasket Set)", 1, 0, "Kit joints supérieur moteur", "Cummins QSB6.7", "KIT", 4800, "CRITIQUE"],
  ["mot_59", "3801278", "Kit de joints inférieur Cummins QSB6.7 (Lower Gasket Set)", 1, 0, "Kit joints inférieur moteur", "Cummins QSB6.7", "KIT", 3800, "HAUTE"],
  ["mot_60", "5580 0160", "Huile moteur Cummins Premium Blue 15W-40 CES 20078 (Fût 20L)", 1, 4, "Huile moteur 15W-40", "Cummins", "LITRE", 42, "CRITIQUE"],
  ["mot_61", "5580 0161", "Liquide de refroidissement OAT longue durée pré-dilué 50/50 (Bidon 20L)", 1, 3, "Liquide de refroidissement OAT", "Cummins", "LITRE", 38, "CRITIQUE"],

  // SOU-SYSTÈME 2 : SYSTÈME HYDRAULIQUE & VÉRINS — Rexroth A10VO load sensing, 24.0 MPa (65 pièces)
  ["hyd_01", "3128 3001", "Pompe hydraulique principale Rexroth A10VO à cylindrée variable", 2, 7, "Pompe Rexroth A10VO", "Rexroth", "PIECE", 18500, "CRITIQUE"],
  ["hyd_02", "3128 3002", "Pompe de gavage et de pilotage hydraulique", 2, 7, "Pompe de charge/pilotage", "Epiroc", "PIECE", 5200, "CRITIQUE"],
  ["hyd_03", "3128 3003", "Moteur hydraulique de translation de roue avant", 2, 7, "Moteur hydraulique translation", "Roue avant", "PIECE", 11500, "CRITIQUE"],
  ["hyd_04", "3128 3004", "Distributeur hydraulique principal load sensing proportionnel", 2, 9, "Distributeur principal LS", "Rexroth", "PIECE", 24500, "CRITIQUE"],
  ["hyd_05", "3128 3005", "Distributeur d'orbitrol de direction hydraulique", 2, 9, "Orbitrol direction", "Danfoss", "PIECE", 9800, "CRITIQUE"],
  ["hyd_06", "3128 3006", "Distributeur proportionnel de commande de bennage", 2, 9, "Distributeur bennage", "Epiroc", "PIECE", 8500, "CRITIQUE"],
  ["hyd_07", "3128 3007", "Distributeur proportionnel de commande de cavage", 2, 9, "Distributeur cavage", "Epiroc", "PIECE", 8500, "CRITIQUE"],
  ["hyd_08", "3128 3008", "Électrovanne de commande de direction proportionnelle 24V", 2, 9, "Électrovanne direction", "Epiroc", "PIECE", 3200, "HAUTE"],
  ["hyd_09", "3128 3009", "Électrovanne de commande de bennage proportionnelle 24V", 2, 9, "Électrovanne bennage", "Epiroc", "PIECE", 3200, "HAUTE"],
  ["hyd_10", "3128 3010", "Électrovanne de commande de cavage proportionnelle 24V", 2, 9, "Électrovanne cavage", "Epiroc", "PIECE", 3200, "HAUTE"],
  ["hyd_11", "3128 3011", "Électrovanne de commande de frein de parking SAHR 24V", 2, 9, "Électrovanne frein SAHR", "Epiroc", "PIECE", 4200, "CRITIQUE"],
  ["hyd_12", "3128 3012", "Électrovanne d'activation de la fonction levage rapide", 2, 9, "Électrovanne levage", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["hyd_13", "3128 3013", "Vérin de direction double effet Ø80mm ST7 (Jeu de 2)", 2, 8, "Vérin de direction Ø80", "Epiroc", "JEU", 9200, "CRITIQUE"],
  ["hyd_14", "3128 3014", "Vérin de levage principal (Hoist) double effet Ø125mm ST7", 2, 8, "Vérin de levage Ø125", "Epiroc", "PIECE", 14500, "CRITIQUE"],
  ["hyd_15", "3128 3015", "Vérin de stabilisation/bennage double effet Ø150mm ST7", 2, 8, "Vérin stabilisation Ø150", "Epiroc", "PIECE", 15800, "CRITIQUE"],
  ["hyd_16", "3128 3016", "Joint de tige renforcé en polyuréthane pour vérin Ø80mm", 2, 8, "Joint de tige Ø80", "Epiroc", "PIECE", 480, "HAUTE"],
  ["hyd_17", "3128 3017", "Joint de tige renforcé en polyuréthane pour vérin Ø125mm", 2, 8, "Joint de tige Ø125", "Epiroc", "PIECE", 620, "HAUTE"],
  ["hyd_18", "3128 3018", "Joint de tige renforcé en polyuréthane pour vérin Ø150mm", 2, 8, "Joint de tige Ø150", "Epiroc", "PIECE", 780, "HAUTE"],
  ["hyd_19", "3128 3019", "Joint de piston étanche double effet pour vérin Ø80mm", 2, 8, "Joint piston Ø80", "Epiroc", "PIECE", 380, "HAUTE"],
  ["hyd_20", "3128 3020", "Joint de piston étanche double effet pour vérin Ø125mm", 2, 8, "Joint piston Ø125", "Epiroc", "PIECE", 520, "HAUTE"],
  ["hyd_21", "3128 3021", "Joint de piston étanche double effet pour vérin Ø150mm", 2, 8, "Joint piston Ø150", "Epiroc", "PIECE", 680, "HAUTE"],
  ["hyd_22", "3128 3022", "Kit de joints de réfection complet pour vérin Ø80mm", 2, 8, "Kit joints vérin Ø80", "Epiroc", "JEU", 1200, "HAUTE"],
  ["hyd_23", "3128 3023", "Kit de joints de réfection complet pour vérin Ø125mm", 2, 8, "Kit joints vérin Ø125", "Epiroc", "JEU", 1800, "HAUTE"],
  ["hyd_24", "3128 3024", "Kit de joints de réfection complet pour vérin Ø150mm", 2, 8, "Kit joints vérin Ø150", "Epiroc", "JEU", 2200, "HAUTE"],
  ["hyd_25", "3128 3025", "Flexible hydraulique haute pression tressé métallique 1/2\"", 2, 10, "Flexible 1/2\" HP", "Epiroc", "PIECE", 320, "MOYENNE"],
  ["hyd_26", "3128 3026", "Flexible hydraulique haute pression tressé métallique 3/4\"", 2, 10, "Flexible 3/4\" HP", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["hyd_27", "3128 3027", "Flexible hydraulique haute pression tressé métallique 1\"", 2, 10, "Flexible 1\" HP", "Epiroc", "PIECE", 580, "MOYENNE"],
  ["hyd_28", "3128 3028", "Flexible hydraulique haute pression tressé métallique 1 1/4\"", 2, 10, "Flexible 1 1/4\" HP", "Epiroc", "PIECE", 720, "MOYENNE"],
  ["hyd_29", "3128 3029", "Flexible hydraulique haute pression tressé métallique 1 1/2\"", 2, 10, "Flexible 1 1/2\" HP", "Epiroc", "PIECE", 950, "MOYENNE"],
  ["hyd_30", "3128 3030", "Flexible de pilotage hydraulique basse pression renforcé", 2, 10, "Flexible de pilotage", "Epiroc", "PIECE", 240, "MOYENNE"],
  ["hyd_31", "3128 3031", "Raccord droit union acier mâle JIC 1/2\"", 2, 10, "Raccord JIC 1/2\"", "Epiroc", "PIECE", 95, "BASSE"],
  ["hyd_32", "3128 3032", "Raccord droit union acier mâle JIC 3/4\"", 2, 10, "Raccord JIC 3/4\"", "Epiroc", "PIECE", 110, "BASSE"],
  ["hyd_33", "3128 3033", "Raccord droit union acier mâle JIC 1\"", 2, 10, "Raccord JIC 1\"", "Epiroc", "PIECE", 140, "BASSE"],
  ["hyd_34", "3128 3034", "Raccord d'angle coude acier 90° JIC mâle-femelle 3/4\"", 2, 10, "Coude JIC 90°", "Epiroc", "PIECE", 160, "BASSE"],
  ["hyd_35", "3128 3035", "Raccord en T d'égalisation acier JIC mâle 3/4\"", 2, 10, "Raccord Té JIC", "Epiroc", "PIECE", 190, "BASSE"],
  ["hyd_36", "3128 3036", "Raccord d'étanchéité plane ORFS mâle 1\"", 2, 10, "Raccord ORFS 1\"", "Epiroc", "PIECE", 180, "BASSE"],
  ["hyd_37", "3128 3037", "Raccord d'implantation à vis BSP mâle 1/2\"", 2, 10, "Raccord BSP 1/2\"", "Epiroc", "PIECE", 85, "BASSE"],
  ["hyd_38", "3128 3038", "Bouchon d'obturation en acier JIC femelle 1/2\"", 2, 10, "Bouchon JIC 1/2\"", "Epiroc", "PIECE", 45, "BASSE"],
  ["hyd_39", "3128 3039", "Joint torique d'étanchéité standard NBR 90 Shore", 2, 10, "Joint torique NBR", "Epiroc", "PIECE", 25, "BASSE"],
  ["hyd_40", "3128 3040", "Joint torique d'étanchéité haute température Viton FKM", 2, 10, "Joint torique Viton", "Epiroc", "PIECE", 35, "BASSE"],
  ["hyd_41", "3128 3041", "Bague d'étanchéité anti-extrusion Joint PTFE", 2, 10, "Bague PTFE backup", "Epiroc", "PIECE", 40, "BASSE"],
  ["hyd_42", "3128 3042", "Filtre hydraulique de retour à haut débit 12 microns ST7", 2, 11, "Filtre retour 12µm", "Epiroc", "PIECE", 580, "CRITIQUE"],
  ["hyd_43", "3128 3043", "Filtre hydraulique d'aspiration métallique à grille", 2, 11, "Filtre d'aspiration", "Epiroc", "PIECE", 620, "CRITIQUE"],
  ["hyd_44", "3128 3044", "Filtre de pression en ligne haute performance", 2, 11, "Filtre de pression", "Epiroc", "PIECE", 850, "CRITIQUE"],
  ["hyd_45", "3128 3045", "Indicateur électronique de colmatage de filtre de retour", 2, 11, "Indicateur colmatage", "Epiroc", "PIECE", 480, "MOYENNE"],
  ["hyd_46", "3128 3046", "Réducteur de roue planétaire Okubo Rock Tough 406 AV", 2, 7, "Réducteur planétaire AV", "Okubo 406", "PIECE", 12500, "CRITIQUE"],
  ["hyd_47", "3128 3047", "Réducteur de roue planétaire Okubo Rock Tough 406 AR", 2, 7, "Réducteur planétaire AR", "Okubo 406", "PIECE", 12500, "CRITIQUE"],
  ["hyd_48", "3128 3048", "Couronne dentée interne pour Okubo Rock Tough 406", 2, 7, "Couronne planétaire", "Okubo 406", "PIECE", 5200, "HAUTE"],
  ["hyd_49", "3128 3049", "Pignon solaire d'entraînement pour réducteur Okubo", 2, 7, "Pignon solaire Okubo", "Okubo 406", "PIECE", 3200, "HAUTE"],
  ["hyd_50", "3128 3050", "Roulement à billes de moyeu de réducteur Okubo", 2, 7, "Roulement de moyeu", "Okubo 406", "PIECE", 2800, "HAUTE"],
  ["hyd_51", "3128 3051", "Accumulateur hydraulique à membrane de freinage", 2, 13, "Accumulateur à membrane", "Epiroc", "PIECE", 3800, "CRITIQUE"],
  ["hyd_52", "3128 3052", "Soupape de décharge et de sécurité de bloc d'accumulateur", 2, 13, "Soupape d'accumulateur", "Epiroc", "PIECE", 1600, "HAUTE"],
  ["hyd_53", "3128 3053", "Réservoir d'huile hydraulique métallique renforcé 111L", 2, 13, "Réservoir hydraulique 111L", "Epiroc", "PIECE", 8500, "CRITIQUE"],
  ["hyd_54", "3128 3054", "Jauge de niveau d'huile verticale avec thermomètre intégré", 2, 12, "Jauge de niveau hyd.", "Epiroc", "PIECE", 520, "MOYENNE"],
  ["hyd_55", "3128 3055", "Échangeur thermique aéro-réfrigérant d'huile hydraulique", 2, 12, "Échangeur thermique hyd.", "Epiroc", "PIECE", 5800, "HAUTE"],
  ["hyd_56", "3128 3056", "Manomètre de contrôle de pression glycérine 0-30 MPa", 2, 12, "Manomètre 0-30 MPa", "Epiroc", "PIECE", 450, "MOYENNE"],
  ["hyd_57", "3128 3057", "Capteur de pression de ligne analogique de direction", 2, 12, "Capteur pression direction", "Epiroc", "PIECE", 580, "HAUTE"],
  ["hyd_58", "3128 3058", "Capteur de température d'huile hydraulique numérique", 2, 12, "Sonde température hyd.", "Epiroc", "PIECE", 520, "MOYENNE"],
  ["hyd_59", "3128 3059", "Limiteur de pression hydraulique principal réglable", 2, 9, "Limiteur de pression", "Epiroc", "PIECE", 2400, "CRITIQUE"],
  ["hyd_60", "3128 3060", "Valve d'équilibrage et de blocage antichoc de vérin", 2, 9, "Valve antichoc", "Epiroc", "PIECE", 1800, "CRITIQUE"],
  ["hyd_61", "3128 3061", "Valve de dérivation by-pass manuelle d'urgence", 2, 9, "Valve by-pass d'urgence", "Epiroc", "PIECE", 1500, "HAUTE"],
  ["hyd_62", "3128 3062", "Capteur électronique de détection de fuite hydraulique", 2, 12, "Détecteur de fuite hyd.", "Epiroc", "PIECE", 1200, "HAUTE"],
  ["hyd_63", "3128 3063", "Kit de joints de rechange complet de distributeur principal", 2, 9, "Kit joints distributeur", "Epiroc", "JEU", 2200, "HAUTE"],
  ["hyd_64", "3128 3064", "Flexible hydraulique de retour principal tressé 2\"", 2, 10, "Flexible retour 2\"", "Epiroc", "PIECE", 1100, "MOYENNE"],
  ["hyd_65", "3128 3065", "Raccord union coudé 45° acier JIC mâle 1/2\"", 2, 10, "Raccord JIC 45°", "Epiroc", "PIECE", 110, "BASSE"],
  ["hyd_66", "5580 3066", "Huile hydraulique minérale ISO VG 46 (Fût 20L)", 2, 11, "Huile hydraulique VG46", "Epiroc", "LITRE", 28, "CRITIQUE"],
  ["hyd_67", "5580 3067", "Huile hydraulique biodégradable Panolin HLPD 46 (Fût 20L)", 2, 11, "Huile hydraulique biodégradable", "Panolin", "LITRE", 45, "HAUTE"],

  // SOU-SYSTÈME 3 : TRANSMISSION & CONVERTISSEUR — Funk DF150 (35 pièces)
  ["tra_01", "3115 6001", "Transmission automatique power shift Funk DF150", 3, 15, "Transmission Funk DF150", "Funk DF150", "PIECE", 38000, "CRITIQUE"],
  ["tra_02", "3115 6002", "Turbine d'impulsion de convertisseur intégré DF150", 3, 14, "Turbine convertisseur", "Funk DF150", "PIECE", 8500, "CRITIQUE"],
  ["tra_03", "3115 6003", "Stator de couple de convertisseur intégré DF150", 3, 14, "Stator convertisseur", "Funk DF150", "PIECE", 7200, "CRITIQUE"],
  ["tra_04", "3115 6004", "Réacteur de stator de convertisseur intégré DF150", 3, 14, "Réacteur convertisseur", "Funk DF150", "PIECE", 6200, "CRITIQUE"],
  ["tra_05", "3115 6005", "Disque de friction d'embrayage bronze de boîte DF150", 3, 15, "Disque d'embrayage bronze", "Funk DF150", "PIECE", 1200, "HAUTE"],
  ["tra_06", "3115 6006", "Disque d'acier d'intercalaire d'embrayage de boîte DF150", 3, 15, "Disque d'embrayage acier", "Funk DF150", "PIECE", 850, "HAUTE"],
  ["tra_07", "3115 6007", "Plateau de pression d'embrayage de transmission DF150", 3, 15, "Plateau d'embrayage", "Funk DF150", "PIECE", 3200, "HAUTE"],
  ["tra_08", "3115 6008", "Butée mécanique d'embrayage de transmission DF150", 3, 15, "Butée d'embrayage", "Funk DF150", "PIECE", 1900, "HAUTE"],
  ["tra_09", "3115 6009", "Piston hydraulique d'application d'embrayage de boîte", 3, 15, "Piston d'embrayage", "Funk DF150", "PIECE", 2400, "HAUTE"],
  ["tra_10", "3115 6010", "Axe d'entraînement principal cannelé de boîte DF150", 3, 15, "Arbre cannelé principal", "Funk DF150", "PIECE", 6800, "CRITIQUE"],
  ["tra_11", "3115 6011", "Arbre de renvoi intermédiaire de transmission DF150", 3, 15, "Arbre de renvoi", "Funk DF150", "PIECE", 5800, "HAUTE"],
  ["tra_12", "3115 6012", "Pignon de transmission de 1ère vitesse de boîte", 3, 15, "Pignon de 1ère", "Funk DF150", "PIECE", 3800, "HAUTE"],
  ["tra_13", "3115 6013", "Pignon de transmission de 2ème vitesse de boîte", 3, 15, "Pignon de 2ème", "Funk DF150", "PIECE", 3800, "HAUTE"],
  ["tra_14", "3115 6014", "Pignon de transmission de 3ème vitesse de boîte", 3, 15, "Pignon de 3ème", "Funk DF150", "PIECE", 3800, "HAUTE"],
  ["tra_15", "3115 6015", "Pignon de transmission de 4ème vitesse de boîte", 3, 15, "Pignon de 4ème", "Funk DF150", "PIECE", 3800, "HAUTE"],
  ["tra_16", "3115 6016", "Roulement de guidage à billes d'arbre principal avant", 3, 15, "Roulement arbre AV", "Funk DF150", "PIECE", 1600, "HAUTE"],
  ["tra_17", "3115 6017", "Roulement de guidage à billes d'arbre principal arrière", 3, 15, "Roulement arbre AR", "Funk DF150", "PIECE", 1600, "HAUTE"],
  ["tra_18", "3115 6018", "Roulement à rouleaux coniques d'arbre intermédiaire", 3, 15, "Roulement intermédiaire", "Funk DF150", "PIECE", 1400, "HAUTE"],
  ["tra_19", "3115 6019", "Carter métallique robuste de boîte de vitesses DF150", 3, 15, "Carter de boîte", "Funk DF150", "PIECE", 10500, "CRITIQUE"],
  ["tra_20", "3115 6020", "Joint de carter de transmission d'origine DF150", 3, 15, "Joint de carter", "Funk DF150", "PIECE", 780, "MOYENNE"],
  ["tra_21", "3115 6021", "Bouchon magnétique de vidange de boîte de vitesses", 3, 15, "Bouchon de vidange", "Epiroc", "PIECE", 180, "BASSE"],
  ["tra_22", "3115 6022", "Jauge de niveau d'huile mécanique de boîte DF150", 3, 15, "Jauge de niveau boîte", "Epiroc", "PIECE", 280, "BASSE"],
  ["tra_23", "3115 6023", "Capteur inductif de vitesse de sortie de transmission", 3, 15, "Capteur de vitesse boîte", "Epiroc", "PIECE", 580, "HAUTE"],
  ["tra_24", "3115 6024", "Capteur de position électronique de levier de vitesses", 3, 15, "Capteur de rapport", "Epiroc", "PIECE", 520, "MOYENNE"],
  ["tra_25", "3115 6025", "Capteur de température d'huile de transmission", 3, 15, "Capteur température boîte", "Epiroc", "PIECE", 480, "HAUTE"],
  ["tra_26", "3115 6026", "Arbre de transmission à cardan principal avant complet ST7", 3, 15, "Arbre cardan avant", "Epiroc", "PIECE", 4200, "CRITIQUE"],
  ["tra_27", "3115 6027", "Arbre de transmission à cardan principal arrière complet ST7", 3, 15, "Arbre cardan arrière", "Epiroc", "PIECE", 4200, "CRITIQUE"],
  ["tra_28", "3115 6028", "Croisillon de cardan universel avec graisseur", 3, 15, "Croisillon de cardan", "Epiroc", "PIECE", 1900, "HAUTE"],
  ["tra_29", "3115 6029", "Roulement d'appui intermédiaire d'arbre de transmission", 3, 15, "Roulement de palier cardan", "Epiroc", "PIECE", 1100, "MOYENNE"],
  ["tra_30", "3115 6030", "Cale d'ajustement d'épaisseur pour engrenage différentiel", 3, 15, "Cale de calage", "Epiroc", "PIECE", 380, "BASSE"],
  ["tra_31", "3115 6031", "Sélecteur de vitesses électronique de poste opérateur 24V", 3, 15, "Sélecteur de rapport", "Epiroc", "PIECE", 4800, "HAUTE"],
  ["tra_32", "3115 6032", "Bloc d'électrovannes de commande de boîte Funk", 3, 15, "Bloc d'électrovannes boîte", "Funk", "PIECE", 8500, "CRITIQUE"],
  ["tra_33", "3115 6033", "Pignon de liaison à chaîne d'arbre de renvoi", 3, 15, "Pignon à chaîne", "Epiroc", "PIECE", 2800, "MOYENNE"],
  ["tra_34", "3115 6034", "Chaîne de transmission de rechange renforcée", 3, 15, "Chaîne de boîte", "Epiroc", "PIECE", 3500, "HAUTE"],
  ["tra_35", "3115 6035", "Tendeur mécanique de chaîne de transmission de boîte", 3, 15, "Tendeur de chaîne", "Epiroc", "PIECE", 1400, "MOYENNE"],
  ["tra_36", "5580 6036", "Huile de transmission ATF Allison C-4 Dexron III (Fût 20L)", 3, 15, "Huile de transmission ATF", "Allison", "LITRE", 35, "CRITIQUE"],

  // SOU-SYSTÈME 4 : PONTS, ESSIEUX & ROUES — Okubo Rock Tough 406 (40 pièces)
  ["pon_01", "3115 7001", "Carter de pont avant d'origine Okubo Rock Tough 406", 4, 16, "Carter de pont avant", "Okubo 406", "PIECE", 12500, "CRITIQUE"],
  ["pon_02", "3115 7002", "Carter de pont arrière d'origine Okubo Rock Tough 406", 4, 16, "Carter de pont arrière", "Okubo 406", "PIECE", 12000, "CRITIQUE"],
  ["pon_03", "3115 7003", "Différentiel autobloquant No-Spin de pont avant Okubo", 4, 16, "Différentiel No-Spin AV", "Okubo 406", "PIECE", 9500, "CRITIQUE"],
  ["pon_04", "3115 7004", "Différentiel standard ouvert (Open) de pont arrière Okubo", 4, 16, "Différentiel standard AR", "Okubo 406", "PIECE", 8500, "CRITIQUE"],
  ["pon_05", "3115 7005", "Demi-arbre de transmission de roue avant gauche Okubo", 4, 16, "Demi-arbre gauche AV", "Okubo 406", "PIECE", 4800, "HAUTE"],
  ["pon_06", "3115 7006", "Demi-arbre de transmission de roue avant droit Okubo", 4, 16, "Demi-arbre droit AV", "Okubo 406", "PIECE", 4800, "HAUTE"],
  ["pon_07", "3115 7007", "Demi-arbre de transmission de roue arrière gauche Okubo", 4, 16, "Demi-arbre gauche AR", "Okubo 406", "PIECE", 4500, "HAUTE"],
  ["pon_08", "3115 7008", "Demi-arbre de transmission de roue arrière droit Okubo", 4, 16, "Demi-arbre droit AR", "Okubo 406", "PIECE", 4500, "HAUTE"],
  ["pon_09", "3115 7009", "Roulement conique de roue avant de pont Okubo 406", 4, 16, "Roulement de roue AV", "Okubo 406", "PIECE", 3200, "HAUTE"],
  ["pon_10", "3115 7010", "Roulement conique de roue arrière de pont Okubo 406", 4, 16, "Roulement de roue AR", "Okubo 406", "PIECE", 3200, "HAUTE"],
  ["pon_11", "3115 7011", "Roulement conique de pignon d'attaque de différentiel", 4, 16, "Roulement de pignon d'attaque", "Okubo 406", "PIECE", 2400, "HAUTE"],
  ["pon_12", "3115 7012", "Joint SPI double lèvre d'étanchéité roue avant Okubo", 4, 16, "Joint SPI de roue AV", "Epiroc", "PIECE", 680, "HAUTE"],
  ["pon_13", "3115 7013", "Joint SPI double lèvre d'étanchéité roue arrière Okubo", 4, 16, "Joint SPI de roue AR", "Epiroc", "PIECE", 680, "HAUTE"],
  ["pon_14", "3115 7014", "Joint SPI d'arbre d'entrée de différentiel avant", 4, 16, "Joint SPI de nez de pont", "Epiroc", "PIECE", 480, "HAUTE"],
  ["pon_15", "3115 7015", "Joint SPI d'arbre d'entrée de différentiel arrière", 4, 16, "Joint SPI de nez de pont", "Epiroc", "PIECE", 480, "HAUTE"],
  ["pon_16", "3115 7016", "Silentbloc de montage rigide d'essieu avant", 4, 16, "Silentbloc d'essieu AV", "Epiroc", "PIECE", 1400, "MOYENNE"],
  ["pon_17", "3115 7017", "Silentbloc d'oscillation élastomère d'essieu arrière", 4, 16, "Silentbloc d'essieu AR", "Epiroc", "PIECE", 1400, "MOYENNE"],
  ["pon_18", "3115 7018", "Support d'oscillation rigide de pont arrière Okubo", 4, 16, "Support d'oscillation AR", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["pon_19", "3115 7019", "Amortisseur de vibrations hydraulique d'essieu", 4, 16, "Amortisseur d'essieu", "Epiroc", "PIECE", 1800, "MOYENNE"],
  ["pon_20", "3115 7020", "Jante de roue robuste 5-pièces pour pneus 17.5x25", 4, 17, "Jante de roue 17.5x25", "Epiroc", "PIECE", 6800, "HAUTE"],
  ["pon_21", "3115 7021", "Pneu standard 17.5x25 20ply L5S minier tubeless", 4, 17, "Pneu 17.5x25 L5S", "Epiroc", "PIECE", 14500, "CRITIQUE"],
  ["pon_22", "3115 7022", "Pneu radial optionnel 17.5R25 Michelin X-Mine D2", 4, 17, "Pneu 17.5R25 X-Mine", "Michelin", "PIECE", 19500, "CRITIQUE"],
  ["pon_23", "3115 7023", "Valve de pneu coudée renforcée pour jante 17.5x25", 4, 17, "Valve de pneu", "Epiroc", "PIECE", 220, "BASSE"],
  ["pon_24", "3115 7024", "Goujon de fixation de roue renforcé M30 x 2.0 d'origine", 4, 17, "Goujon de roue M30", "Epiroc", "PIECE", 180, "HAUTE"],
  ["pon_25", "3115 7025", "Écrou de roue renforcé M30 d'origine", 4, 17, "Écrou de roue M30", "Epiroc", "PIECE", 110, "HAUTE"],
  ["pon_26", "3115 7026", "Rondelle conique de blocage de roue M30", 4, 17, "Rondelle de roue M30", "Epiroc", "PIECE", 55, "HAUTE"],
  ["pon_27", "3115 7027", "Disque de frein de service wet humide pour pont Okubo", 4, 16, "Disque de frein humide", "Okubo 406", "PIECE", 3200, "CRITIQUE"],
  ["pon_28", "3115 7028", "Plaquette de frein humide de pont Okubo (Jeu de 4)", 4, 16, "Plaquettes de frein wet", "Okubo 406", "JEU", 2400, "CRITIQUE"],
  ["pon_29", "3115 7029", "Étrier hydraulique de frein humide sous carter", 4, 16, "Étrier de frein wet", "Okubo 406", "PIECE", 5200, "CRITIQUE"],
  ["pon_30", "3115 7030", "Pompe électrique de refroidissement des freins SAHR", 4, 16, "Pompe refroidissement freins", "SAHR", "PIECE", 4800, "HAUTE"],
  ["pon_31", "3115 7031", "Filtre d'huile de circuit de refroidissement des freins", 4, 16, "Filtre refroidissement freins", "Epiroc", "PIECE", 580, "HAUTE"],
  ["pon_32", "3115 7032", "Orbitrol de servocommande de direction hydraulique", 4, 16, "Orbitrol de direction", "Danfoss", "PIECE", 6800, "CRITIQUE"],
  ["pon_33", "3115 7033", "Colonne de direction articulée à volant réglable", 4, 16, "Colonne de direction", "Epiroc", "PIECE", 5500, "HAUTE"],
  ["pon_34", "3115 7034", "Volant de direction ergonomique avec pommeau", 4, 16, "Volant de direction", "Epiroc", "PIECE", 1200, "MOYENNE"],
  ["pon_35", "3115 7035", "Rotule d'articulation de cylindre de direction gauche", 4, 16, "Rotule de direction gauche", "Epiroc", "PIECE", 1800, "HAUTE"],
  ["pon_36", "3115 7036", "Rotule d'articulation de cylindre de direction droite", 4, 16, "Rotule de direction droite", "Epiroc", "PIECE", 1800, "HAUTE"],
  ["pon_37", "3115 7037", "Axe d'accouplement de fusée d'essieu Okubo", 4, 16, "Pivot de fusée", "Okubo 406", "PIECE", 2400, "HAUTE"],
  ["pon_38", "3115 7038", "Bague d'usure en bronze de pivot de fusée Okubo", 4, 16, "Bague pivot fusée", "Okubo 406", "PIECE", 680, "MOYENNE"],
  ["pon_39", "3115 7039", "Joint d'étanchéité à rotule d'essieu oscillant", 4, 16, "Joint à rotule essieu", "Epiroc", "PIECE", 450, "MOYENNE"],
  ["pon_40", "3115 7040", "Manomètre d'indication de pression de pneus", 4, 17, "Manomètre de pneus", "Epiroc", "PIECE", 320, "BASSE"],
  ["pon_41", "5580 7041", "Huile de pont GL-5 85W-140 haute pression (Fût 20L)", 4, 16, "Huile de pont GL-5 85W-140", "Epiroc", "LITRE", 32, "CRITIQUE"],

  // SOU-SYSTÈME 5 : FREINAGE & SÉCURITÉ — SAHR force-cooled wet discs, door interlock (30 pièces)
  ["fre_01", "3115 8001", "Disque de frein humide force-cooled de rechange d'origine", 5, 18, "Disque de frein wet", "Epiroc", "PIECE", 3200, "CRITIQUE"],
  ["fre_02", "3115 8002", "Plaquette de frein de rechange pour frein force-cooled", 5, 18, "Plaquettes de frein wet", "Epiroc", "JEU", 2400, "CRITIQUE"],
  ["fre_03", "3115 8003", "Joint torique haute température de carter de freins wet", 5, 18, "Joint torique freins wet", "Epiroc", "PIECE", 380, "HAUTE"],
  ["fre_04", "3115 8004", "Ressort de rappel interne de piston de frein force-cooled", 5, 18, "Ressort de frein wet", "Epiroc", "PIECE", 780, "HAUTE"],
  ["fre_05", "3115 8005", "Cylindre hydraulique de frein de parking SAHR de pont", 5, 18, "Cylindre SAHR", "Epiroc", "PIECE", 4800, "CRITIQUE"],
  ["fre_06", "3115 8006", "Ressort de compression interne de sécurité frein SAHR", 5, 18, "Ressort SAHR", "Epiroc", "PIECE", 2200, "CRITIQUE"],
  ["fre_07", "3115 8007", "Disque de friction de frein de parking SAHR de rechange", 5, 18, "Disque parking SAHR", "Epiroc", "PIECE", 1800, "CRITIQUE"],
  ["fre_08", "3115 8008", "Joint d'étanchéité SPI de cylindre SAHR", 5, 18, "Joint SPI cylindre SAHR", "Epiroc", "PIECE", 420, "HAUTE"],
  ["fre_09", "3115 8009", "Câble métallique d'actionnement manuel de frein parking", 5, 18, "Câble frein parking", "Epiroc", "PIECE", 1400, "HAUTE"],
  ["fre_10", "3115 8010", "Levier métallique de déverrouillage manuel de frein parking", 5, 18, "Levier frein parking", "Epiroc", "PIECE", 1100, "HAUTE"],
  ["fre_11", "3115 8011", "Valve de régulation et de modulation de freinage SAHR", 5, 19, "Valve régulation SAHR", "Epiroc", "PIECE", 4200, "CRITIQUE"],
  ["fre_12", "3115 8012", "Accumulateur hydraulique de circuit de freinage d'origine", 5, 19, "Accumulateur de freins", "Epiroc", "PIECE", 3500, "CRITIQUE"],
  ["fre_13", "3115 8013", "Pédale de commande hydraulique suspendue de frein de service", 5, 19, "Pédale de frein", "Epiroc", "PIECE", 2800, "CRITIQUE"],
  ["fre_14", "3115 8014", "Contacteur électrique de pression de pédale de frein", 5, 19, "Contacteur pédale frein", "Epiroc", "PIECE", 480, "HAUTE"],
  ["fre_15", "3115 8015", "Sélecteur électrique de commande de frein de parking", 5, 19, "Bouton frein de parking", "Epiroc", "PIECE", 520, "HAUTE"],
  ["fre_16", "3115 8016", "Sonde d'usure des garnitures de plaquettes de freins wet", 5, 18, "Capteur d'usure de freins", "Epiroc", "PIECE", 450, "MOYENNE"],
  ["fre_17", "3115 8017", "Capteur magnétique de position de frein de parking", 5, 19, "Capteur position parking", "Epiroc", "PIECE", 480, "MOYENNE"],
  ["fre_18", "3115 8018", "Électrovanne d'interverrouillage de sécurité de porte (Door Interlock)", 5, 20, "Électrovanne door interlock", "Epiroc", "PIECE", 3200, "CRITIQUE"],
  ["fre_19", "3115 8019", "Capteur de contact de fermeture de porte de cabine (Option)", 5, 20, "Capteur de contact porte", "Cabine option", "PIECE", 580, "CRITIQUE"],
  ["fre_20", "5580 8001", "Système d'extinction automatique Ansul Checkfire d'origine", 5, 20, "Système Ansul Checkfire", "Ansul", "PIECE", 18500, "CRITIQUE"],
  ["fre_21", "5580 8002", "Bouteille de poudre extinctrice Ansul 6kg de rechange", 5, 20, "Extincteur Ansul 6kg", "Ansul", "PIECE", 2400, "HAUTE"],
  ["fre_22", "5580 8003", "Capteur de détection thermique d'incendie linéaire", 5, 20, "Câble détection incendie", "Ansul", "METRE", 120, "HAUTE"],
  ["fre_23", "5580 8004", "Buse de diffusion de poudre extinctrice en laiton", 5, 20, "Buse extincteur", "Ansul", "PIECE", 280, "MOYENNE"],
  ["fre_24", "5580 8005", "Alarme avertisseur sonore de recul étanche 24V", 5, 20, "Avertisseur de recul 24V", "Epiroc", "PIECE", 1400, "HAUTE"],
  ["fre_25", "5580 8006", "Bouton poussoir d'arrêt d'urgence coup de poing d'origine", 5, 20, "Bouton d'arrêt d'urgence", "Epiroc", "PIECE", 380, "CRITIQUE"],
  ["fre_26", "5580 8007", "Régulateur électronique de limitation de vitesse maximale", 5, 20, "Limiteur de vitesse", "Epiroc", "PIECE", 4800, "HAUTE"],
  ["fre_27", "5580 8008", "Voyant témoin rouge d'alarme de pression de freinage", 5, 21, "Témoin pression freins", "Epiroc", "PIECE", 220, "MOYENNE"],
  ["fre_28", "5580 8009", "Gyrophare de signalisation orange à LED 24V", 5, 21, "Gyrophare orange LED", "Epiroc", "PIECE", 1100, "HAUTE"],
  ["fre_29", "5580 8010", "Projecteur de travail à LED 40W longue portée avant", 5, 21, "Phare LED 40W AV", "Epiroc", "PIECE", 3200, "HAUTE"],
  ["fre_30", "5580 8011", "Projecteur de travail à LED 40W longue portée arrière", 5, 21, "Phare LED 40W AR", "Epiroc", "PIECE", 3200, "HAUTE"],
  ["fre_31", "5580 8031", "Graisse compatible freins humides multidisques NLGI 2 sans MoS2 (Cartouche 400g)", 5, 18, "Graisse freins wet NLGI 2", "Epiroc", "PIECE", 280, "HAUTE"],
  ["fre_32", "5580 8032", "Kit de joints de réfection de maître-cylindre de frein de service ST7", 5, 19, "Kit joints maître-cylindre frein", "Epiroc", "KIT", 680, "HAUTE"],

  // SOU-SYSTÈME 6 : ÉLECTRICITÉ & POSTE OPÉRATEUR — 140A alternator, RCS dashboard, cabine pressurisée climatisée optionnelle (45 pièces)
  ["ele_01", "5580 9001", "Batterie sans entretien heavy duty étanche 12V 180Ah", 6, 22, "Batterie 12V 180Ah", "Epiroc", "PIECE", 2800, "CRITIQUE"],
  ["ele_02", "5580 9002", "Support métallique robuste de maintien double batterie", 6, 22, "Support de batterie", "Epiroc", "PIECE", 1400, "HAUTE"],
  ["ele_03", "5580 9003", "Fusible enfichable de protection de ligne 10A", 6, 23, "Fusible 10A", "Epiroc", "PIECE", 25, "BASSE"],
  ["ele_04", "5580 9004", "Fusible enfichable de protection de ligne 15A", 6, 23, "Fusible 15A", "Epiroc", "PIECE", 25, "BASSE"],
  ["ele_05", "5580 9005", "Fusible enfichable de protection de ligne 20A", 6, 23, "Fusible 20A", "Epiroc", "PIECE", 25, "BASSE"],
  ["ele_06", "5580 9006", "Fusible enfichable de protection de ligne 30A", 6, 23, "Fusible 30A", "Epiroc", "PIECE", 35, "BASSE"],
  ["ele_07", "5580 9007", "Relais électromécanique étanche 24V 40A d'origine", 6, 23, "Relais 24V 40A", "Epiroc", "PIECE", 180, "MOYENNE"],
  ["ele_08", "5580 9008", "Relais électrique de forte puissance 24V 100A", 6, 23, "Relais 24V 100A", "Epiroc", "PIECE", 320, "HAUTE"],
  ["ele_09", "5580 9009", "Contacteur Neiman d'allumage étanche à clé", 6, 24, "Interrupteur d'allumage", "Epiroc", "PIECE", 580, "HAUTE"],
  ["ele_10", "5580 9010", "Bouton interrupteur étanche de démarrage moteur", 6, 24, "Interrupteur de démarrage", "Epiroc", "PIECE", 480, "HAUTE"],
  ["ele_11", "5580 9011", "Interrupteur de commande des feux de travail LED", 6, 24, "Interrupteur phares", "Epiroc", "PIECE", 380, "MOYENNE"],
  ["ele_12", "5580 9012", "Bouton d'arrêt d'urgence coup de poing IP67 d'origine", 6, 24, "Arrêt d'urgence", "Epiroc", "PIECE", 380, "CRITIQUE"],
  ["ele_13", "5580 9013", "Alternateur industriel robuste Cummins 24V 140A", 6, 22, "Alternateur 24V 140A", "Cummins", "PIECE", 5800, "CRITIQUE"],
  ["ele_14", "5580 9014", "Convertisseur de tension de sécurité 24V vers 12V DC", 6, 22, "Convertisseur 24V/12V", "Epiroc", "PIECE", 1600, "HAUTE"],
  ["ele_15", "5580 9015", "Coupe-batterie manuel de sécurité avec clé lockout", 6, 24, "Coupe-batterie lockout", "Epiroc", "PIECE", 1400, "CRITIQUE"],
  ["ele_16", "5580 9016", "Capteur de température d'eau moteur Cummins", 6, 24, "Capteur température eau", "Cummins", "PIECE", 450, "HAUTE"],
  ["ele_17", "5580 9017", "Capteur de pression d'huile moteur Cummins", 6, 24, "Capteur pression huile", "Cummins", "PIECE", 480, "CRITIQUE"],
  ["ele_18", "5580 9018", "Capteur inductif de régime moteur d'origine", 6, 24, "Capteur régime moteur", "Cummins", "PIECE", 520, "CRITIQUE"],
  ["ele_19", "5580 9019", "Capteur capacitif de niveau de gazole de réservoir", 6, 24, "Capteur niveau gazole", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["ele_20", "5580 9020", "Capteur de position linéaire de levage de bras", 6, 24, "Capteur position bras", "Epiroc", "PIECE", 680, "MOYENNE"],
  ["ele_21", "5580 9021", "Projecteur de travail à LED 40W d'origine (13 requis)", 6, 21, "Feu de travail LED 40W", "Epiroc", "PIECE", 3200, "HAUTE"],
  ["ele_22", "5580 9022", "Feu de position LED étanche avant d'origine", 6, 21, "Feu de position AV", "Epiroc", "PIECE", 380, "MOYENNE"],
  ["ele_23", "5580 9023", "Feu de position LED étanche arrière d'origine", 6, 21, "Feu de position AR", "Epiroc", "PIECE", 380, "MOYENNE"],
  ["ele_24", "5580 9024", "Clignotant LED étanche avant d'origine 24V", 6, 21, "Clignotant LED AV", "Epiroc", "PIECE", 320, "MOYENNE"],
  ["ele_25", "5580 9025", "Clignotant LED étanche arrière d'origine 24V", 6, 21, "Clignotant LED AR", "Epiroc", "PIECE", 320, "MOYENNE"],
  ["ele_26", "5580 9026", "Avertisseur sonore klaxon étanche 24V IP67", 6, 21, "Avertisseur klaxon 24V", "Epiroc", "PIECE", 1200, "HAUTE"],
  ["ele_27", "5580 9027", "Toit de protection supérieur de canopy ISO ROPS/FOPS", 6, 26, "Toit de canopy", "Epiroc", "PIECE", 14500, "CRITIQUE"],
  ["ele_28", "5580 9028", "Siège suspendu Grammer haut de gamme réglable", 6, 26, "Siège suspendu Grammer", "Grammer", "PIECE", 9800, "HAUTE"],
  ["ele_29", "5580 9029", "Ceinture de sécurité réglable 2 points rétractable d'origine", 6, 26, "Ceinture rétractable 2 pts", "Epiroc", "PIECE", 950, "HAUTE"],
  ["ele_30", "5580 9030", "Ceinture de sécurité réglable 3 points haute sécurité", 6, 26, "Ceinture rétractable 3 pts", "Epiroc", "PIECE", 1200, "HAUTE"],
  ["ele_31", "5580 9031", "Tableau de bord de contrôle RCS complet avec écran couleur", 6, 25, "Écran de bord RCS", "Epiroc", "PIECE", 28000, "CRITIQUE"],
  ["ele_32", "5580 9032", "Calculateur électronique de commande RCS central", 6, 25, "Calculateur central RCS", "Epiroc", "PIECE", 32000, "CRITIQUE"],
  ["ele_33", "5580 9033", "Joystick multifonction de commande de bennage/levage", 6, 25, "Joystick hydraulique", "Epiroc", "PIECE", 5200, "HAUTE"],
  ["ele_34", "5580 9034", "Monostick de commande de direction ergonomique", 6, 25, "Monostick direction", "Epiroc", "PIECE", 4800, "HAUTE"],
  ["ele_35", "5580 9035", "Capteur de pesée de charge utile de godet (Load weighing)", 6, 25, "Sonde de pesée godet", "Epiroc", "PIECE", 9500, "HAUTE"],
  ["ele_36", "5580 9036", "Module électronique de contrôle de traction (Traction control)", 6, 25, "Calculateur antipatinage", "Epiroc", "PIECE", 14500, "HAUTE"],
  ["ele_37", "5580 9037", "Calculateur d'assistance Ride Control antibalancement (Option)", 6, 25, "Calculateur Ride Control", "Epiroc", "PIECE", 12500, "HAUTE"],
  ["ele_38", "5580 9038", "Caméra de recul étanche couleur grand angle (Option)", 6, 25, "Caméra de recul étanche", "Epiroc", "PIECE", 3200, "HAUTE"],
  ["ele_39", "5580 9039", "Écran de visualisation de caméra en cabine (Option)", 6, 25, "Écran caméra cabine", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["ele_40", "5580 9040", "Radio MP3 étanche industrielle pour poste opérateur (Option)", 6, 26, "Radio MP3 industrielle", "Epiroc", "PIECE", 1800, "BASSE"],
  ["ele_41", "5580 9041", "Compteur horaire numérique de tableau de bord d'origine", 6, 25, "Compteur horaire digital", "Epiroc", "PIECE", 580, "BASSE"],
  ["ele_42", "5580 9042", "Porte de cabine complète vitrée avec serrure (Option cabine)", 6, 26, "Porte cabine vitrée", "Epiroc", "PIECE", 16500, "HAUTE"],
  ["ele_43", "5580 9043", "Vitre latérale en verre feuilleté sécurisé (Option cabine)", 6, 26, "Vitre cabine latérale", "Epiroc", "PIECE", 4200, "MOYENNE"],
  ["ele_44", "5580 9044", "Pare-brise avant en verre feuilleté trempé (Option cabine)", 6, 26, "Pare-brise avant cabine", "Epiroc", "PIECE", 6800, "HAUTE"],
  ["ele_45", "5580 9045", "Module complet de climatisation de cabine 24V (Option cabine)", 6, 26, "Climatisation cabine", "Epiroc", "PIECE", 12500, "HAUTE"],
  ["ele_46", "5580 9046", "Câble de masse batterie 70mm² renforcé longueur 1.5m", 6, 22, "Câble de masse batterie", "Epiroc", "PIECE", 620, "HAUTE"],
  ["ele_47", "5580 9047", "Câble de démarrage positif 70mm² renforcé longueur 1.2m", 6, 22, "Câble démarrage positif", "Epiroc", "PIECE", 580, "HAUTE"],
  ["ele_48", "5580 9048", "Cosses de batterie en plomb renforcées (Jeu de 2)", 6, 22, "Cosses de batterie", "Epiroc", "JEU", 120, "MOYENNE"],

  // SOU-SYSTÈME 7 : CHÂSSIS, STRUCTURE & LIAISON — 8720mm frame, central lubrication, knockdown option (45 pièces)
  ["cha_01", "0428 8001", "Châssis avant complet mécano-soudé ultra-robuste ST7", 7, 28, "Cadre avant châssis", "Epiroc", "PIECE", 38000, "CRITIQUE"],
  ["cha_02", "0428 8002", "Châssis arrière complet mécano-soudé ultra-robuste ST7", 7, 28, "Cadre arrière châssis", "Epiroc", "PIECE", 35000, "CRITIQUE"],
  ["cha_03", "0428 8003", "Axe d'accouplement supérieur d'articulation centrale", 7, 27, "Axe supérieur articulation", "Epiroc", "PIECE", 11500, "CRITIQUE"],
  ["cha_04", "0428 8004", "Axe d'accouplement inférieur d'articulation centrale", 7, 27, "Axe inférieur articulation", "Epiroc", "PIECE", 11500, "CRITIQUE"],
  ["cha_05", "0428 8005", "Roulement de pivot d'articulation centrale à rotule SKF", 7, 27, "Roulement d'articulation", "SKF", "PIECE", 4800, "CRITIQUE"],
  ["cha_06", "0428 8006", "Bague d'usure cémentée d'axe d'articulation d'origine", 7, 27, "Bague d'usure articulation", "Epiroc", "PIECE", 1950, "HAUTE"],
  ["cha_07", "0428 8007", "Joint d'étanchéité SPI double lèvre d'articulation", 7, 27, "Joint d'étanchéité articulation", "Epiroc", "PIECE", 680, "HAUTE"],
  ["cha_08", "0428 8008", "Cale de réglage d'épaisseur de pivot d'articulation", 7, 27, "Cale de réglage articulation", "Epiroc", "PIECE", 320, "BASSE"],
  ["cha_09", "0428 8009", "Graisseur d'articulation haute pression fileté M10", 7, 27, "Graisseur articulation", "Epiroc", "PIECE", 85, "BASSE"],
  ["cha_10", "0428 8010", "Marchepied antidérapant d'accès opérateur avant", 7, 28, "Marchepied avant", "Epiroc", "PIECE", 3200, "MOYENNE"],
  ["cha_11", "0428 8011", "Marchepied antidérapant d'accès opérateur arrière", 7, 28, "Marchepied arrière", "Epiroc", "PIECE", 3200, "MOYENNE"],
  ["cha_12", "0428 8012", "Échelle d'accès métallique robuste pour poste opérateur", 7, 28, "Échelle d'accès", "Epiroc", "PIECE", 4500, "MOYENNE"],
  ["cha_13", "0428 8013", "Poignée de maintien d'accès robuste de canopy", 7, 28, "Poignée de maintien", "Canopy", "PIECE", 680, "HAUTE"],
  ["cha_14", "0428 8014", "Garde-boue métallique lourd avant gauche", 7, 28, "Garde-boue AV gauche", "Epiroc", "PIECE", 2800, "BASSE"],
  ["cha_15", "0428 8015", "Garde-boue métallique lourd avant droit", 7, 28, "Garde-boue AV droit", "Epiroc", "PIECE", 2800, "BASSE"],
  ["cha_16", "0428 8016", "Garde-boue métallique lourd arrière gauche", 7, 28, "Garde-boue AR gauche", "Epiroc", "PIECE", 2600, "BASSE"],
  ["cha_17", "0428 8017", "Garde-boue métallique lourd arrière droit", 7, 28, "Garde-boue AR droit", "Epiroc", "PIECE", 2600, "BASSE"],
  ["cha_18", "0428 8018", "Tôle d'acier de blindage de réservoir hydraulique", 7, 28, "Blindage réservoir hyd.", "Epiroc", "PIECE", 4200, "HAUTE"],
  ["cha_19", "0428 8019", "Tôle d'acier de blindage de réservoir de gazole", 7, 28, "Blindage réservoir gazole", "Epiroc", "PIECE", 4200, "HAUTE"],
  ["cha_20", "0428 8020", "Blindage métallique de bas de caisse latéral gauche", 7, 28, "Bouclier latéral gauche", "Epiroc", "PIECE", 5800, "HAUTE"],
  ["cha_21", "0428 8021", "Blindage métallique de bas de caisse latéral droit", 7, 28, "Bouclier latéral droit", "Epiroc", "PIECE", 5800, "HAUTE"],
  ["cha_22", "0428 8022", "Carter métallique de protection d'articulation centrale", 7, 27, "Carter d'articulation", "Epiroc", "PIECE", 3200, "MOYENNE"],
  ["cha_23", "0428 8023", "Grille de protection métallique de phare avant", 7, 28, "Grille de phare AV", "Epiroc", "PIECE", 1200, "BASSE"],
  ["cha_24", "0428 8024", "Grille de protection métallique de capot moteur", 7, 28, "Grille de capot moteur", "Epiroc", "PIECE", 3500, "HAUTE"],
  ["cha_25", "0428 8025", "Grille de sécurité métallique de ventilateur d'eau", 7, 28, "Grille ventilateur eau", "Epiroc", "PIECE", 1800, "HAUTE"],
  ["cha_26", "0428 8026", "Crochet de remorquage en acier forgé avant", 7, 28, "Crochet remorquage AV", "Epiroc", "PIECE", 5800, "HAUTE"],
  ["cha_27", "0428 8027", "Crochet de remorquage en acier forgé arrière", 7, 28, "Crochet remorquage AR", "Epiroc", "PIECE", 5500, "HAUTE"],
  ["cha_28", "0428 8028", "Câble métallique de remorquage d'origine 5M", 7, 28, "Câble de remorquage 5M", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["cha_29", "0428 8029", "Élingue de sécurité de levage en textile renforcé", 7, 28, "Élingue de levage", "Epiroc", "PIECE", 1800, "HAUTE"],
  ["cha_30", "0428 8030", "Plaque de carter de blindage inférieur avant", 7, 28, "Blindage inférieur AV", "Epiroc", "PIECE", 4800, "HAUTE"],
  ["cha_31", "0428 8031", "Plaque de carter de blindage inférieur arrière", 7, 28, "Blindage inférieur AR", "Epiroc", "PIECE", 4200, "HAUTE"],
  ["cha_32", "0428 8032", "Pompe de graissage centralisé automatique Lincoln (Option)", 7, 28, "Pompe Lincoln automatique", "Lincoln", "PIECE", 18500, "CRITIQUE"],
  ["cha_33", "0428 8033", "Distributeur de graisse centralisé à 6 sorties", 7, 28, "Distributeur graisse 6S", "Lincoln", "PIECE", 2400, "HAUTE"],
  ["cha_34", "0428 8034", "Distributeur de graisse centralisé à 12 sorties", 7, 28, "Distributeur graisse 12S", "Lincoln", "PIECE", 3800, "HAUTE"],
  ["cha_35", "0428 8035", "Flexible d'alimentation en graisse haute pression 1/4\"", 7, 28, "Flexible graisse 1/4\"", "Epiroc", "METRE", 110, "MOYENNE"],
  ["cha_36", "0428 8036", "Cale de roue robuste en polyuréthane (Wheel chock) (Jeu)", 7, 28, "Cale de roue", "Epiroc", "JEU", 1200, "HAUTE"],
  ["cha_37", "0428 8037", "Kit de boulonnerie et visserie d'articulation M30+", 7, 28, "Boulonnerie M30+", "Epiroc", "KIT", 3800, "HAUTE"],
  ["cha_38", "0428 8038", "Raccord rapide de remplissage rapide fuel Wiggins (Option)", 7, 28, "Raccord Wiggins fuel", "Wiggins", "PIECE", 4200, "HAUTE"],
  ["cha_39", "0428 8039", "Kit de structure démontable Knockdown (Option)", 7, 28, "Structure Knockdown", "Epiroc", "KIT", 28000, "HAUTE"],
  ["cha_40", "0428 8040", "Axe d'articulation de vérin de direction", 7, 27, "Axe de vérin direction", "Epiroc", "PIECE", 2400, "HAUTE"],
  ["cha_41", "0428 8041", "Axe d'articulation de vérin de levage", 7, 27, "Axe de vérin levage", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["cha_42", "0428 8042", "Bague d'axe de vérin de direction en bronze", 7, 27, "Bague vérin direction", "Epiroc", "PIECE", 580, "MOYENNE"],
  ["cha_43", "0428 8043", "Bague d'axe de vérin de levage en bronze", 7, 27, "Bague vérin levage", "Epiroc", "PIECE", 720, "MOYENNE"],
  ["cha_44", "0428 8044", "Réservoir de carburant métallique renforcé 190L ST7", 7, 28, "Réservoir de gazole 190L", "Epiroc", "PIECE", 9500, "CRITIQUE"],
  ["cha_45", "0428 8045", "Bouchon antivol verrouillable de réservoir de gazole", 7, 28, "Bouchon gazole antivol", "Epiroc", "PIECE", 480, "MOYENNE"],
  ["cha_46", "0428 8046", "Graisse lithium EP NLGI 2 pour articulations (Fût 20kg)", 7, 27, "Graisse NLGI 2 articulations", "Lincoln", "PIECE", 85, "CRITIQUE"],
  ["cha_47", "0428 8047", "Graisse lithium EP NLGI 2 pour articulations (Cartouche 400g)", 7, 27, "Graisse NLGI 2 cartouche", "Lincoln", "PIECE", 45, "CRITIQUE"],
  ["cha_48", "0428 8048", "Goupille de pivot de bras de levage avant ST7", 7, 27, "Goupille pivot bras levage AV", "Epiroc", "PIECE", 2400, "HAUTE"],
  ["cha_49", "0428 8049", "Bague de pivot de bras de levage en bronze cémenté", 7, 27, "Bague pivot bras levage", "Epiroc", "PIECE", 1200, "HAUTE"],
  ["cha_50", "0428 8050", "Dent de godet GET type minier compatible ST7 (pièce)", 7, 28, "Dent de godet GET", "Epiroc", "PIECE", 1800, "CRITIQUE"],
  ["cha_51", "0428 8051", "Adaptateur de dent de godet GET compatible ST7", 7, 28, "Adaptateur GET godet", "Epiroc", "PIECE", 2800, "CRITIQUE"],
  ["cha_52", "0428 8052", "Verrou de fixation de dent GET (Jeu de 10)", 7, 28, "Verrous GET godet", "Epiroc", "JEU", 480, "HAUTE"],
  ["cha_53", "0428 8053", "Lame frontale de godet en acier Hardox ST7", 7, 28, "Lame de godet Hardox", "Epiroc", "PIECE", 8500, "HAUTE"]
];

export const ST7_CATALOG: CatalogItem[] = RAW_ITEMS.map(([idSuffix, reference, designationRaw, catIndex, subCatIndex, component, subComponent, unit, price, criticality]) => {
  const cat = CATEGORIES[catIndex];
  const subCategory = SUB_CATEGORIES[subCatIndex];
  const designation = `[${cat.prefix}] - [${component.toUpperCase()}] - ${designationRaw}`;

  return {
    id: `st7_${idSuffix}`,
    reference,
    designation,
    functionalCategory: cat.name,
    subCategory,
    component,
    subComponent,
    unit,
    price,
    proposedPrice: price,
    compatibility: "Epiroc Scooptram ST7",
    criticality,
    suggestedType: "ENGINS"
  };
});
