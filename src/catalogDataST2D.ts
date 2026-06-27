/*
 * RAPPORT DE CORRECTION DES ERREURS CRITIQUES - CATALOGUE ST2D
 * 
 * 1. Erreur mot_29 : Radiateur d'huile moteur air-cooled
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["mot_29", "0428 1029", "Radiateur d'huile moteur air-cooled", 1, 3, "Radiateur d'huile", "Deutz", "PIECE", 3200, "HAUTE"],
 *    - Nouvelle valeur : ["mot_29", "0428 1029", "Refroidisseur d'huile moteur par circulation d'air", 1, 3, "Refroidisseur d'huile", "Air-cooled", "PIECE", 3200, "HAUTE"],
 *    - Source de vérification : Spécifications techniques Atlas Copco ST2D et moteur Deutz FL912W (moteur refroidi par air, pas de radiateur d'huile à eau séparé, échangeur air-huile refroidi par le ventilateur principal)
 *    - Niveau de confiance : CERTAIN
 * 
 * 2. Erreur mot_43 : Catalyseur d'échappement minier purificateur
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["mot_43", "0428 1043", "Catalyseur d'échappement minier purificateur", 1, 2, "Catalyseur d'échappement", "Epiroc", "PIECE", 6200, "HAUTE"],
 *    - Nouvelle valeur : ["mot_43", "0428 1043", "Silencieux d'échappement avec purificateur", 1, 2, "Silencieux d'échappement", "Avec purificateur", "PIECE", 6200, "HAUTE"],
 *    - Source de vérification : Catalogue des pièces ST2D (513 pages) et spécifications techniques du moteur Deutz F6L-912W atmosphérique (pas de système de post-traitement par catalyseur complexe, mais utilisation d'un silencieux purificateur/laveur pour mines souterraines)
 *    - Niveau de confiance : CERTAIN
 * 
 * 3. Erreur hyd_04 : Moteur hydraulique pour ventilateur refroidissement air
 *    - Statut : SUPPRIMÉ
 *    - Ancienne valeur : ["hyd_04", "3128 2004", "Moteur hydraulique pour ventilateur refroidissement air", 2, 7, "Moteur hydraulique ventilateur", "Parker", "PIECE", 2800, "HAUTE"],
 *    - Nouvelle valeur : N/A (Pièce supprimée de RAW_ITEMS car le ventilateur axial de refroidissement de ce moteur à refroidissement par air est entraîné de manière 100% mécanique par courroies/engrenages depuis le vilebrequin)
 *    - Source de vérification : Spécifications techniques Atlas Copco ST2D / moteur Deutz FL912W
 *    - Niveau de confiance : CERTAIN
 * 
 * 4. Erreur hyd_55 : Ventilateur électrique de refroidissement huile
 *    - Statut : SUPPRIMÉ
 *    - Ancienne valeur : ["hyd_55", "3128 2055", "Ventilateur électrique de refroidissement huile", 2, 7, "Ventilateur refroidissement", "Epiroc", "PIECE", 2200, "HAUTE"],
 *    - Nouvelle valeur : N/A (Pièce supprimée de RAW_ITEMS car le ST2D à refroidissement par air utilise un simple échangeur de chaleur air/huile positionné dans le flux d'air du ventilateur axial principal entraîné mécaniquement)
 *    - Source de vérification : Spécifications techniques Atlas Copco ST2D
 *    - Niveau de confiance : CERTAIN
 * 
 * 5. Erreur ele_14 : Sonde de température de culasse moteur Deutz
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["ele_14", "5580 6014", "Sonde de température de culasse moteur Deutz", 6, 24, "Sonde température moteur", "Deutz", "PIECE", 380, "HAUTE"],
 *    - Nouvelle valeur : ["ele_14", "5580 6014", "Sonde de température de tête de cylindre moteur Deutz", 6, 24, "Sonde température", "Deutz", "PIECE", 380, "HAUTE"],
 *    - Source de vérification : Spécifications techniques Deutz F6L-912W (le moteur étant refroidi par air, les sondes de température mesurent la température directement au niveau de la tête de cylindre ou du carter moteur, et non pas d'une culasse d'eau conventionnelle)
 *    - Niveau de confiance : CERTAIN
 * 
 * 6. Erreur ele_36 : Monostick de direction servo-commandé de canopy
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["ele_36", "5580 6036", "Monostick de direction servo-commandé de canopy", 6, 25, "Monostick de direction", "ST2D", "PIECE", 4200, "HAUTE"],
 *    - Nouvelle valeur : ["ele_36", "5580 6036", "Monostick de direction mécanique de canopy", 6, 25, "Monostick de direction", "ST2D", "PIECE", 4200, "HAUTE"],
 *    - Source de vérification : Spécifications techniques Atlas Copco ST2D (le système d'articulation de direction est piloté par un monostick mécanique simple connecté à l'orbitrol de direction, sans servocommande assistée électroniquement)
 *    - Niveau de confiance : CERTAIN
 * 
 * 7. Erreur mot_34 : Pompe d'injection Bosch en ligne d'origine
 *    - Statut : NON MODIFIÉ (avec justification)
 *    - Ancienne valeur : ["mot_34", "0428 1034", "Pompe d'injection Bosch en ligne d'origine", 1, 1, "Pompe injection", "Bosch", "PIECE", 8500, "CRITIQUE"],
 *    - Nouvelle valeur : ["mot_34", "0428 1034", "Pompe d'injection Bosch en ligne d'origine", 1, 1, "Pompe injection", "Bosch", "PIECE", 8500, "CRITIQUE"],
 *    - Source de vérification : Catalogue des pièces Deutz F6L-912W (ce moteur à injection directe mécanique utilise une pompe d'injection en ligne Bosch de type PE, totalement mécanique et non Common Rail / électronique. La désignation actuelle est donc parfaitement rigoureuse.)
 *    - Niveau de confiance : CERTAIN
 * 
 * CORRECTIONS COMPLÉMENTAIRES (POINTS MINEURS) :
 * 
 * 8. Point mot_53 : Capteur de température d'huile culasse
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["mot_53", "0428 1053", "Capteur de température d'huile culasse", 1, 5, "Capteur température", "Deutz", "PIECE", 420, "HAUTE"]
 *    - Nouvelle valeur : ["mot_53", "0428 1053", "Capteur de température d'huile moteur Deutz", 1, 5, "Capteur température", "Deutz", "PIECE", 420, "HAUTE"]
 *    - Source de vérification : Spécifications techniques Atlas Copco ST2D / moteur Deutz F6L-912W refroidi par air (air cooled). N'ayant pas de circuit d'eau, ce moteur n'a pas de culasse refroidie par eau ; le capteur mesure directement la température d'huile moteur globale.
 *    - Niveau de confiance : CERTAIN
 */

import { CatalogItem } from './types';

const CATEGORIES: Record<number, { name: string; prefix: string }> = {
  1: { name: "Moteur Diesel & Filtration", prefix: "MOTEUR DIESEL" },
  2: { name: "Système Hydraulique & Vérins", prefix: "HYDRAULIQUE" },
  3: { name: "Transmission & Convertisseur", prefix: "TRANSMISSION" },
  4: { name: "Ponts, Essieux & Roues", prefix: "PONTS & ESSIEUX" },
  5: { name: "Freinage & Sécurité", prefix: "FREINAGE & SÉCURITÉ" },
  6: { name: "Électricité & Canopy", prefix: "ÉLECTRICITÉ & CANOPY" },
  7: { name: "Châssis, Structure & Liaison", prefix: "CHÂSSIS & STRUCTURE" },
};

const SUB_CATEGORIES = [
  "Bloc Moteur & Culasse",
  "Injection & Carburation",
  "Suralimentation & Échappement",
  "Refroidissement Air",
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
  // SOU-SYSTÈME 1 : MOTEUR DIESEL & FILTRATION — Deutz F6L-912W, 63kW, air cooled (56 pièces)
  ["mot_01", "0428 1001", "Moteur Deutz F6L-912W complet atmosphérique", 1, 0, "Bloc Moteur", "Deutz F6L-912W", "PIECE", 28000, "CRITIQUE"],
  ["mot_02", "0428 1002", "Culasse Deutz F6L-912W nue", 1, 0, "Culasse", "Deutz F6L-912W", "PIECE", 12500, "CRITIQUE"],
  ["mot_03", "0428 1003", "Joint de culasse Deutz F6L-912W", 1, 0, "Joint de culasse", "Deutz F6L-912W", "PIECE", 1800, "CRITIQUE"],
  ["mot_04", "0428 1004", "Vilebrequin Deutz F6L-912W d'origine", 1, 0, "Vilebrequin", "Deutz F6L-912W", "PIECE", 9500, "CRITIQUE"],
  ["mot_05", "0428 1005", "Coussinet de vilebrequin STD (Jeu complet)", 1, 0, "Coussinets vilebrequin", "STD", "JEU", 2400, "CRITIQUE"],
  ["mot_06", "0428 1006", "Bielle moteur Deutz F6L-912W", 1, 0, "Bielle", "Deutz F6L-912W", "PIECE", 3800, "CRITIQUE"],
  ["mot_07", "0428 1007", "Coussinet de bielle STD (Jeu complet)", 1, 0, "Coussinets bielles", "STD", "JEU", 1600, "CRITIQUE"],
  ["mot_08", "0428 1008", "Piston Deutz F6L-912W STD complet", 1, 0, "Piston", "Deutz F6L-912W", "PIECE", 2800, "CRITIQUE"],
  ["mot_09", "0428 1009", "Segment de piston jeu complet pour 6 cylindres", 1, 0, "Segments piston", "Jeu", "JEU", 890, "CRITIQUE"],
  ["mot_10", "0428 1010", "Axe de piston Deutz d'origine", 1, 0, "Axe de piston", "Deutz", "PIECE", 480, "CRITIQUE"],
  ["mot_11", "0428 1011", "Circlips d'axe de piston (Jeu complet)", 1, 0, "Circlips", "Jeu", "JEU", 120, "CRITIQUE"],
  ["mot_12", "0428 1012", "Arbre à cames Deutz F6L-912W", 1, 0, "Arbre à cames", "Deutz F6L-912W", "PIECE", 5200, "HAUTE"],
  ["mot_13", "0428 1013", "Pignon d'entraînement d'arbre à cames", 1, 0, "Pignon AAC", "Deutz", "PIECE", 1400, "HAUTE"],
  ["mot_14", "0428 1014", "Poussoir mécanique Deutz d'origine", 1, 0, "Poussoir", "Deutz", "PIECE", 380, "MOYENNE"],
  ["mot_15", "0428 1015", "Culbuteur d'admission d'origine", 1, 0, "Culbuteur admission", "Deutz", "PIECE", 650, "MOYENNE"],
  ["mot_16", "0428 1016", "Culbuteur d'échappement d'origine", 1, 0, "Culbuteur échappement", "Deutz", "PIECE", 650, "MOYENNE"],
  ["mot_17", "0428 1017", "Arbre d'équilibrage dynamique", 1, 0, "Arbre d'équilibrage", "Deutz", "PIECE", 2800, "HAUTE"],
  ["mot_18", "0428 1018", "Ressort de soupape admission", 1, 0, "Ressort admission", "Deutz", "PIECE", 180, "MOYENNE"],
  ["mot_19", "0428 1019", "Ressort de soupape échappement", 1, 0, "Ressort échappement", "Deutz", "PIECE", 180, "MOYENNE"],
  ["mot_20", "0428 1020", "Guide de soupape admission/échappement", 1, 0, "Guide soupape", "Deutz", "PIECE", 420, "MOYENNE"],
  ["mot_21", "0428 1021", "Siège de soupape d'origine", 1, 0, "Siège soupape", "Deutz", "PIECE", 340, "MOYENNE"],
  ["mot_22", "0428 1022", "Joint de cache culbuteur caoutchouc", 1, 0, "Joint cache culbuteur", "Deutz", "PIECE", 280, "BASSE"],
  ["mot_23", "0428 1023", "Carter d'huile moteur inférieur", 1, 0, "Carter d'huile", "Deutz", "PIECE", 4200, "HAUTE"],
  ["mot_24", "0428 1024", "Joint de carter d'huile liège/caoutchouc", 1, 0, "Joint carter d'huile", "Deutz", "PIECE", 320, "MOYENNE"],
  ["mot_25", "0428 1025", "Bouchon de vidange moteur avec joint", 1, 0, "Bouchon de vidange", "Deutz", "PIECE", 85, "BASSE"],
  ["mot_26", "0428 1026", "Pompe à huile moteur Deutz d'origine", 1, 0, "Pompe à huile", "Deutz", "PIECE", 2400, "CRITIQUE"],
  ["mot_27", "0428 1027", "Filtre à huile moteur d'origine Deutz", 1, 4, "Filtre à huile", "Deutz", "PIECE", 420, "CRITIQUE"],
  ["mot_28", "0428 1028", "Crépine d'aspiration de carter d'huile", 1, 0, "Crépine d'aspiration", "Deutz", "PIECE", 380, "CRITIQUE"],
  ["mot_29", "0428 1029", "Refroidisseur d'huile moteur par circulation d'air", 1, 3, "Refroidisseur d'huile", "Air-cooled", "PIECE", 3200, "HAUTE"],
  ["mot_30", "0428 1030", "Ventilateur de refroidissement air axial principal", 1, 3, "Ventilateur de refroidissement", "Deutz", "PIECE", 1800, "HAUTE"],
  ["mot_31", "0428 1031", "Souffleur air chaud moteur de protection", 1, 3, "Souffleur air chaud", "Deutz", "PIECE", 1400, "HAUTE"],
  ["mot_32", "0428 1032", "Ailette de refroidissement pour cylindre individuel", 1, 3, "Ailette de refroidissement", "Deutz", "PIECE", 580, "MOYENNE"],
  ["mot_33", "0428 1033", "Injecteur complet Deutz F6L-912W", 1, 1, "Injecteur complet", "Deutz", "PIECE", 3800, "CRITIQUE"],
  ["mot_34", "0428 1034", "Pompe d'injection Bosch en ligne d'origine", 1, 1, "Pompe injection", "Bosch", "PIECE", 8500, "CRITIQUE"],
  ["mot_35", "0428 1035", "Joint d'étanchéité de pompe injection", 1, 1, "Joint pompe injection", "Deutz", "PIECE", 280, "HAUTE"],
  ["mot_36", "0428 1036", "Tuyau d'injection haute pression en acier", 1, 1, "Tuyau d'injection HP", "Deutz", "PIECE", 480, "CRITIQUE"],
  ["mot_37", "0428 1037", "Filtre à gasoil primaire cartouche", 1, 4, "Filtre à gasoil primaire", "Deutz", "PIECE", 520, "CRITIQUE"],
  ["mot_38", "0428 1038", "Filtre à gasoil secondaire cartouche", 1, 4, "Filtre à gasoil secondaire", "Deutz", "PIECE", 380, "CRITIQUE"],
  ["mot_39", "0428 1039", "Séparateur eau-gasoil avec bol transparent", 1, 4, "Séparateur eau-gasoil", "Deutz", "PIECE", 1200, "CRITIQUE"],
  ["mot_40", "0428 1040", "Tuyau d'alimentation gasoil basse pression", 1, 1, "Tuyau alimentation", "Deutz", "PIECE", 340, "HAUTE"],
  ["mot_41", "0428 1041", "Pompe de transfert de carburant manuelle", 1, 1, "Pompe transfert gasoil", "Deutz", "PIECE", 1600, "HAUTE"],
  ["mot_42", "0428 1042", "Silencieux d'échappement robuste ST2D", 1, 2, "Silencieux d'échappement", "Epiroc", "PIECE", 4800, "HAUTE"],
  ["mot_43", "0428 1043", "Silencieux d'échappement avec purificateur", 1, 2, "Silencieux d'échappement", "Avec purificateur", "PIECE", 6200, "HAUTE"],
  ["mot_44", "0428 1044", "Tuyau d'échappement flexible double enveloppe", 1, 2, "Tuyau flexible", "Inox", "PIECE", 1800, "MOYENNE"],
  ["mot_45", "0428 1045", "Bride d'accouplement échappement renforcée", 1, 2, "Bride d'échappement", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["mot_46", "0428 1046", "Joint de collecteur d'échappement métallique", 1, 2, "Joint d'échappement", "Deutz", "PIECE", 180, "BASSE"],
  ["mot_47", "0428 1047", "Démarreur robuste 24V étanche pour Deutz", 1, 5, "Démarreur 24V", "Deutz", "PIECE", 5800, "CRITIQUE"],
  ["mot_48", "0428 1048", "Alternateur industriel 24V 55A", 1, 5, "Alternateur 24V", "Bosch", "PIECE", 4200, "CRITIQUE"],
  ["mot_49", "0428 1049", "Batterie haute puissance 12V 180Ah", 1, 5, "Batterie 12V", "Heavy Duty", "PIECE", 2800, "CRITIQUE"],
  ["mot_50", "0428 1050", "Support de montage moteur avant", 1, 6, "Support moteur AV", "Deutz", "PIECE", 1200, "HAUTE"],
  ["mot_51", "0428 1051", "Support de montage moteur arrière", 1, 6, "Support moteur AR", "Deutz", "PIECE", 1200, "HAUTE"],
  ["mot_52", "0428 1052", "Silentbloc amortisseur moteur en élastomère", 1, 6, "Silentbloc moteur", "Epiroc", "PIECE", 580, "MOYENNE"],
  ["mot_53", "0428 1053", "Capteur de température d'huile moteur Deutz", 1, 5, "Capteur température", "Deutz", "PIECE", 420, "HAUTE"],
  ["mot_54", "0428 1054", "Capteur de pression d'huile bloc moteur", 1, 5, "Capteur pression", "Deutz", "PIECE", 380, "CRITIQUE"],
  ["mot_55", "0428 1055", "Capteur inductif de régime moteur", 1, 5, "Capteur régime", "Deutz", "PIECE", 520, "CRITIQUE"],
  ["mot_56", "0428 1056", "Jauge de niveau d'huile manuelle d'origine", 1, 5, "Jauge de niveau d'huile", "Deutz", "PIECE", 180, "BASSE"],

  // SOU-SYSTÈME 2 : SYSTÈME HYDRAULIQUE & VÉRINS — Gear pumps, 11.4 MPa / 13.1 MPa (61 pièces)
  ["hyd_01", "3128 2001", "Pompe hydraulique à engrenages dump/hoist principale", 2, 7, "Pompe hydraulique principale", "Commercial", "PIECE", 6800, "CRITIQUE"],
  ["hyd_02", "3128 2002", "Pompe hydraulique de direction d'origine", 2, 7, "Pompe direction", "Commercial", "PIECE", 4200, "CRITIQUE"],
  ["hyd_03", "3128 2003", "Pompe hydraulique de charge et auxiliaire", 2, 7, "Pompe auxiliaire", "Commercial", "PIECE", 3800, "HAUTE"],
  ["hyd_05", "3128 2005", "Distributeur hydraulique principal monobloc", 2, 9, "Distributeur principal", "Rexroth", "PIECE", 12000, "CRITIQUE"],
  ["hyd_06", "3128 2006", "Distributeur de direction orbitrol", 2, 9, "Distributeur direction", "Danfoss", "PIECE", 8500, "CRITIQUE"],
  ["hyd_07", "3128 2007", "Distributeur de commande de bennage", 2, 9, "Distributeur bennage", "Epiroc", "PIECE", 7200, "CRITIQUE"],
  ["hyd_08", "3128 2008", "Distributeur de commande de cavage/hoist", 2, 9, "Distributeur cavage", "Epiroc", "PIECE", 7200, "CRITIQUE"],
  ["hyd_09", "3128 2009", "Électrovanne de commande de direction 24V", 2, 9, "Électrovanne direction", "Epiroc", "PIECE", 2400, "HAUTE"],
  ["hyd_10", "3128 2010", "Électrovanne de commande de bennage 24V", 2, 9, "Électrovanne bennage", "Epiroc", "PIECE", 2400, "HAUTE"],
  ["hyd_11", "3128 2011", "Électrovanne de commande de cavage 24V", 2, 9, "Électrovanne cavage", "Epiroc", "PIECE", 2400, "HAUTE"],
  ["hyd_12", "3128 2012", "Électrovanne de commande de freinage SAHR", 2, 9, "Électrovanne freinage", "Epiroc", "PIECE", 3200, "CRITIQUE"],
  ["hyd_13", "3128 2013", "Électrovanne auxiliaire de levage", 2, 9, "Électrovanne levage", "Epiroc", "PIECE", 2200, "HAUTE"],
  ["hyd_14", "3128 2014", "Vérin de direction double effet Ø125mm ST2D", 2, 8, "Vérin de direction", "ST2D", "PIECE", 8500, "CRITIQUE"],
  ["hyd_15", "3128 2015", "Vérin de bennage double effet Ø180mm ST2D", 2, 8, "Vérin de bennage", "ST2D", "PIECE", 9200, "CRITIQUE"],
  ["hyd_16", "3128 2016", "Vérin de cavage/hoist double effet Ø180mm ST2D", 2, 8, "Vérin de cavage", "ST2D", "PIECE", 9200, "CRITIQUE"],
  ["hyd_17", "3128 2017", "Joint de tige hydraulique renforcé pour vérin Ø125mm", 2, 8, "Joint de tige Ø125", "Polyuréthane", "PIECE", 580, "HAUTE"],
  ["hyd_18", "3128 2018", "Joint de tige hydraulique renforcé pour vérin Ø180mm", 2, 8, "Joint de tige Ø180", "Polyuréthane", "PIECE", 720, "HAUTE"],
  ["hyd_19", "3128 2019", "Joint de piston haute étanchéité pour vérin Ø125mm", 2, 8, "Joint piston Ø125", "Polyuréthane", "PIECE", 480, "HAUTE"],
  ["hyd_20", "3128 2020", "Joint de piston haute étanchéité pour vérin Ø180mm", 2, 8, "Joint piston Ø180", "Polyuréthane", "PIECE", 620, "HAUTE"],
  ["hyd_21", "3128 2021", "Flexible hydraulique tressé HP 1/2\" JIC droit/coudé", 2, 10, "Flexible 1/2\" JIC", "Epiroc", "PIECE", 280, "MOYENNE"],
  ["hyd_22", "3128 2022", "Flexible hydraulique tressé HP 3/4\" JIC droit/coudé", 2, 10, "Flexible 3/4\" JIC", "Epiroc", "PIECE", 340, "MOYENNE"],
  ["hyd_23", "3128 2023", "Flexible hydraulique tressé HP 1\" JIC droit/coudé", 2, 10, "Flexible 1\" JIC", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["hyd_24", "3128 2024", "Flexible hydraulique tressé HP 1 1/4\" JIC droit/coudé", 2, 10, "Flexible 1 1/4\" JIC", "Epiroc", "PIECE", 580, "MOYENNE"],
  ["hyd_25", "3128 2025", "Flexible hydraulique tressé HP 1 1/2\" JIC droit/coudé", 2, 10, "Flexible 1 1/2\" JIC", "Epiroc", "PIECE", 720, "MOYENNE"],
  ["hyd_26", "3128 2026", "Raccord union droit acier JIC mâle 1/2\" - 1/2\"", 2, 10, "Raccord JIC 1/2\"", "Epiroc", "PIECE", 85, "BASSE"],
  ["hyd_27", "3128 2027", "Raccord union droit acier JIC mâle 3/4\" - 3/4\"", 2, 10, "Raccord JIC 3/4\"", "Epiroc", "PIECE", 95, "BASSE"],
  ["hyd_28", "3128 2028", "Raccord droit étanchéité plane ORFS mâle 3/4\"", 2, 10, "Raccord ORFS 3/4\"", "Epiroc", "PIECE", 120, "BASSE"],
  ["hyd_29", "3128 2029", "Raccord d'implantation acier BSP mâle 1/2\"", 2, 10, "Raccord BSP 1/2\"", "Epiroc", "PIECE", 75, "BASSE"],
  ["hyd_30", "3128 2030", "Coude hydraulique acier JIC 90° mâle-femelle 3/4\"", 2, 10, "Coude JIC 90°", "Epiroc", "PIECE", 140, "BASSE"],
  ["hyd_31", "3128 2031", "Raccord té d'égalisation acier JIC mâle 3/4\"", 2, 10, "Té JIC 3/4\"", "Epiroc", "PIECE", 180, "BASSE"],
  ["hyd_32", "3128 2032", "Bouchon acier d'obturateur JIC femelle 1/2\"", 2, 10, "Bouchon JIC 1/2\"", "Epiroc", "PIECE", 45, "BASSE"],
  ["hyd_33", "3128 2033", "Joint torique étanchéité standard NBR 90 Shore", 2, 10, "Joint torique NBR", "Epiroc", "PIECE", 25, "BASSE"],
  ["hyd_34", "3128 2034", "Joint torique haute température Viton FKM", 2, 10, "Joint torique Viton", "Epiroc", "PIECE", 35, "BASSE"],
  ["hyd_35", "3128 2035", "Joint torique d'étanchéité EPDM renforcé", 2, 10, "Joint torique EPDM", "Epiroc", "PIECE", 30, "BASSE"],
  ["hyd_36", "3128 2036", "Bague anti-extrusion Joint PTFE backup ring", 2, 10, "Bague PTFE backup", "Epiroc", "PIECE", 40, "BASSE"],
  ["hyd_37", "3128 2037", "Kit de joints complet de rechange distributeur principal", 2, 9, "Kit joints distributeur", "Epiroc", "JEU", 1800, "HAUTE"],
  ["hyd_38", "3128 2038", "Kit de joints de réfection complet vérin direction", 2, 8, "Kit joints vérin direction", "Epiroc", "JEU", 1200, "HAUTE"],
  ["hyd_39", "3128 2039", "Kit de joints de réfection complet vérin bennage", 2, 8, "Kit joints vérin bennage", "Epiroc", "JEU", 1400, "HAUTE"],
  ["hyd_40", "3128 2040", "Filtre hydraulique d'aspiration métallique 25 microns", 2, 11, "Filtre aspiration", "Epiroc", "PIECE", 520, "CRITIQUE"],
  ["hyd_41", "3128 2041", "Filtre hydraulique de retour cartouche", 2, 11, "Filtre hydraulique retour", "Epiroc", "PIECE", 480, "CRITIQUE"],
  ["hyd_42", "3128 2042", "Filtre hydraulique haute pression de ligne", 2, 11, "Filtre hydraulique pression", "Epiroc", "PIECE", 620, "CRITIQUE"],
  ["hyd_43", "3128 2043", "Indicateur visuel/électrique de colmatage de filtre", 2, 11, "Indicateur colmatage", "Epiroc", "PIECE", 380, "MOYENNE"],
  ["hyd_44", "3128 2044", "Réducteur planétaire complet roue avant ST2D", 2, 7, "Réducteur planétaire AV", "Epiroc", "PIECE", 8500, "CRITIQUE"],
  ["hyd_45", "3128 2045", "Réducteur planétaire complet roue arrière ST2D", 2, 7, "Réducteur planétaire AR", "Epiroc", "PIECE", 8200, "CRITIQUE"],
  ["hyd_46", "3128 2046", "Couronne dentée interne de réducteur de roue", 2, 7, "Couronne de réducteur", "Epiroc", "PIECE", 4200, "HAUTE"],
  ["hyd_47", "3128 2047", "Pignon solaire d'entrée de réducteur planétaire", 2, 7, "Pignon solaire", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["hyd_48", "3128 2048", "Pignon planétaire de couronne de réducteur", 2, 7, "Pignon planétaire", "Epiroc", "PIECE", 1800, "HAUTE"],
  ["hyd_49", "3128 2049", "Roulement de tambour de réducteur de roue", 2, 7, "Roulement de réducteur", "Epiroc", "PIECE", 2400, "HAUTE"],
  ["hyd_50", "3128 2050", "Accumulateur hydraulique de freinage à membrane", 2, 13, "Accumulateur frein", "Epiroc", "PIECE", 3200, "CRITIQUE"],
  ["hyd_51", "3128 2051", "Soupape de sécurité de bloc d'accumulateur", 2, 13, "Soupape d'accumulateur", "Epiroc", "PIECE", 1400, "HAUTE"],
  ["hyd_52", "3128 2052", "Réservoir hydraulique métallique renforcé 144L ST2D", 2, 13, "Réservoir hydraulique", "Epiroc", "PIECE", 6800, "CRITIQUE"],
  ["hyd_53", "3128 2053", "Jauge de niveau d'huile visuelle verticale de réservoir", 2, 12, "Jauge niveau hydraulique", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["hyd_54", "3128 2054", "Échangeur de chaleur aéro-réfrigérant d'huile hydraulique", 2, 12, "Échangeur hydraulique", "Epiroc", "PIECE", 4500, "HAUTE"],
  ["hyd_56", "3128 2056", "Manomètre de pression hydraulique glycérine 0-25 MPa", 2, 12, "Manomètre hydraulique", "Epiroc", "PIECE", 380, "MOYENNE"],
  ["hyd_57", "3128 2057", "Manomètre indicateur de pression de filtre de retour", 2, 12, "Jauge de pression filtre", "Epiroc", "PIECE", 280, "BASSE"],
  ["hyd_58", "3128 2058", "Capteur de pression analogique de circuit principal", 2, 12, "Capteur pression hyd.", "Epiroc", "PIECE", 520, "HAUTE"],
  ["hyd_59", "3128 2059", "Capteur de débit électronique de ligne de retour", 2, 12, "Capteur de débit hyd.", "Epiroc", "PIECE", 680, "MOYENNE"],
  ["hyd_60", "3128 2060", "Capteur de température d'huile hydraulique", 2, 12, "Sonde température hyd.", "Epiroc", "PIECE", 480, "MOYENNE"],
  ["hyd_61", "3128 2061", "Valve de sécurité d'isolation de circuit de levage", 2, 9, "Valve de sécurité", "Epiroc", "PIECE", 1200, "CRITIQUE"],
  ["hyd_62", "3128 2062", "Limiteur de pression hydraulique principal réglable", 2, 9, "Limiteur de pression", "Epiroc", "PIECE", 1800, "CRITIQUE"],
  ["hyd_63", "3128 2063", "Valve de dérivation by-pass manuelle de secours", 2, 9, "Valve by-pass", "Epiroc", "PIECE", 1400, "HAUTE"],

  // SOU-SYSTÈME 3 : TRANSMISSION & CONVERTISSEUR — Dana R32000 + C-270 (30 pièces)
  ["tra_01", "3115 3001", "Convertisseur de couple d'origine Dana C-270", 3, 14, "Convertisseur", "Dana C-270", "PIECE", 14000, "CRITIQUE"],
  ["tra_02", "3115 3002", "Turbine d'impulsion de convertisseur C-270", 3, 14, "Turbine convertisseur", "Dana C-270", "PIECE", 6800, "CRITIQUE"],
  ["tra_03", "3115 3003", "Stator de couple de convertisseur C-270", 3, 14, "Stator convertisseur", "Dana C-270", "PIECE", 5200, "CRITIQUE"],
  ["tra_04", "3115 3004", "Réacteur de stator de convertisseur C-270", 3, 14, "Réacteur convertisseur", "Dana C-270", "PIECE", 4800, "CRITIQUE"],
  ["tra_05", "3115 3005", "Huile de convertisseur et boîte de vitesses (bidon 20L)", 3, 14, "Huile convertisseur", "ATF", "LITRE", 480, "HAUTE"],
  ["tra_06", "3115 3006", "Disque de friction d'embrayage de boîte R32000", 3, 15, "Disque d'embrayage", "Dana R32000", "PIECE", 2800, "HAUTE"],
  ["tra_07", "3115 3007", "Plateau de pression d'embrayage de transmission", 3, 15, "Plateau d'embrayage", "Dana", "PIECE", 3200, "HAUTE"],
  ["tra_08", "3115 3008", "Butée mécanique de débrayage de transmission", 3, 15, "Butée d'embrayage", "Dana", "PIECE", 1800, "HAUTE"],
  ["tra_09", "3115 3009", "Mécanisme complet d'embrayage de boîte R32000", 3, 15, "Mécanisme d'embrayage", "Dana", "PIECE", 4500, "HAUTE"],
  ["tra_10", "3115 3010", "Synchroniseur de rapport de 1ère/2ème vitesse", 3, 15, "Synchroniseur 1ère/2ème", "Dana", "PIECE", 2400, "HAUTE"],
  ["tra_11", "3115 3011", "Synchroniseur de rapport de 3ème/4ème vitesse", 3, 15, "Synchroniseur 3ème/4ème", "Dana", "PIECE", 2400, "HAUTE"],
  ["tra_12", "3115 3012", "Pignon de transmission d'arbre principal", 3, 15, "Pignon arbre principal", "Dana", "PIECE", 3800, "HAUTE"],
  ["tra_13", "3115 3013", "Pignon de transmission d'arbre intermédiaire", 3, 15, "Pignon intermédiaire", "Dana", "PIECE", 3200, "HAUTE"],
  ["tra_14", "3115 3014", "Arbre principal de boîte de vitesses Dana R32000", 3, 15, "Arbre principal", "Dana R32000", "PIECE", 5500, "CRITIQUE"],
  ["tra_15", "3115 3015", "Arbre de renvoi intermédiaire de transmission R32000", 3, 15, "Arbre intermédiaire", "Dana R32000", "PIECE", 4800, "HAUTE"],
  ["tra_16", "3115 3016", "Roulement de guidage d'arbre principal avant", 3, 15, "Roulement arbre AV", "Dana R32000", "PIECE", 1400, "HAUTE"],
  ["tra_17", "3115 3017", "Roulement de guidage d'arbre principal arrière", 3, 15, "Roulement arbre AR", "Dana R32000", "PIECE", 1400, "HAUTE"],
  ["tra_18", "3115 3018", "Roulement conique d'arbre intermédiaire de boîte", 3, 15, "Roulement intermédiaire", "Dana R32000", "PIECE", 1200, "HAUTE"],
  ["tra_19", "3115 3019", "Carter métallique principal de boîte de vitesses R32000", 3, 15, "Carter de transmission", "Dana R32000", "PIECE", 8500, "CRITIQUE"],
  ["tra_20", "3115 3020", "Joint de carter d'accouplement de transmission R32000", 3, 15, "Joint de carter", "Epiroc", "PIECE", 680, "MOYENNE"],
  ["tra_21", "3115 3021", "Bouchon métallique de remplissage d'huile boîte", 3, 15, "Bouchon de remplissage", "Epiroc", "PIECE", 180, "BASSE"],
  ["tra_22", "3115 3022", "Jauge de niveau d'huile de boîte R32000", 3, 15, "Jauge de niveau", "Epiroc", "PIECE", 220, "BASSE"],
  ["tra_23", "3115 3023", "Capteur inductif de vitesse de transmission", 3, 15, "Capteur de vitesse", "Epiroc", "PIECE", 520, "HAUTE"],
  ["tra_24", "3115 3024", "Capteur de position de rapport de vitesse (Neutre/Marche)", 3, 15, "Capteur de position", "Epiroc", "PIECE", 480, "MOYENNE"],
  ["tra_25", "3115 3025", "Capteur de température de boîte de vitesses", 3, 15, "Capteur température", "Epiroc", "PIECE", 420, "HAUTE"],
  ["tra_26", "3115 3026", "Arbre de transmission à cardan central avant complet", 3, 15, "Arbre cardan avant", "Epiroc", "PIECE", 3200, "CRITIQUE"],
  ["tra_27", "3115 3027", "Arbre de transmission à cardan central arrière complet", 3, 15, "Arbre cardan arrière", "Epiroc", "PIECE", 3200, "CRITIQUE"],
  ["tra_28", "3115 3028", "Joint de cardan universel (Croisillon central)", 3, 15, "Joint de cardan", "Epiroc", "PIECE", 1800, "HAUTE"],
  ["tra_29", "3115 3029", "Roulement d'appui d'arbre de cardan de transmission", 3, 15, "Roulement de cardan", "Epiroc", "PIECE", 980, "MOYENNE"],
  ["tra_30", "3115 3030", "Cale d'épaisseur de réglage de jeu différentiel", 3, 15, "Cale de réglage", "Epiroc", "PIECE", 340, "BASSE"],

  // SOU-SYSTÈME 4 : PONTS, ESSIEUX & ROUES — Dana 14D, 12.00x24 L-5S bias TT (35 pièces)
  ["pon_01", "3115 4001", "Carter d'essieu avant d'origine Dana 14D ST2D", 4, 16, "Carter d'essieu avant", "Dana 14D", "PIECE", 9500, "CRITIQUE"],
  ["pon_02", "3115 4002", "Carter d'essieu arrière d'origine Dana 14D ST2D", 4, 16, "Carter d'essieu arrière", "Dana 14D", "PIECE", 9200, "CRITIQUE"],
  ["pon_03", "3115 4003", "Différentiel avant autobloquant No-Spin Dana 14D", 4, 16, "Différentiel No Spin", "Dana 14D", "PIECE", 8500, "CRITIQUE"],
  ["pon_04", "3115 4004", "Différentiel arrière standard de pont Dana 14D", 4, 16, "Différentiel standard", "Dana 14D", "PIECE", 7200, "CRITIQUE"],
  ["pon_05", "3115 4005", "Demi-arbre de transmission de roue avant gauche", 4, 16, "Demi-arbre gauche AV", "Dana 14D", "PIECE", 3800, "HAUTE"],
  ["pon_06", "3115 4006", "Demi-arbre de transmission de roue avant droit", 4, 16, "Demi-arbre droit AV", "Dana 14D", "PIECE", 3800, "HAUTE"],
  ["pon_07", "3115 4007", "Demi-arbre de transmission de roue arrière gauche", 4, 16, "Demi-arbre gauche AR", "Dana 14D", "PIECE", 3600, "HAUTE"],
  ["pon_08", "3115 4008", "Demi-arbre de transmission de roue arrière droit", 4, 16, "Demi-arbre droit AR", "Dana 14D", "PIECE", 3600, "HAUTE"],
  ["pon_09", "3115 4009", "Roulement conique de roue avant de pont Dana 14D", 4, 16, "Roulement de roue AV", "Dana 14D", "PIECE", 2800, "HAUTE"],
  ["pon_10", "3115 4010", "Roulement conique de roue arrière de pont Dana 14D", 4, 16, "Roulement de roue AR", "Dana 14D", "PIECE", 2800, "HAUTE"],
  ["pon_11", "3115 4011", "Roulement conique de réducteur planétaire d'essieu", 4, 16, "Roulement de réducteur", "Dana 14D", "PIECE", 2200, "HAUTE"],
  ["pon_12", "3115 4012", "Joint SPI double lèvre d'étanchéité roue avant", 4, 16, "Joint SPI roue AV", "Epiroc", "PIECE", 580, "HAUTE"],
  ["pon_13", "3115 4013", "Joint SPI double lèvre d'étanchéité roue arrière", 4, 16, "Joint SPI roue AR", "Epiroc", "PIECE", 580, "HAUTE"],
  ["pon_14", "3115 4014", "Joint SPI double lèvre pour demi-arbre avant", 4, 16, "Joint SPI demi-arbre AV", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["pon_15", "3115 4015", "Joint SPI double lèvre pour demi-arbre arrière", 4, 16, "Joint SPI demi-arbre AR", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["pon_16", "3115 4016", "Silentbloc d'essieu avant rigide", 4, 16, "Silentbloc essieu AV", "Epiroc", "PIECE", 1200, "MOYENNE"],
  ["pon_17", "3115 4017", "Silentbloc d'essieu arrière oscillant d'origine", 4, 16, "Silentbloc essieu AR", "Epiroc", "PIECE", 1200, "MOYENNE"],
  ["pon_18", "3115 4018", "Support rigide d'essieu avant en fonte d'acier", 4, 16, "Support essieu AV", "Epiroc", "PIECE", 2400, "HAUTE"],
  ["pon_19", "3115 4019", "Support d'oscillation d'essieu arrière d'origine", 4, 16, "Support essieu AR", "Epiroc", "PIECE", 2400, "HAUTE"],
  ["pon_20", "3115 4021", "Servo-valve orbitrol de servocommande de direction", 4, 16, "Orbitrol de direction", "Danfoss", "PIECE", 6200, "CRITIQUE"],
  ["pon_21", "3115 4022", "Colonne de direction articulée monostick ST2D", 4, 16, "Colonne de direction", "ST2D", "PIECE", 4800, "HAUTE"],
  ["pon_22", "3115 4023", "Flexible de direction haute pression tressé métallique", 4, 16, "Flexible direction HP", "Epiroc", "PIECE", 680, "MOYENNE"],
  ["pon_23", "3115 4024", "Flexible de direction de retour basse pression", 4, 16, "Flexible direction retour", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["pon_24", "3115 4025", "Jante de roue métallique lourde 3-pièces 12.00x24", 4, 17, "Jante de roue", "ST2D", "PIECE", 5800, "HAUTE"],
  ["pon_25", "3115 4026", "Pneu 12.00x24 L-5S 16 ply TT bias mine d'origine", 4, 17, "Pneu 12.00x24 L-5S", "Epiroc", "PIECE", 8500, "CRITIQUE"],
  ["pon_26", "3115 4027", "Valve de pneu coudée renforcée 12.00x24 avec bouchon", 4, 17, "Valve de pneu", "Epiroc", "PIECE", 180, "BASSE"],
  ["pon_27", "3115 4028", "Écrou de roue renforcé M24 x 2.0 d'origine", 4, 17, "Écrou de roue M24", "Epiroc", "PIECE", 85, "HAUTE"],
  ["pon_28", "3115 4029", "Boulon goujon de fixation de roue M24 x 2.0 x 120", 4, 17, "Boulon de roue M24", "Epiroc", "PIECE", 120, "HAUTE"],
  ["pon_29", "3115 4030", "Rondelle sphérique trempée de roue M24 d'origine", 4, 17, "Rondelle de roue M24", "Epiroc", "PIECE", 45, "HAUTE"],
  ["pon_30", "3115 4031", "Disque de frein de service wet humide de pont", 4, 16, "Disque de frein de service", "Epiroc", "PIECE", 2400, "CRITIQUE"],
  ["pon_31", "3115 4032", "Plaquette de frein de rechange wet humide d'origine", 4, 16, "Plaquette de frein wet", "Epiroc", "PIECE", 1800, "CRITIQUE"],
  ["pon_32", "3115 4033", "Étrier hydraulique de frein wet sous carter", 4, 16, "Étrier de frein wet", "Epiroc", "PIECE", 4200, "CRITIQUE"],
  ["pon_33", "3115 4034", "Capteur de limite d'usure des garnitures de freins", 4, 16, "Capteur d'usure de freins", "Epiroc", "PIECE", 380, "MOYENNE"],
  ["pon_34", "3115 4035", "Barre de stabilisation d'oscillation d'articulation", 4, 16, "Barre de stabilisation", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["pon_35", "3115 4036", "Chambre à air renforcée (Tube) 12.00x24 pour pneu TT", 4, 17, "Chambre à air 12.00x24", "Tube Type", "PIECE", 890, "HAUTE"],

  // SOU-SYSTÈME 5 : FREINAGE & SÉCURITÉ — SAHR wet discs, 24V (25 pièces)
  ["fre_01", "3115 5001", "Disque de frein de service wet humide avant d'origine", 5, 18, "Disque frein de service AV", "Epiroc", "PIECE", 2400, "CRITIQUE"],
  ["fre_02", "3115 5002", "Disque de frein de service wet humide arrière d'origine", 5, 18, "Disque frein de service AR", "Epiroc", "PIECE", 2400, "CRITIQUE"],
  ["fre_03", "3115 5003", "Plaquette de rechange de frein de service (Jeu de 4)", 5, 18, "Plaquette de frein de service", "Epiroc", "JEU", 1800, "CRITIQUE"],
  ["fre_04", "3115 5004", "Ressort de rappel de piston de frein de service", 5, 18, "Ressort de frein de service", "Epiroc", "PIECE", 680, "HAUTE"],
  ["fre_05", "3115 5005", "Cylindre hydraulique de frein de parking SAHR", 5, 18, "Cylindre frein parking SAHR", "Epiroc", "PIECE", 4200, "CRITIQUE"],
  ["fre_06", "3115 5006", "Ressort de compression interne de sécurité frein SAHR", 5, 18, "Ressort frein parking SAHR", "Epiroc", "PIECE", 1800, "CRITIQUE"],
  ["fre_07", "3115 5007", "Disque d'embrayage interne de frein de parking SAHR", 5, 18, "Disque frein parking SAHR", "Epiroc", "PIECE", 2200, "CRITIQUE"],
  ["fre_08", "3115 5008", "Câble métallique de commande manuelle de frein parking", 5, 18, "Câble de frein parking", "Epiroc", "PIECE", 1200, "HAUTE"],
  ["fre_09", "3115 5009", "Levier mécanique de déverrouillage de frein de secours", 5, 18, "Levier de frein parking", "Epiroc", "PIECE", 980, "HAUTE"],
  ["fre_10", "3115 5010", "Valve d'application proportionnelle de freinage SAHR", 5, 19, "Valve de freinage SAHR", "Epiroc", "PIECE", 3200, "CRITIQUE"],
  ["fre_11", "3115 5011", "Accumulateur à membrane d'assistance au freinage", 5, 19, "Accumulateur de freinage", "Epiroc", "PIECE", 2800, "CRITIQUE"],
  ["fre_12", "3115 5012", "Maître-cylindre de commande hydraulique des freins", 5, 19, "Maître-cylindre de frein", "Epiroc", "PIECE", 2400, "CRITIQUE"],
  ["fre_13", "3115 5013", "Sonde d'usure des garnitures de plaquettes de freins", 5, 18, "Capteur d'usure plaquette", "Epiroc", "PIECE", 380, "MOYENNE"],
  ["fre_14", "3115 5014", "Capteur de position ouvert/fermé du frein de parking", 5, 19, "Capteur position frein parking", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["fre_15", "5580 5001", "Alarme avertisseur de recul industrielle 24V", 5, 20, "Avertisseur de recul 24V", "Epiroc", "PIECE", 1200, "HAUTE"],
  ["fre_16", "5580 5002", "Projecteur de travail avant LED longue portée 24V", 5, 21, "Feu de travail avant LED", "Epiroc", "PIECE", 3200, "HAUTE"],
  ["fre_17", "5580 5003", "Projecteur de travail arrière LED longue portée 24V", 5, 21, "Feu de travail arrière LED", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["fre_18", "5580 5004", "Feu de position et de gabarit avant d'origine 24V", 5, 21, "Feu de position avant", "Epiroc", "PIECE", 380, "MOYENNE"],
  ["fre_19", "5580 5005", "Feu de position et de gabarit arrière d'origine 24V", 5, 21, "Feu de position arrière", "Epiroc", "PIECE", 380, "MOYENNE"],
  ["fre_20", "5580 5006", "Clignotant avant étanche à ampoule 24V d'origine", 5, 21, "Clignotant avant 24V", "Epiroc", "PIECE", 280, "MOYENNE"],
  ["fre_21", "5580 5007", "Clignotant arrière étanche à ampoule 24V d'origine", 5, 21, "Clignotant arrière 24V", "Epiroc", "PIECE", 280, "MOYENNE"],
  ["fre_22", "5580 5008", "Éclairage de zone de travail latéral sous canopy", 5, 21, "Éclairage de zone latéral", "Epiroc", "PIECE", 2400, "MOYENNE"],
  ["fre_23", "5580 5009", "Extincteur automatique à poudre chimique 6kg Ansul", 5, 20, "Extincteur 6kg", "Ansul", "PIECE", 1800, "HAUTE"],
  ["fre_24", "5580 5010", "Support de fixation en acier résistant pour extincteur", 5, 20, "Support extincteur", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["fre_25", "5580 5011", "Voyant témoin lumineux d'activation du frein parking", 5, 21, "Témoin frein de parking", "Epiroc", "PIECE", 180, "MOYENNE"],

  // SOU-SYSTÈME 6 : ÉLECTRICITÉ & CANOPY — 24V, MSHA canopy, side seated, NO cabine fermée (40 pièces)
  ["ele_01", "5580 6001", "Batterie étanche heavy duty plomb-acide 12V 180Ah", 6, 22, "Batterie 12V 180Ah", "Epiroc", "PIECE", 2800, "CRITIQUE"],
  ["ele_02", "5580 6002", "Support métallique robuste et bride pour double batterie", 6, 22, "Porte-batterie et support", "Epiroc", "PIECE", 1200, "HAUTE"],
  ["ele_03", "5580 6003", "Fusible enfichable de protection de faisceau 10A", 6, 23, "Fusible 10A", "Epiroc", "PIECE", 25, "BASSE"],
  ["ele_04", "5580 6004", "Fusible enfichable de protection de faisceau 15A", 6, 23, "Fusible 15A", "Epiroc", "PIECE", 25, "BASSE"],
  ["ele_05", "5580 6005", "Fusible enfichable de protection de faisceau 20A", 6, 23, "Fusible 20A", "Epiroc", "PIECE", 25, "BASSE"],
  ["ele_06", "5580 6006", "Fusible enfichable de protection de faisceau 30A", 6, 23, "Fusible 30A", "Epiroc", "PIECE", 35, "BASSE"],
  ["ele_07", "5580 6007", "Relais étanche de commande électrique 12V/24V 40A", 6, 23, "Relais 12V/24V 40A", "Epiroc", "PIECE", 180, "MOYENNE"],
  ["ele_08", "5580 6008", "Relais électrique de forte puissance 24V 70A", 6, 23, "Relais 24V 70A", "Epiroc", "PIECE", 280, "MOYENNE"],
  ["ele_09", "5580 6009", "Interrupteur Neiman d'allumage étanche à clé", 6, 24, "Interrupteur d'allumage", "Epiroc", "PIECE", 520, "HAUTE"],
  ["ele_10", "5580 6010", "Interrupteur de commande des feux de travail LED", 6, 24, "Interrupteur feux de travail", "Epiroc", "PIECE", 380, "MOYENNE"],
  ["ele_11", "5580 6011", "Bouton interrupteur étanche de démarrage moteur", 6, 24, "Interrupteur démarrage", "Epiroc", "PIECE", 420, "HAUTE"],
  ["ele_12", "5580 6012", "Bouton poussoir d'arrêt d'urgence coup de poing", 6, 24, "Bouton d'arrêt d'urgence", "Epiroc", "PIECE", 340, "CRITIQUE"],
  ["ele_13", "5580 6013", "Capteur de pression d'huile hydraulique électrique", 6, 24, "Capteur pression hyd. elec.", "Epiroc", "PIECE", 520, "HAUTE"],
  ["ele_14", "5580 6014", "Sonde de température de tête de cylindre moteur Deutz", 6, 24, "Sonde température", "Deutz", "PIECE", 380, "HAUTE"],
  ["ele_15", "5580 6015", "Sonde de niveau de carburant capacitive de réservoir", 6, 24, "Sonde niveau carburant", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["ele_16", "5580 6016", "Capteur magnétique de vitesse de translation de boîte", 6, 24, "Capteur vitesse translation", "Epiroc", "PIECE", 480, "MOYENNE"],
  ["ele_17", "5580 6017", "Capteur de position de fin de course de godet", 6, 24, "Capteur position godet", "Epiroc", "PIECE", 520, "MOYENNE"],
  ["ele_18", "5580 6018", "Phare de travail LED principal avant 24V robuste", 6, 21, "Phare LED principal AV", "Epiroc", "PIECE", 3200, "HAUTE"],
  ["ele_19", "5580 6019", "Phare de travail LED principal arrière 24V robuste", 6, 21, "Phare LED principal AR", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["ele_20", "5580 6020", "Feu de signalisation orange de position latérale LED", 6, 21, "Feu de position latéral", "Epiroc", "PIECE", 280, "MOYENNE"],
  ["ele_21", "5580 6021", "Avertisseur sonore klaxon étanche 24V IP67", 6, 21, "Avertisseur sonore 24V", "Epiroc", "PIECE", 1200, "HAUTE"],
  ["ele_22", "5580 6022", "Siège conducteur réglable à configuration latérale", 6, 26, "Siège conducteur latéral", "ST2D", "PIECE", 8500, "HAUTE"],
  ["ele_23", "5580 6023", "Ceinture de sécurité réglable 3 points d'origine", 6, 26, "Ceinture de sécurité 3 pts", "Epiroc", "PIECE", 890, "HAUTE"],
  ["ele_24", "5580 6024", "Ceinture de sécurité de sécurité renforcée 4 points", 6, 26, "Ceinture de sécurité 4 pts", "Epiroc", "PIECE", 1100, "HAUTE"],
  ["ele_25", "5580 6025", "Toit de protection supérieur de canopy ROPS/FOPS", 6, 26, "Toit canopy ROPS/FOPS", "ST2D", "PIECE", 12000, "CRITIQUE"],
  ["ele_26", "5580 6026", "Montant d'arceau de structure de canopy gauche", 6, 26, "Barre canopy gauche", "ST2D", "PIECE", 4200, "CRITIQUE"],
  ["ele_27", "5580 6027", "Montant d'arceau de structure de canopy droit", 6, 26, "Barre canopy droite", "ST2D", "PIECE", 4200, "CRITIQUE"],
  ["ele_28", "5580 6028", "Grille de sécurité métallique de canopy avant", 6, 26, "Grille canopy avant", "ST2D", "PIECE", 2800, "HAUTE"],
  ["ele_29", "5580 6029", "Grille de sécurité métallique de canopy arrière", 6, 26, "Grille canopy arrière", "ST2D", "PIECE", 2600, "HAUTE"],
  ["ele_30", "5580 6030", "Tableau de bord métallique d'instruments de bord nu", 6, 25, "Tableau de bord instruments", "ST2D", "PIECE", 6800, "CRITIQUE"],
  ["ele_31", "5580 6031", "Indicateur analogique de température d'huile moteur", 6, 25, "Jauge température moteur", "Epiroc", "PIECE", 520, "HAUTE"],
  ["ele_32", "5580 6032", "Indicateur analogique de pression d'huile moteur", 6, 25, "Jauge pression huile", "Epiroc", "PIECE", 480, "HAUTE"],
  ["ele_33", "5580 6033", "Indicateur de pression de circuit de freinage wet", 6, 25, "Jauge de pression freins", "Epiroc", "PIECE", 420, "MOYENNE"],
  ["ele_34", "5580 6034", "Compteur horaire électromécanique de fonctionnement", 6, 25, "Compteur horaire", "Epiroc", "PIECE", 380, "BASSE"],
  ["ele_35", "5580 6035", "Voltmètre analogique de tension de circuit 24V", 6, 25, "Voltmètre 24V", "Epiroc", "PIECE", 280, "BASSE"],
  ["ele_36", "5580 6036", "Monostick de direction mécanique de canopy", 6, 25, "Monostick de direction", "ST2D", "PIECE", 4200, "HAUTE"],
  ["ele_37", "5580 6037", "Levier mécanique de commande de bennage", 6, 25, "Levier de commande dump", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["ele_38", "5580 6038", "Levier mécanique de commande de levage/hoist", 6, 25, "Levier de commande hoist", "Epiroc", "PIECE", 2800, "HAUTE"],
  ["ele_39", "5580 6039", "Ventilateur électrique de brassage d'air de canopy", 6, 26, "Ventilateur de canopy", "24V", "PIECE", 1800, "MOYENNE"],
  ["ele_40", "5580 6040", "Plafonnier de rechange à LED pour canopy", 6, 26, "Éclairage intérieur canopy", "LED 24V", "PIECE", 340, "BASSE"],

  // SOU-SYSTÈME 7 : CHÂSSIS, STRUCTURE & LIAISON — Articulation 16°, 12 320 kg (39 pièces)
  ["cha_01", "0428 7001", "Cadre de châssis mécano-soudé de section avant ST2D", 7, 28, "Cadre avant châssis", "ST2D", "PIECE", 22000, "CRITIQUE"],
  ["cha_02", "0428 7002", "Cadre de châssis mécano-soudé de section arrière ST2D", 7, 28, "Cadre arrière châssis", "ST2D", "PIECE", 20000, "CRITIQUE"],
  ["cha_03", "0428 7003", "Pivot d'accouplement de l'articulation centrale", 7, 27, "Articulation centrale", "ST2D", "PIECE", 16000, "CRITIQUE"],
  ["cha_04", "0428 7004", "Arceau de sécurité ROPS/FOPS de section avant", 7, 28, "Arceau ROPS/FOPS avant", "ST2D", "PIECE", 14000, "CRITIQUE"],
  ["cha_05", "0428 7005", "Arceau de sécurité ROPS/FOPS de section arrière", 7, 28, "Arceau ROPS/FOPS arrière", "ST2D", "PIECE", 12000, "CRITIQUE"],
  ["cha_06", "0428 7006", "Plaque de renfort en acier de longeron latéral", 7, 28, "Renfort de cadre", "ST2D", "PIECE", 7200, "HAUTE"],
  ["cha_07", "0428 7007", "Traverse lourde d'assemblage de cadre de châssis", 7, 28, "Traverse de cadre", "ST2D", "PIECE", 5800, "HAUTE"],
  ["cha_08", "0428 7008", "Support de fixation moteur sur longeron de châssis", 7, 28, "Support moteur sur cadre", "ST2D", "PIECE", 4500, "CRITIQUE"],
  ["cha_09", "0428 7009", "Silentbloc amortisseur de vibrations de cadre", 7, 28, "Silentbloc de cadre", "Epiroc", "PIECE", 1100, "MOYENNE"],
  ["cha_10", "0428 7010", "Boulon de fixation haute résistance de cadre M24 x 120", 7, 28, "Boulon de cadre M24", "Epiroc", "PIECE", 180, "HAUTE"],
  ["cha_11", "0428 7011", "Axe d'accouplement rectifié d'articulation centrale", 7, 27, "Axe d'articulation", "ST2D", "PIECE", 10500, "CRITIQUE"],
  ["cha_12", "0428 7012", "Roulement de pivot oscillant à rouleaux sphériques", 7, 27, "Roulement d'articulation", "SKF", "PIECE", 3800, "CRITIQUE"],
  ["cha_13", "0428 7013", "Joint racleur élastomère de protection d'articulation", 7, 27, "Joint d'articulation", "Epiroc", "PIECE", 1600, "HAUTE"],
  ["cha_14", "0428 7014", "Bague d'usure en acier cémenté de liaison pivot", 7, 27, "Bague d'usure", "Epiroc", "PIECE", 1900, "MOYENNE"],
  ["cha_15", "0428 7015", "Graisseur d'axe de pivotement d'articulation centrale", 7, 27, "Graisseur d'articulation", "Epiroc", "PIECE", 320, "BASSE"],
  ["cha_16", "0428 7016", "Cale de réglage d'épaisseur de pivot d'articulation", 7, 27, "Cale d'ajustement", "Epiroc", "PIECE", 260, "BASSE"],
  ["cha_17", "0428 7017", "Couvercle métallique à bride d'articulation centrale", 7, 27, "Couvercle d'articulation", "Epiroc", "PIECE", 1400, "MOYENNE"],
  ["cha_18", "0428 7018", "Joint d'étanchéité SPI de moyeu d'articulation", 7, 27, "Joint SPI articulation", "Epiroc", "PIECE", 380, "HAUTE"],
  ["cha_19", "0428 7019", "Marchepied d'accès de sécurité antidérapant avant", 7, 28, "Marchepied avant", "ST2D", "PIECE", 2800, "MOYENNE"],
  ["cha_20", "0428 7020", "Marchepied d'accès de sécurité antidérapant arrière", 7, 28, "Marchepied arrière", "ST2D", "PIECE", 2600, "MOYENNE"],
  ["cha_21", "0428 7021", "Échelle d'accès métallique de canopy de protection", 7, 28, "Échelle d'accès", "ST2D", "PIECE", 3800, "MOYENNE"],
  ["cha_22", "0428 7022", "Poignée d'accès ergonomique de maintien 3 points", 7, 28, "Poignée d'accès", "Epiroc", "PIECE", 580, "HAUTE"],
  ["cha_23", "0428 7023", "Marchepied d'accès de sécurité latéral antidérapant", 7, 28, "Marchepied latéral", "Epiroc", "PIECE", 2400, "MOYENNE"],
  ["cha_24", "0428 7024", "Garde-boue métallique de protection de roue avant", 7, 28, "Garde-boue avant", "ST2D", "PIECE", 2200, "BASSE"],
  ["cha_25", "0428 7025", "Garde-boue métallique de protection de roue arrière", 7, 28, "Garde-boue arrière", "ST2D", "PIECE", 2000, "BASSE"],
  ["cha_26", "0428 7026", "Tôle d'acier de blindage du réservoir hydraulique", 7, 28, "Protection réservoir", "ST2D", "PIECE", 3400, "HAUTE"],
  ["cha_27", "0428 7027", "Tôle d'acier de blindage du réservoir de gazole", 7, 28, "Protection réservoir fuel", "ST2D", "PIECE", 3200, "HAUTE"],
  ["cha_28", "0428 7028", "Tôle de bas de caisse latérale de protection de châssis", 7, 28, "Bas de caisse latéral", "ST2D", "PIECE", 4800, "HAUTE"],
  ["cha_29", "0428 7029", "Carter métallique de protection d'articulation centrale", 7, 27, "Protection articulation", "ST2D", "PIECE", 2400, "MOYENNE"],
  ["cha_30", "0428 7030", "Grille métallique ajourée de protection de phare avant", 7, 28, "Grille de protection phare", "ST2D", "PIECE", 1100, "BASSE"],
  ["cha_31", "0428 7031", "Grille métallique ajourée de protection de refroidisseur", 7, 28, "Grille de refroidisseur", "ST2D", "PIECE", 2600, "HAUTE"],
  ["cha_32", "0428 7032", "Grille métallique de sécurité de ventilateur de moteur", 7, 28, "Grille de ventilateur", "ST2D", "PIECE", 1400, "HAUTE"],
  ["cha_33", "0428 7033", "Grille de protection métallique de capot arrière", 7, 28, "Grille de capot arrière", "ST2D", "PIECE", 1900, "MOYENNE"],
  ["cha_34", "0428 7034", "Crochet de remorquage en acier forgé avant", 7, 28, "Crochet remorquage AV", "ST2D", "PIECE", 5200, "HAUTE"],
  ["cha_35", "0428 7035", "Crochet de remorquage en acier forgé arrière", 7, 28, "Crochet remorquage AR", "ST2D", "PIECE", 4800, "HAUTE"],
  ["cha_36", "0428 7036", "Câble métallique de remorquage renforcé d'origine", 7, 28, "Câble de remorquage", "Epiroc", "PIECE", 2400, "HAUTE"],
  ["cha_37", "0428 7037", "Élingue textile de sécurité pour travaux de levage", 7, 28, "Élingue de traction", "Epiroc", "PIECE", 1600, "HAUTE"],
  ["cha_38", "0428 7038", "Blindage métallique inférieur avant (Plaque de carter)", 7, 28, "Bouclier avant", "ST2D", "PIECE", 3600, "HAUTE"],
  ["cha_39", "0428 7039", "Blindage métallique inférieur arrière (Plaque de carter)", 7, 28, "Bouclier arrière", "ST2D", "PIECE", 2800, "MOYENNE"]
];

export const ST2D_CATALOG: CatalogItem[] = RAW_ITEMS.map(([idSuffix, reference, designationRaw, catIndex, subCatIndex, component, subComponent, unit, price, criticality]) => {
  const cat = CATEGORIES[catIndex];
  const subCategory = SUB_CATEGORIES[subCatIndex];
  const designation = `[${cat.prefix}] - [${component.toUpperCase()}] - ${designationRaw}`;

  return {
    id: `st2d_${idSuffix}`,
    reference,
    designation,
    functionalCategory: cat.name,
    subCategory,
    component,
    subComponent,
    unit,
    price,
    proposedPrice: price,
    compatibility: "Epiroc Scooptram ST2D",
    criticality,
    suggestedType: "ENGINS"
  };
});
