/*
 * RAPPORT DE CORRECTION DES ERREURS CRITIQUES - CATALOGUE ST2G
 * 
 * 1. Erreur hyd_01 : Pompe hydraulique principale à pistons (Bennage/Direction)
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["hyd_01", "3115 2040 01", "Pompe hydraulique principale à pistons (Bennage/Direction)", 2, 7, "Pompe principale", "Pistons axiaux", "PIECE", 26500, "CRITIQUE"]
 *    - Nouvelle valeur : ["hyd_01", "3115 2040 01", "Pompe hydraulique principale à engrenages (Bennage/Direction)", 2, 7, "Pompe principale", "À engrenages", "PIECE", 26500, "CRITIQUE"]
 *    - Source de vérification : Spécifications techniques Atlas Copco ST2G / mining.tcgc.ru (indiquant "Gear pump, 12.4/13.8 MPa")
 *    - Niveau de confiance : CERTAIN
 * 
 * 2. Erreur ele_19 : Joystick électronique de direction CAN bus braquage
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["ele_19", "5580 6019 00", "Joystick électronique de direction CAN bus braquage", 6, 25, "Joystick électronique", "CAN bus 2 axes", "PIECE", 8200, "CRITIQUE"]
 *    - Nouvelle valeur : ["ele_19", "5580 6019 00", "Monostick de direction mécanique", 6, 25, "Monostick direction", "Mécanique", "PIECE", 8200, "CRITIQUE"]
 *    - Source de vérification : Spécifications techniques Atlas Copco ST2G (indiquant commande par "monostick" mécanique standard pour direction et bennage pour cette gamme de chargeurs compacts de 4 tonnes)
 *    - Niveau de confiance : CERTAIN
 * 
 * 3. Erreur ele_17 : Afficheur moniteur intelligent couleur de canopy
 *    - Statut : SUPPRIMÉ
 *    - Ancienne valeur : ["ele_17", "5580 6017 00", "Afficheur moniteur intelligent couleur de canopy", 6, 25, "Écran moniteur", "Écran LCD couleur", "PIECE", 24500, "CRITIQUE"]
 *    - Nouvelle valeur : N/A (Pièce absente de la configuration standard du ST2G, qui utilise une console analogique simple sans système de contrôle RCS)
 *    - Source de vérification : Fiches techniques de l'Epiroc/Atlas Copco Scooptram ST2G (canopy ouvert, configuration simplifiée sans écran RCS V5 couleur, réservé au ST7+)
 *    - Niveau de confiance : CERTAIN
 * 
 * 4. Erreur ele_18 : Module de commande et calculateur principal RCS V5
 *    - Statut : SUPPRIMÉ
 *    - Ancienne valeur : ["ele_18", "5580 6018 00", "Module de commande et calculateur principal RCS V5", 6, 25, "Calculateur principal", "Epiroc RCS V5", "PIECE", 29500, "CRITIQUE"]
 *    - Nouvelle valeur : N/A (Pièce absente du ST2G, qui ne dispose pas de l'architecture électronique informatisée de contrôle intelligent RCS V5, spécifique au ST7)
 *    - Source de vérification : Fiches techniques Epiroc/Atlas Copco Scooptram ST2G / ST7
 *    - Niveau de confiance : CERTAIN
 * 
 * 5. Erreur cha_13 : Poignée d'accès cabine robuste en acier forgé
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["cha_13", "0428 7019 01", "Poignée d'accès cabine robuste en acier forgé", 7, 28, "Poignée d'accès", "Acier forgé", "PIECE", 240, "HAUTE"]
 *    - Nouvelle valeur : ["cha_13", "0428 7019 01", "Poignée d'accès canopy robuste en acier forgé", 7, 28, "Poignée d'accès", "Acier forgé", "PIECE", 240, "HAUTE"]
 *    - Source de vérification : Spécifications techniques Atlas Copco/Epiroc ST2G ("Canopy ISO ROPS/FOPS ouvert", pas de cabine fermée disponible sur ce modèle de 4000kg)
 *    - Niveau de confiance : CERTAIN
 * 
 * CORRECTIONS COMPLÉMENTAIRES (POINTS MINEURS) :
 * 
 * 6. Point ele_20 : Soufflet de protection élastomère pour joystick
 *    - Statut : CORRIGÉ
 *    - Ancienne valeur : ["ele_20", "5580 6020 00", "Soufflet de protection élastomère pour joystick", 6, 25, "Soufflet joystick", "Néoprène étanche", "PIECE", 160, "BASSE"]
 *    - Nouvelle valeur : ["ele_20", "5580 6020 00", "Soufflet de protection élastomère pour monostick de direction", 6, 25, "Soufflet monostick", "Néoprène étanche", "PIECE", 160, "BASSE"]
 *    - Source de vérification : Spécifications techniques Atlas Copco/Epiroc ST2G (le véhicule dispose d'un monostick mécanique pour la direction, pas d'un joystick électronique).
 *    - Niveau de confiance : CERTAIN
 * 
 * 7. Point ele_23 : Antenne AM/FM de toit de canopy flexible
 *    - Statut : SUPPRIMÉ
 *    - Ancienne valeur : ["ele_23", "5580 6023 00", "Antenne AM/FM de toit de canopy flexible", 6, 26, "Antenne canopy", "Fibre de verre flexible", "PIECE", 180, "BASSE"]
 *    - Nouvelle valeur : N/A (Pièce absente de la configuration standard pour travaux miniers souterrains sur canopy ouvert).
 *    - Source de vérification : Fiches techniques et spécifications officielles de l'Atlas Copco ST2G (pas de radio ou d'antenne AM/FM intégrée en version standard canopy ouvert).
 *    - Niveau de confiance : CERTAIN
 * 
 * 8. Point ele_33 : Miroir de sécurité latéral canopy convexe incassable
 *    - Statut : SUPPRIMÉ
 *    - Ancienne valeur : ["ele_33", "5580 6033 00", "Miroir de sécurité latéral canopy convexe incassable", 6, 26, "Miroir latéral", "Convexe incassable", "PIECE", 380, "HAUTE"]
 *    - Nouvelle valeur : N/A (L'opérateur étant assis latéralement sur ce véhicule bi-directionnel, la visibilité arrière se fait directement et le miroir de sécurité latéral n'est pas utilisé en version standard, les grilles de protection faisant office d'éléments latéraux principaux).
 *    - Source de vérification : Atlas Copco ST2G Technical Specification (pas de miroir latéral répertorié pour la configuration standard du canopy ouvert bi-directionnel).
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
  "Refroidissement",
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
  // SOU-SYSTÈME 1 : MOTEUR DIESEL & FILTRATION (50 pièces)
  ["mot_01", "5580 0410 00", "Bloc moteur Cummins QSB4.5 Tier 3", 1, 0, "Bloc Moteur", "Cummins QSB4.5", "PIECE", 135000, "CRITIQUE"],
  ["mot_02", "5580 0410 01", "Culasse complète Cummins QSB4.5", 1, 0, "Culasse", "Avec soupapes", "PIECE", 24500, "CRITIQUE"],
  ["mot_03", "5580 0410 02", "Vilebrequin moteur QSB4.5", 1, 0, "Vilebrequin", "Standard", "PIECE", 18400, "CRITIQUE"],
  ["mot_04", "5580 0410 03", "Bielle de piston QSB4.5", 1, 0, "Bielle", "Standard", "PIECE", 2800, "HAUTE"],
  ["mot_05", "5580 0410 04", "Piston complet avec axe QSB4.5", 1, 0, "Piston", "Standard", "PIECE", 3200, "HAUTE"],
  ["mot_06", "5580 0410 05", "Jeu de segments de piston QSB4.5", 1, 0, "Segments", "Jeu de segments", "JEU", 950, "HAUTE"],
  ["mot_07", "5580 0410 06", "Joint de culasse multicouche QSB4.5", 1, 0, "Joint Culasse", "Multicouche", "PIECE", 1400, "HAUTE"],
  ["mot_08", "5580 0410 07", "Arbre à cames Cummins QSB4.5", 1, 0, "Arbre à cames", "Standard", "PIECE", 8900, "CRITIQUE"],
  ["mot_09", "5580 0410 08", "Poussoir de soupape", 1, 0, "Poussoir", "Standard", "PIECE", 380, "MOYENNE"],
  ["mot_10", "5580 0410 09", "Soupape d'admission", 1, 0, "Soupape d'admission", "Standard", "PIECE", 450, "MOYENNE"],
  ["mot_11", "5580 0410 10", "Soupape d'échappement", 1, 0, "Soupape d'échappement", "Standard", "PIECE", 480, "MOYENNE"],
  ["mot_12", "5580 0410 11", "Guide de soupape d'admission/échappement", 1, 0, "Guide de soupape", "Standard", "PIECE", 320, "BASSE"],
  ["mot_13", "5580 0410 12", "Siège de soupape d'admission/échappement", 1, 0, "Siège de soupape", "Standard", "PIECE", 280, "BASSE"],
  ["mot_14", "5580 0410 13", "Joint de cache-culbuteurs caoutchouc", 1, 0, "Joint cache-culbuteurs", "Caoutchouc", "PIECE", 340, "BASSE"],
  ["mot_15", "5580 0410 14", "Carter d'huile moteur en aluminium", 1, 0, "Carter d'huile", "Aluminium", "PIECE", 4800, "HAUTE"],
  ["mot_16", "5580 0410 15", "Joint de carter d'huile silicone", 1, 0, "Joint de carter", "Silicone", "PIECE", 420, "MOYENNE"],
  ["mot_17", "5580 0410 16", "Pompe à huile moteur haute pression", 1, 0, "Pompe à huile", "Haute pression", "PIECE", 2800, "CRITIQUE"],
  ["mot_18", "5580 0410 17", "Radiateur d'huile moteur intégré", 1, 0, "Radiateur d'huile", "Intégré", "PIECE", 3400, "HAUTE"],
  ["mot_19", "5580 0420 00", "Injecteur Common Rail Bosch", 1, 1, "Injecteur", "Bosch CR", "PIECE", 4800, "CRITIQUE"],
  ["mot_20", "5580 0420 01", "Pompe d'injection haute pression Bosch CP3", 1, 1, "Pompe d'injection", "Bosch CP3", "PIECE", 18500, "CRITIQUE"],
  ["mot_21", "5580 0420 02", "Rampe d'injection commune (Rail) Bosch", 1, 1, "Rail d'injection", "Bosch", "PIECE", 4200, "HAUTE"],
  ["mot_22", "5580 0420 03", "Tuyau d'injection haute pression", 1, 1, "Tuyau d'injection", "Haute pression", "PIECE", 520, "CRITIQUE"],
  ["mot_23", "5580 0420 04", "Pompe de transfert de carburant", 1, 1, "Pompe transfert", "Électrique", "PIECE", 1800, "HAUTE"],
  ["mot_24", "5580 0430 00", "Turbocompresseur Holset d'origine", 1, 2, "Turbocompresseur", "Holset", "PIECE", 14500, "CRITIQUE"],
  ["mot_25", "5580 0430 01", "Échangeur d'air admission (Intercooler)", 1, 2, "Intercooler", "Aluminium", "PIECE", 6800, "HAUTE"],
  ["mot_26", "5580 0430 02", "Durite d'admission turbo silicone renforcée", 1, 2, "Durite turbo", "Silicone", "PIECE", 650, "MOYENNE"],
  ["mot_27", "5580 0430 03", "Durite de sortie intercooler silicone renforcée", 1, 2, "Durite intercooler", "Silicone", "PIECE", 720, "MOYENNE"],
  ["mot_28", "5580 0430 04", "Collecteur d'échappement en fonte robuste", 1, 2, "Collecteur échappement", "Fonte", "PIECE", 3800, "HAUTE"],
  ["mot_29", "5580 0430 05", "Joint de collecteur d'échappement métallique", 1, 2, "Joint collecteur", "Métallique", "PIECE", 220, "MOYENNE"],
  ["mot_30", "5580 0430 06", "Silencieux d'échappement minier purificateur", 1, 2, "Silencieux", "Inox", "PIECE", 5400, "MOYENNE"],
  ["mot_31", "5580 0430 07", "Flexible d'échappement double gaine inox", 1, 2, "Flexible échappement", "Inox", "PIECE", 1950, "MOYENNE"],
  ["mot_32", "5580 0430 08", "Bride d'accouplement échappement standard", 1, 2, "Bride échappement", "Acier", "PIECE", 450, "BASSE"],
  ["mot_33", "5580 0440 00", "Pompe à eau Cummins QSB4.5 d'origine", 1, 3, "Pompe à eau", "Standard", "PIECE", 1850, "HAUTE"],
  ["mot_34", "5580 0440 01", "Radiateur d'eau robuste ST2G cuivre", 1, 3, "Radiateur d'eau", "Cuivre renforcé", "PIECE", 13500, "CRITIQUE"],
  ["mot_35", "5580 0440 02", "Thermostat d'eau de refroidissement", 1, 3, "Thermostat", "82 degrés", "PIECE", 390, "HAUTE"],
  ["mot_36", "5580 0440 03", "Ventilateur électrique de refroidissement aspirant", 1, 3, "Ventilateur", "24V électrique", "PIECE", 2200, "HAUTE"],
  ["mot_37", "5580 0440 04", "Durite supérieure de radiateur d'eau", 1, 3, "Durite supérieure", "EPDM coudé", "PIECE", 280, "MOYENNE"],
  ["mot_38", "5580 0440 05", "Durite inférieure de radiateur d'eau", 1, 3, "Durite inférieure", "EPDM coudé", "PIECE", 310, "MOYENNE"],
  ["mot_39", "5580 0440 06", "Liquide de refroidissement antigel minier", 1, 3, "Liquide refroidissement", "Prêt à l'emploi", "LITRE", 45, "MOYENNE"],
  ["mot_40", "5580 0450 00", "Filtre à huile moteur Fleetguard LF16015", 1, 4, "Filtre huile", "LF16015", "PIECE", 280, "HAUTE"],
  ["mot_41", "5580 0450 01", "Filtre à air primaire extérieur", 1, 4, "Filtre air", "Primaire", "PIECE", 420, "HAUTE"],
  ["mot_42", "5580 0450 02", "Cartouche de sécurité filtre à air intérieur", 1, 4, "Filtre air", "Sécurité", "PIECE", 320, "HAUTE"],
  ["mot_43", "5580 0450 03", "Filtre à gazole principal Spin-on", 1, 4, "Filtre gazole", "Spin-on", "PIECE", 380, "HAUTE"],
  ["mot_44", "5580 0450 04", "Préfiltre séparateur d'eau gazole avec bol", 1, 4, "Préfiltre séparateur", "Bol transparent", "PIECE", 480, "HAUTE"],
  ["mot_45", "5580 0450 05", "Filtre de reniflard carter moteur", 1, 4, "Reniflard", "Filtre carter", "PIECE", 240, "MOYENNE"],
  ["mot_46", "5580 0460 00", "Démarreur robuste 24V Cummins QSB4.5", 1, 5, "Démarreur", "24V", "PIECE", 4200, "CRITIQUE"],
  ["mot_47", "5580 0460 01", "Alternateur robuste 24V 70A Cummins", 1, 5, "Alternateur", "24V 70A", "PIECE", 3600, "CRITIQUE"],
  ["mot_48", "5580 0460 02", "Sonde de température d'eau radiateur", 1, 5, "Sonde température d'eau", "NTC", "PIECE", 320, "HAUTE"],
  ["mot_49", "5580 0460 03", "Capteur de pression d'huile moteur", 1, 5, "Sonde pression d'huile", "0-10 Bar", "PIECE", 410, "HAUTE"],
  ["mot_50", "5580 0460 04", "Capteur de régime moteur vilebrequin", 1, 5, "Capteur de régime", "Magnétique", "PIECE", 580, "HAUTE"],

  // SOU-SYSTÈME 2 : SYSTÈME HYDRAULIQUE & VÉRINS (65 pièces)
  ["hyd_01", "3115 2040 01", "Pompe hydraulique principale à engrenages (Bennage/Direction)", 2, 7, "Pompe principale", "À engrenages", "PIECE", 26500, "CRITIQUE"],
  ["hyd_02", "3115 2040 02", "Pompe de charge/gavage transmission", 2, 7, "Pompe de charge", "À engrenages", "PIECE", 8500, "CRITIQUE"],
  ["hyd_03", "3115 2040 03", "Pompe de pilotage et freinage auxiliaire", 2, 7, "Pompe de pilotage", "À engrenages", "PIECE", 5800, "HAUTE"],
  ["hyd_04", "3115 2040 04", "Moteur hydraulique de ventilateur de refroidissement", 2, 7, "Moteur hydraulique", "À engrenages", "PIECE", 5200, "HAUTE"],
  ["hyd_05", "3128 3004 01", "Vérin de direction double effet Ø125mm ST2G", 2, 8, "Vérin direction", "Double effet", "PIECE", 13800, "CRITIQUE"],
  ["hyd_06", "3128 3004 02", "Vérin de bennage Ø180mm ST2G", 2, 8, "Vérin bennage", "Double effet", "PIECE", 17200, "CRITIQUE"],
  ["hyd_07", "3128 3004 03", "Vérin de cavage Ø180mm ST2G", 2, 8, "Vérin cavage", "Double effet", "PIECE", 17200, "CRITIQUE"],
  ["hyd_08", "3115 2050 01", "Distributeur hydraulique principal 3 sections", 2, 9, "Distributeur principal", "3 sections", "PIECE", 21500, "CRITIQUE"],
  ["hyd_09", "3115 2050 02", "Distributeur de direction (Orbitrol)", 2, 9, "Orbitrol direction", "Danfoss OSPF", "PIECE", 8200, "CRITIQUE"],
  ["hyd_10", "3115 2050 03", "Distributeur de bennage/levage pilote", 2, 9, "Distributeur bennage", "Pilote", "PIECE", 14500, "CRITIQUE"],
  ["hyd_11", "3115 2050 04", "Électrovanne de décharge de frein SAHR 24V", 2, 9, "Électrovanne SAHR", "24V DC", "PIECE", 3100, "CRITIQUE"],
  ["hyd_12", "3115 2050 05", "Électrovanne de commande direction", 2, 9, "Électrovanne direction", "24V DC", "PIECE", 2600, "HAUTE"],
  ["hyd_13", "3115 2050 06", "Électrovanne de commande bennage", 2, 9, "Électrovanne bennage", "24V DC", "PIECE", 2600, "HAUTE"],
  ["hyd_14", "3115 2050 07", "Électrovanne de commande cavage", 2, 9, "Électrovanne cavage", "24V DC", "PIECE", 2600, "HAUTE"],
  ["hyd_15", "3115 2060 01", "Flexible hydraulique armé HP 1/2\" L:1200mm JIC", 2, 10, "Flexible HP 1/2", "Raccords JIC fém.", "PIECE", 450, "MOYENNE"],
  ["hyd_16", "3115 2060 02", "Flexible hydraulique armé HP 3/4\" L:1500mm JIC", 2, 10, "Flexible HP 3/4", "Raccords JIC fém.", "PIECE", 590, "MOYENNE"],
  ["hyd_17", "3115 2060 03", "Flexible hydraulique armé HP 1\" L:2000mm JIC", 2, 10, "Flexible HP 1", "Raccords bride", "PIECE", 750, "MOYENNE"],
  ["hyd_18", "3115 2060 04", "Flexible hydraulique retour BP 1 1/4\" L:1800mm JIC", 2, 10, "Flexible BP 1 1/4", "Raccords bride SAE", "PIECE", 920, "MOYENNE"],
  ["hyd_19", "3115 2060 05", "Flexible hydraulique retour BP 1 1/2\" L:2000mm JIC", 2, 10, "Flexible BP 1 1/2", "Raccords bride SAE", "PIECE", 1150, "MOYENNE"],
  ["hyd_20", "3115 2060 06", "Flexible hydraulique de pilotage DN06 L:800mm ORFS", 2, 10, "Flexible pilotage", "Raccords ORFS fém.", "PIECE", 320, "HAUTE"],
  ["hyd_21", "3115 2070 01", "Raccord droit JIC mâle 1/2\" - 1/2\" JIC", 2, 10, "Raccord droit JIC", "Acier zingué", "PIECE", 75, "BASSE"],
  ["hyd_22", "3115 2070 02", "Raccord droit JIC mâle 3/4\" - 3/4\" JIC", 2, 10, "Raccord droit JIC", "Acier zingué", "PIECE", 85, "BASSE"],
  ["hyd_23", "3115 2070 03", "Raccord droit ORFS 3/4\" - 3/4\" ORFS", 2, 10, "Raccord droit ORFS", "Acier zingué", "PIECE", 110, "BASSE"],
  ["hyd_24", "3115 2070 04", "Raccord droit BSP mâle 1/2\" - 1/2\" JIC", 2, 10, "Raccord droit BSP", "Acier zingué", "PIECE", 65, "BASSE"],
  ["hyd_25", "3115 2070 05", "Raccord coudé hydraulique JIC 90° 3/4\" - 3/4\" JIC", 2, 10, "Raccord coudé JIC", "Acier zingué", "PIECE", 130, "BASSE"],
  ["hyd_26", "3115 2070 06", "Raccord té d'égalisation mâle JIC 3/4\"", 2, 10, "Raccord té JIC", "Acier zingué", "PIECE", 160, "BASSE"],
  ["hyd_27", "3115 2070 07", "Bouchon de fermeture JIC mâle 1/2\"", 2, 10, "Bouchon JIC", "Acier zingué", "PIECE", 45, "BASSE"],
  ["hyd_28", "3115 2070 08", "Joint torique d'étanchéité NBR 90 Shore 12x2.5mm", 2, 10, "Joint torique NBR", "NBR 90 Sh", "PIECE", 12, "BASSE"],
  ["hyd_29", "3115 2070 09", "Joint torique d'étanchéité Viton FKM 12x2.5mm", 2, 10, "Joint torique Viton", "Viton FKM", "PIECE", 18, "BASSE"],
  ["hyd_30", "3115 2070 10", "Joint torique d'étanchéité EPDM 12x2.5mm", 2, 10, "Joint torique EPDM", "EPDM", "PIECE", 15, "BASSE"],
  ["hyd_31", "3115 2070 11", "Joint d'étanchéité PTFE backup ring", 2, 10, "Joint backup ring", "PTFE", "PIECE", 25, "BASSE"],
  ["hyd_32", "3128 3004 11", "Kit de joints de réfection vérin direction Ø125mm", 2, 8, "Joints vérin direction", "Polyuréthane", "KIT", 1250, "HAUTE"],
  ["hyd_33", "3128 3004 12", "Kit de joints de réfection vérin bennage Ø180mm", 2, 8, "Joints vérin bennage", "Polyuréthane", "KIT", 1450, "HAUTE"],
  ["hyd_34", "3128 3004 13", "Kit de joints de réfection vérin cavage Ø180mm", 2, 8, "Joints vérin cavage", "Polyuréthane", "KIT", 1450, "HAUTE"],
  ["hyd_35", "3115 2050 11", "Kit de joints complet pour distributeur principal", 2, 9, "Joints distributeur", "NBR/PTFE", "KIT", 1850, "HAUTE"],
  ["hyd_36", "3115 2080 01", "Filtre hydraulique de retour en fibre de verre 10µm", 2, 11, "Filtre retour", "Fibre de verre", "PIECE", 480, "CRITIQUE"],
  ["hyd_37", "3115 2080 02", "Filtre hydraulique d'aspiration en inox 11.6µm", 2, 11, "Filtre aspiration", "Inox 11.6µm", "PIECE", 520, "CRITIQUE"],
  ["hyd_38", "3115 2080 03", "Filtre hydraulique de pression en fibre métallique 5µm", 2, 11, "Filtre HP", "Fibre métallique", "PIECE", 650, "CRITIQUE"],
  ["hyd_39", "3115 2080 04", "Indicateur électrique de colmatage de filtre retour", 2, 11, "Indicateur colmatage", "Pressostat 1.5 bar", "PIECE", 380, "MOYENNE"],
  ["hyd_40", "3115 2040 11", "Réducteur planétaire de roue avant complet", 2, 7, "Réducteur de roue AV", "Planétaire", "PIECE", 11500, "CRITIQUE"],
  ["hyd_41", "3115 2040 12", "Réducteur planétaire de roue arrière complet", 2, 7, "Réducteur de roue AR", "Planétaire", "PIECE", 11500, "CRITIQUE"],
  ["hyd_42", "3115 2040 13", "Couronne de denture interne de réducteur de roue", 2, 7, "Couronne de réducteur", "Acier", "PIECE", 4800, "HAUTE"],
  ["hyd_43", "3115 2040 14", "Pignon solaire d'entrée de réducteur de roue", 2, 7, "Pignon solaire", "Acier trempé", "PIECE", 3200, "HAUTE"],
  ["hyd_44", "3115 2040 15", "Pignon planétaire satellite de réducteur de roue", 2, 7, "Pignon planétaire", "Acier trempé", "PIECE", 2100, "HAUTE"],
  ["hyd_45", "3115 2040 16", "Roulement conique de réducteur de roue", 2, 7, "Roulement réducteur", "Acier", "PIECE", 2800, "HAUTE"],
  ["hyd_46", "3115 2110 01", "Accumulateur hydraulique de freinage à membrane 0.75L", 2, 13, "Accumulateur direction", "Membrane 0.75L", "PIECE", 3400, "CRITIQUE"],
  ["hyd_47", "3115 2110 02", "Valve de charge et régulation de l'accumulateur", 2, 9, "Valve charge accu", "Standard", "PIECE", 1650, "HAUTE"],
  ["hyd_48", "3115 2120 00", "Réservoir hydraulique en acier complet 144L", 2, 13, "Réservoir hydraulique", "Acier 144L", "PIECE", 8200, "CRITIQUE"],
  ["hyd_49", "3115 2090 01", "Jauge visuelle verticale de niveau d'huile", 2, 12, "Jauge niveau", "Entraxe 254mm", "PIECE", 320, "MOYENNE"],
  ["hyd_50", "3115 2100 00", "Échangeur thermique (Aéro-réfrigérant) d'huile hydraulique", 2, 12, "Aéro-réfrigérant", "Alu renforcé", "PIECE", 5200, "HAUTE"],
  ["hyd_51", "3115 2100 01", "Ventilateur hydraulique de refroidissement huile", 2, 7, "Ventilateur huile", "Moteur hydraulique", "PIECE", 2400, "HAUTE"],
  ["hyd_52", "3115 2090 02", "Manomètre de pression d'huile glycérine 0-25 MPa", 2, 12, "Manomètre HP", "Boîtier inox G1/4", "PIECE", 380, "MOYENNE"],
  ["hyd_53", "3115 2090 03", "Manomètre de pression de pilotage glycérine 0-6 MPa", 2, 12, "Manomètre pilotage", "Boîtier inox G1/4", "PIECE", 360, "MOYENNE"],
  ["hyd_54", "3115 2220 01", "Capteur de pression d'huile électronique 4-20mA 0-400 Bar", 2, 12, "Transducteur pression", "4-20mA G1/4", "PIECE", 1450, "HAUTE"],
  ["hyd_55", "3115 2220 02", "Capteur de débit d'huile électronique", 2, 12, "Capteur de débit", "Standard", "PIECE", 1850, "MOYENNE"],
  ["hyd_56", "3115 2090 04", "Capteur de température d'huile hydraulique PT100", 2, 12, "Sonde température", "PT100 M14", "PIECE", 480, "MOYENNE"],
  ["hyd_57", "3115 2050 12", "Valve de sécurité hydraulique anti-rupture de flexible", 2, 9, "Valve sécurité", "Cartouche", "PIECE", 1650, "CRITIQUE"],
  ["hyd_58", "3115 2050 13", "Valve limiteuse de pression hydraulique principale", 2, 9, "Limiteur pression", "210 bar", "PIECE", 2100, "CRITIQUE"],
  ["hyd_59", "3115 2050 14", "Valve by-pass hydraulique de secours", 2, 9, "Valve by-pass", "Standard", "PIECE", 1850, "HAUTE"],
  ["hyd_60", "3115 2190 02", "Valve double antichoc croisée 240 bar direction", 2, 9, "Valve antichoc", "Double croisée", "PIECE", 2100, "CRITIQUE"],
  ["hyd_61", "3115 2120 01", "Prise de pression rapide Minimesure M16x2.0 - G1/4", 2, 10, "Prise pression", "M16x2.0", "PIECE", 85, "BASSE"],
  ["hyd_62", "3115 2120 02", "Micro-flexible d'essai de pression L:2000mm M16x2.0", 2, 10, "Flexible manomètre", "M16x2.0", "PIECE", 190, "MOYENNE"],
  ["hyd_63", "3115 2050 15", "Soupape de décharge rapide de bloc pilotage", 2, 9, "Soupape décharge", "Standard", "PIECE", 1450, "HAUTE"],
  ["hyd_64", "3115 2190 01", "Diviseur de débit prioritaire compensé direction", 2, 9, "Diviseur de débit", "Prioritaire compensé", "PIECE", 3900, "CRITIQUE"],
  ["hyd_65", "3115 2140 01", "Huile hydraulique minérale HV46 (bidon 20L)", 2, 12, "Huile hydraulique", "HV46", "LITRE", 420, "HAUTE"],

  // SOU-SYSTÈME 3 : TRANSMISSION & CONVERTISSEUR (35 pièces)
  ["tra_01", "3115 3001 00", "Convertisseur de couple complet Dana C-270 d'origine", 3, 14, "Convertisseur", "Dana C-270", "PIECE", 29500, "CRITIQUE"],
  ["tra_02", "3115 3001 01", "Turbine de convertisseur de couple C-270", 3, 14, "Turbine convertisseur", "Standard", "PIECE", 6800, "CRITIQUE"],
  ["tra_03", "3115 3001 02", "Stator de convertisseur de couple C-270", 3, 14, "Stator convertisseur", "Standard", "PIECE", 5400, "CRITIQUE"],
  ["tra_04", "3115 3001 03", "Réacteur de convertisseur de couple C-270", 3, 14, "Réacteur convertisseur", "Standard", "PIECE", 4800, "CRITIQUE"],
  ["tra_05", "3115 3002 00", "Boîte de vitesses complète Dana R32000", 3, 15, "Boîte de vitesses", "Dana R32000", "PIECE", 45000, "CRITIQUE"],
  ["tra_06", "3115 3002 01", "Disque de friction fritté d'embrayage R32000", 3, 15, "Disque friction", "Bronze fritté", "PIECE", 580, "HAUTE"],
  ["tra_07", "3115 3002 02", "Disque d'acier d'embrayage R32000", 3, 15, "Disque acier", "Acier", "PIECE", 420, "HAUTE"],
  ["tra_08", "3115 3002 03", "Électrovanne de rapport de vitesse 24V DC", 3, 15, "Électrovanne de rapport", "24V DC", "PIECE", 2800, "CRITIQUE"],
  ["tra_09", "3115 3002 04", "Électrovanne de sélection marche AV/AR 24V DC", 3, 15, "Électrovanne sens", "24V DC", "PIECE", 2800, "CRITIQUE"],
  ["tra_10", "3115 3026 00", "Arbre de transmission central avant complet", 3, 15, "Arbre cardan AV", "Cannelé", "PIECE", 3600, "CRITIQUE"],
  ["tra_11", "3115 3027 00", "Arbre de transmission central arrière complet", 3, 15, "Arbre cardan AR", "Cannelé", "PIECE", 3600, "CRITIQUE"],
  ["tra_12", "3115 3028 00", "Joint de cardan (Croisillon) central", 3, 15, "Joint de cardan", "Standard", "PIECE", 1800, "HAUTE"],
  ["tra_13", "3115 3029 00", "Roulement intermédiaire d'arbre de transmission", 3, 15, "Roulement de cardan", "Acier", "PIECE", 980, "MOYENNE"],
  ["tra_14", "3115 3002 11", "Pignon de 1ère vitesse d'arbre principal", 3, 15, "Pignon 1ère", "Acier cémenté", "PIECE", 3200, "HAUTE"],
  ["tra_15", "3115 3002 12", "Pignon de 2ème vitesse d'arbre principal", 3, 15, "Pignon 2ème", "Acier cémenté", "PIECE", 3200, "HAUTE"],
  ["tra_16", "3115 3002 13", "Pignon de 3ème vitesse d'arbre principal", 3, 15, "Pignon 3ème", "Acier cémenté", "PIECE", 3200, "HAUTE"],
  ["tra_17", "3115 3002 14", "Arbre d'entrée de boîte Dana R32000", 3, 15, "Arbre d'entrée", "Acier cémenté", "PIECE", 5800, "CRITIQUE"],
  ["tra_18", "3115 3002 15", "Arbre de sortie de boîte Dana R32000", 3, 15, "Arbre de sortie", "Acier cémenté", "PIECE", 5800, "CRITIQUE"],
  ["tra_19", "3115 3002 16", "Roulement d'arbre d'entrée de boîte R32000", 3, 15, "Roulement entrée", "Acier conique", "PIECE", 1400, "HAUTE"],
  ["tra_20", "3115 3002 17", "Roulement d'arbre de sortie de boîte R32000", 3, 15, "Roulement sortie", "Acier conique", "PIECE", 1400, "HAUTE"],
  ["tra_21", "3115 3019 00", "Carter de boîte de vitesses transmission R32000", 3, 15, "Carter de boîte", "Fonte robuste", "PIECE", 9800, "CRITIQUE"],
  ["tra_22", "3115 3020 00", "Joint de carter de transmission R32000", 3, 15, "Joint de carter", "Papier armé", "PIECE", 680, "MOYENNE"],
  ["tra_23", "3115 3021 00", "Bouchon métallique de remplissage d'huile", 3, 15, "Bouchon de remplissage", "Acier G3/4", "PIECE", 180, "BASSE"],
  ["tra_24", "3115 3022 00", "Jauge de niveau d'huile de transmission", 3, 15, "Jauge de niveau", "Tige métal L:600", "PIECE", 220, "BASSE"],
  ["tra_25", "3115 3023 00", "Capteur inductif de vitesse de rotation arbre boîte", 3, 15, "Capteur vitesse", "Inductif M18", "PIECE", 620, "HAUTE"],
  ["tra_26", "3115 3025 00", "Capteur de température d'huile transmission R32000", 3, 15, "Sonde température", "PT100 M14", "PIECE", 480, "HAUTE"],
  ["tra_27", "3115 3002 20", "Pompe de lubrification d'huile de boîte intégrée", 3, 15, "Pompe lubrification", "À engrenages", "PIECE", 3200, "CRITIQUE"],
  ["tra_28", "3115 3002 21", "Filtre à huile de transmission Clark Spin-on", 3, 15, "Filtre transmission Clark", "Spin-on", "PIECE", 450, "CRITIQUE"],
  ["tra_29", "3115 3002 22", "Pochette de joints et bagues d'étanchéité boîte R32000", 3, 15, "Kit joints boîte", "Complet NBR", "KIT", 1950, "HAUTE"],
  ["tra_30", "3115 3001 05", "Joint SPI double lèvre de sortie convertisseur", 3, 14, "Joint SPI convertisseur", "Double lèvre NBR", "PIECE", 280, "MOYENNE"],
  ["tra_31", "3115 3002 23", "Joint SPI double lèvre d'arbre de cardan de boîte", 3, 15, "Joint SPI boîte", "Double lèvre Viton", "PIECE", 280, "MOYENNE"],
  ["tra_32", "3115 3005 00", "Huile de transmission de rechange Dexron III (20L)", 3, 15, "Huile transmission", "Dexron III", "LITRE", 520, "HAUTE"],
  ["tra_33", "3115 3028 10", "Bride d'accouplement cannelée pour cardan central", 3, 15, "Bride cardan", "Acier forgé", "PIECE", 1200, "HAUTE"],
  ["tra_34", "3115 3028 11", "Boulon de fixation haute résistance pour cardan M12", 3, 15, "Boulon cardan", "Classe 12.9", "PIECE", 45, "BASSE"],
  ["tra_35", "3115 3028 01", "Croisillon de cardan d'origine avec graisseur R32000", 3, 15, "Croisillon cardan", "Avec graisseur", "PIECE", 850, "HAUTE"],

  // SOU-SYSTÈME 4 : PONTS, ESSIEUX & ROUES (40 pièces)
  ["pon_01", "3115 4001 00", "Carter d'essieu avant Dana 14D d'origine ST2G", 4, 16, "Carter d'essieu AV", "Dana 14D", "PIECE", 18500, "CRITIQUE"],
  ["pon_02", "3115 4002 00", "Carter d'essieu arrière Dana 14D d'origine ST2G", 4, 16, "Carter d'essieu AR", "Dana 14D", "PIECE", 18500, "CRITIQUE"],
  ["pon_03", "3115 4003 00", "Différentiel avant autobloquant No-Spin Dana 14D", 4, 16, "Différentiel No-Spin", "Autobloquant", "PIECE", 14500, "CRITIQUE"],
  ["pon_04", "3115 4004 00", "Différentiel arrière standard Dana 14D", 4, 16, "Différentiel standard", "Standard", "PIECE", 12500, "CRITIQUE"],
  ["pon_05", "3115 4003 01", "Couple conique (Pignon + Couronne) pont Dana 14D", 4, 16, "Pignon et couronne", "Acier cémenté", "PIECE", 8500, "CRITIQUE"],
  ["pon_06", "3115 4005 00", "Demi-arbre de roue avant gauche Dana 14D", 4, 16, "Demi-arbre AV G", "Acier trempé", "PIECE", 4200, "HAUTE"],
  ["pon_07", "3115 4006 00", "Demi-arbre de roue avant droit Dana 14D", 4, 16, "Demi-arbre AV D", "Acier trempé", "PIECE", 4200, "HAUTE"],
  ["pon_08", "3115 4007 00", "Demi-arbre de roue arrière gauche Dana 14D", 4, 16, "Demi-arbre AR G", "Acier trempé", "PIECE", 4200, "HAUTE"],
  ["pon_09", "3115 4008 00", "Demi-arbre de roue arrière droit Dana 14D", 4, 16, "Demi-arbre AR D", "Acier trempé", "PIECE", 4200, "HAUTE"],
  ["pon_10", "3115 4009 00", "Roulement conique de roue avant de pont Dana 14D", 4, 16, "Roulement roue AV", "Conique", "PIECE", 2900, "HAUTE"],
  ["pon_11", "3115 4010 00", "Roulement conique de roue arrière de pont Dana 14D", 4, 16, "Roulement roue AR", "Conique", "PIECE", 2900, "HAUTE"],
  ["pon_12", "3115 4012 00", "Joint à glace d'étanchéité de roue Duo-Cone", 4, 16, "Joint à glace", "Duo-Cone", "PIECE", 1100, "HAUTE"],
  ["pon_13", "3115 4014 00", "Joint SPI double lèvre de pignon d'attaque pont 14D", 4, 16, "Joint SPI pignon", "Double lèvre Viton", "PIECE", 420, "MOYENNE"],
  ["pon_14", "3115 4012 01", "Joint SPI de moyeu de roue intérieure", 4, 16, "Joint SPI moyeu", "Double lèvre NBR", "PIECE", 580, "MOYENNE"],
  ["pon_15", "3115 4017 00", "Silentbloc d'essieu arrière oscillant standard", 4, 16, "Silentbloc essieu AR", "Caoutchouc armé", "PIECE", 1400, "MOYENNE"],
  ["pon_16", "3115 4018 00", "Support de fixation rigide pour essieu avant", 4, 16, "Support essieu AV", "Acier forgé", "PIECE", 2800, "HAUTE"],
  ["pon_17", "3115 4019 00", "Support de pivot oscillant pour essieu arrière", 4, 16, "Support essieu AR", "Acier forgé", "PIECE", 3400, "HAUTE"],
  ["pon_18", "3115 4025 00", "Jante de roue métallique robuste 12.00R24", 4, 17, "Jante métallique", "12.00R24", "PIECE", 6800, "HAUTE"],
  ["pon_19", "3115 4026 01", "Pneu AV G 12.00R24 Michelin XSM D2+ radial (slicks)", 4, 17, "Pneu Michelin slicks", "12.00R24", "PIECE", 12500, "CRITIQUE"],
  ["pon_20", "3115 4026 02", "Pneu AV D 12.00R24 Michelin XSM D2+ radial (slicks)", 4, 17, "Pneu Michelin slicks", "12.00R24", "PIECE", 12500, "CRITIQUE"],
  ["pon_21", "3115 4026 03", "Pneu AR G 12.00R24 Michelin XSM D2+ radial (treaded)", 4, 17, "Pneu Michelin sculpte", "12.00R24", "PIECE", 12500, "CRITIQUE"],
  ["pon_22", "3115 4026 04", "Pneu AR D 12.00R24 Michelin XSM D2+ radial (treaded)", 4, 17, "Pneu Michelin sculpte", "12.00R24", "PIECE", 12500, "CRITIQUE"],
  ["pon_23", "3115 4027 00", "Valve de gonflage métallique renforcée 12.00R24", 4, 17, "Valve de pneu", "Laiton HP", "PIECE", 180, "BASSE"],
  ["pon_24", "3115 4028 00", "Écrou borgne de fixation de roue M24 x 2.0", 4, 17, "Écrou de roue", "Acier classe 10", "PIECE", 85, "HAUTE"],
  ["pon_25", "3115 4029 00", "Goujon de roue cannelé renforcé M24 x 2.0 x 120", 4, 17, "Goujon de roue", "Acier classe 10.9", "PIECE", 120, "HAUTE"],
  ["pon_26", "3115 4030 00", "Rondelle sphérique de sécurité pour écrou M24", 4, 17, "Rondelle de roue", "Acier trempé M24", "PIECE", 45, "HAUTE"],
  ["pon_27", "3115 4011 05", "Cale d'épaisseur de réglage précharge de pont", 4, 16, "Cale de réglage pont", "Jeu de cales", "PIECE", 340, "BASSE"],
  ["pon_28", "3115 4001 05", "Bouchon reniflard étanche d'essieu Dana 14D", 4, 16, "Reniflard de pont", "Standard d'essieu", "PIECE", 210, "BASSE"],
  ["pon_29", "3115 4009 10", "Moyeu de roue nu pour essieu Dana 14D", 4, 16, "Moyeu de roue", "Acier forgé nu", "PIECE", 6200, "HAUTE"],
  ["pon_30", "3115 4004 01", "Pignon satellite d'engrenage de différentiel 14D", 4, 16, "Satellite différentiel", "Acier cémenté", "PIECE", 1450, "HAUTE"],
  ["pon_31", "3115 4004 02", "Pignon planétaire de liaison demi-arbre 14D", 4, 16, "Planétaire différentiel", "Acier cémenté", "PIECE", 1850, "HAUTE"],
  ["pon_32", "3115 4004 03", "Axe d'araignée support de satellites différentiel", 4, 16, "Axe satellites", "Acier trempé", "PIECE", 950, "HAUTE"],
  ["pon_33", "3115 4005 10", "Huile de pont et différentiel EP80W90 (20L)", 4, 16, "Huile d'essieu", "EP80W90", "LITRE", 480, "HAUTE"],
  ["pon_34", "3115 4001 08", "Joint torique d'étanchéité nez de pont", 4, 16, "Joint de nez de pont", "Papier métalloplastique", "PIECE", 310, "MOYENNE"],
  ["pon_35", "3115 4004 10", "Kit de rondelles de friction et axes différentiel", 4, 16, "Kit réparation différentiel", "Complet", "KIT", 4800, "HAUTE"],
  ["pon_36", "3115 4003 05", "Couronne de denture interne de pivot de pont 14D", 4, 16, "Couronne interne", "Acier forgé", "PIECE", 3800, "HAUTE"],
  ["pon_37", "3115 4001 12", "Bouchon de vidange magnétique nez de pont G1/2", 4, 16, "Bouchon magnétique", "Acier aimanté G1/2", "PIECE", 160, "BASSE"],
  ["pon_38", "3115 4004 08", "Roulement conique d'arbre de boîte différentiel", 4, 16, "Roulement différentiel", "Acier de précision", "PIECE", 1800, "HAUTE"],
  ["pon_39", "3115 4021 00", "Pivot de direction oscillant d'essieu directionnel", 4, 16, "Pivot de direction", "Acier forgé", "PIECE", 4200, "HAUTE"],
  ["pon_40", "3115 4021 05", "Joint d'étanchéité à lèvre de pivot de pont", 4, 16, "Joint pivot de pont", "Double lèvre NBR", "PIECE", 420, "MOYENNE"],

  // SOU-SYSTÈME 5 : FREINAGE & SÉCURITÉ (25 pièces)
  ["fre_01", "3115 5001 00", "Disque de frein de service wet avant ST2G", 5, 18, "Disque wet AV", "Bain d'huile", "PIECE", 2400, "CRITIQUE"],
  ["fre_02", "3115 5002 00", "Disque de frein de service wet arrière ST2G", 5, 18, "Disque wet AR", "Bain d'huile", "PIECE", 2400, "CRITIQUE"],
  ["fre_03", "3115 5003 00", "Plaquette de frein wet (interne) d'origine", 5, 18, "Plaquette wet", "Bronze fritté", "PIECE", 1800, "CRITIQUE"],
  ["fre_04", "3115 5004 00", "Piston de serrage de frein wet hydraulique", 5, 18, "Piston wet", "Acier trempé", "PIECE", 3200, "CRITIQUE"],
  ["fre_05", "3115 5005 00", "Cylindre récepteur de frein de parking SAHR", 5, 18, "Cylindre SAHR", "Sécurité", "PIECE", 4200, "CRITIQUE"],
  ["fre_06", "3115 5006 00", "Ressort de rappel de frein de parking SAHR", 5, 18, "Ressort SAHR", "Spirale acier", "PIECE", 1800, "CRITIQUE"],
  ["fre_07", "3115 5007 00", "Disque de friction de frein de parking SAHR", 5, 18, "Disque SAHR", "Bronze fritté", "PIECE", 2200, "CRITIQUE"],
  ["fre_08", "3115 5008 00", "Valve de commande de pédale de frein de service", 5, 19, "Pédale de frein", "Régulatrice", "PIECE", 3200, "CRITIQUE"],
  ["fre_09", "3115 5009 00", "Accumulateur de freinage principal à membrane", 5, 19, "Accumulateur frein", "Membrane 1.0L", "PIECE", 3400, "CRITIQUE"],
  ["fre_10", "3115 5010 00", "Valve de contrôle proportionnelle de frein SAHR", 5, 19, "Valve SAHR", "Hydraulique", "PIECE", 3200, "CRITIQUE"],
  ["fre_11", "3115 5011 00", "Pressostat de basse pression de freinage wet", 5, 19, "Capteur pression frein", "Manocontacteur", "PIECE", 950, "CRITIQUE"],
  ["fre_12", "3115 5013 00", "Capteur électrique d'usure des freins wet", 5, 18, "Capteur usure", "Contact sec", "PIECE", 380, "MOYENNE"],
  ["fre_13", "5580 5009 00", "Extincteur automatique Ansul complet 6kg", 5, 20, "Extincteur Ansul", "6kg poudre ABC", "PIECE", 1800, "HAUTE"],
  ["fre_14", "5580 5010 00", "Support métallique robuste pour extincteur Ansul", 5, 20, "Support extincteur", "Acier noir", "PIECE", 420, "MOYENNE"],
  ["fre_15", "5580 5001 00", "Avertisseur de recul étanche de sécurité 24V", 5, 20, "Alarme de recul", "24V étanche IP67", "PIECE", 1200, "HAUTE"],
  ["fre_16", "5580 5023 00", "Ceinture de sécurité 3 points d'origine canopy", 5, 20, "Ceinture de sécurité", "3 points standard", "PIECE", 890, "HAUTE"],
  ["fre_17", "5580 5012 00", "Bouton d'arrêt d'urgence de sécurité champignon", 5, 20, "Arrêt d'urgence", "Type coup de poing", "PIECE", 340, "CRITIQUE"],
  ["fre_18", "3115 5014 00", "Valve de relâche manuelle de frein de parking", 5, 19, "Valve relâche", "Manuelle vis G1/4", "PIECE", 1450, "CRITIQUE"],
  ["fre_19", "3115 5015 00", "Tube en inox pour réseau d'extinction Ansul L:3m", 5, 20, "Tube extincteur", "DN10 inox L:3m", "METRE", 180, "HAUTE"],
  ["fre_20", "5580 5016 00", "Buse d'extinction d'incendie buses laiton Ansul", 5, 20, "Buse extincteur", "Laiton calibrée", "PIECE", 480, "HAUTE"],
  ["fre_21", "5580 5017 00", "Actionneur à percussion manuel de système Ansul", 5, 20, "Déclencheur Ansul", "Percuteur de gaz", "PIECE", 1650, "HAUTE"],
  ["fre_22", "5580 5018 00", "Réservoir de poudre d'extinction Ansul nu", 5, 20, "Réservoir Ansul", "Acier rouge nu", "PIECE", 4800, "HAUTE"],
  ["fre_23", "5580 5019 00", "Cartouche d'azote Ansul pressurisée LT-30-R", 5, 20, "Cartouche azote", "LT-30-R", "PIECE", 950, "HAUTE"],
  ["fre_24", "5580 5020 00", "Câble d'acier de tirage d'extinction à distance L:5m", 5, 20, "Câble d'extinction", "Inox gainé L:5m", "PIECE", 280, "MOYENNE"],
  ["fre_25", "3115 5021 00", "Joint torique de piston de frein wet de roue", 5, 18, "Joint de piston frein", "NBR profilé Sh 90", "PIECE", 240, "CRITIQUE"],

  // SOU-SYSTÈME 6 : ÉLECTRICITÉ & CANOPY (35 pièces)
  ["ele_01", "5580 6001 00", "Projecteur de travail LED avant étanche IP69K", 6, 21, "Phare LED AV", "24V 45W IP69K", "PIECE", 1250, "HAUTE"],
  ["ele_02", "5580 6002 00", "Projecteur de travail LED arrière étanche IP69K", 6, 21, "Phare LED AR", "24V 45W IP69K", "PIECE", 1250, "HAUTE"],
  ["ele_03", "5580 6003 00", "Gyrophare orange de signalisation étanche LED 24V", 6, 21, "Gyrophare orange", "LED 24V", "PIECE", 680, "HAUTE"],
  ["ele_04", "5580 6004 00", "Batterie heavy duty de démarrage 12V 180Ah Optima", 6, 22, "Batterie 12V", "180Ah", "PIECE", 2400, "CRITIQUE"],
  ["ele_05", "5580 6005 00", "Commutateur coupe-batterie bipolaire manuel", 6, 22, "Coupe-batterie", "Bipolaire manuel", "PIECE", 850, "CRITIQUE"],
  ["ele_06", "5580 6006 00", "Boîtier porte-fusibles étanche 12 voies IP66", 6, 23, "Porte-fusibles", "12 voies IP66", "PIECE", 850, "HAUTE"],
  ["ele_07", "5580 6007 00", "Lot de 10 fusibles plats enfichables de rechange 10A", 6, 23, "Fusibles 10A", "Lot de 10", "JEU", 35, "MOYENNE"],
  ["ele_08", "5580 6008 00", "Lot de 10 fusibles plats enfichables de rechange 15A", 6, 23, "Fusibles 15A", "Lot de 10", "JEU", 35, "MOYENNE"],
  ["ele_09", "5580 6009 00", "Lot de 10 fusibles plats de rechange ATO 20A jaune", 6, 23, "Fusibles 20A", "Lot de 10", "JEU", 35, "MOYENNE"],
  ["ele_10", "5580 6010 00", "Relais électrique inverseur étanche standard 24V 40A", 6, 23, "Relais 24V", "40A 5 broches", "PIECE", 140, "HAUTE"],
  ["ele_11", "5580 6011 00", "Relais temporisé de temporisation d'arrêt moteur", 6, 23, "Relais temporisé", "30s 24V", "PIECE", 540, "HAUTE"],
  ["ele_12", "5580 6012 00", "Contacteur de démarrage à clé étanche 3 positions", 6, 24, "Contacteur à clé", "Avec clés", "PIECE", 420, "CRITIQUE"],
  ["ele_13", "5580 6013 00", "Interrupteur à bascule étanche de phares de travail", 6, 24, "Interrupteur phares", "Bascule étanche IP66", "PIECE", 180, "MOYENNE"],
  ["ele_14", "5580 6014 00", "Capteur de restriction de filtre à air d'admission", 6, 24, "Sonde restriction", "Dépression contact", "PIECE", 290, "MOYENNE"],
  ["ele_15", "5580 6015 00", "Capteur électrique de niveau bas d'eau de radiateur", 6, 24, "Capteur niveau d'eau", "Flotteur", "PIECE", 380, "HAUTE"],
  ["ele_16", "5580 6016 00", "Capteur inductif de vitesse de rotation arbre boîte", 6, 24, "Sonde vitesse", "Inductif M18", "PIECE", 620, "HAUTE"],
  ["ele_19", "5580 6019 00", "Monostick de direction mécanique", 6, 25, "Monostick direction", "Mécanique", "PIECE", 8200, "CRITIQUE"],
  ["ele_20", "5580 6020 00", "Soufflet de protection élastomère pour monostick de direction", 6, 25, "Soufflet monostick", "Néoprène étanche", "PIECE", 160, "BASSE"],
  ["ele_21", "5580 6021 00", "Faisceau électrique de liaison console de canopy complet", 6, 24, "Faisceau électrique", "Gaine blindée", "PIECE", 4800, "HAUTE"],
  ["ele_22", "5580 6022 00", "Klaxon de sécurité puissant 24V escargot", 6, 21, "Klaxon escargot", "24V robuste", "PIECE", 240, "HAUTE"],
  ["ele_24", "5580 6024 00", "Éclairage intérieur de canopy à LED étanche IP66", 6, 26, "Plafonnier LED", "IP66 24V", "PIECE", 340, "BASSE"],
  ["ele_25", "5580 6025 00", "Siège conducteur latéral simple fixe avec ceinture", 6, 26, "Siège simple", "Latéral standard", "PIECE", 8500, "HAUTE"],
  ["ele_26", "5580 6026 00", "Toit de protection métallique supérieur canopy ROPS/FOPS", 6, 26, "Toit canopy", "ROPS/FOPS", "PIECE", 12000, "CRITIQUE"],
  ["ele_27", "5580 6027 00", "Montant d'arceau de structure de canopy avant gauche", 6, 26, "Montant canopy AV G", "Acier profilé", "PIECE", 4200, "CRITIQUE"],
  ["ele_28", "5580 6028 00", "Montant d'arceau de structure de canopy avant droit", 6, 26, "Montant canopy AV D", "Acier profilé", "PIECE", 4200, "CRITIQUE"],
  ["ele_29", "5580 6029 00", "Montant d'arceau de structure de canopy arrière gauche", 6, 26, "Montant canopy AR G", "Acier profilé", "PIECE", 4200, "CRITIQUE"],
  ["ele_30", "5580 6030 00", "Montant d'arceau de structure de canopy arrière droit", 6, 26, "Montant canopy AR D", "Acier profilé", "PIECE", 4200, "CRITIQUE"],
  ["ele_31", "5580 6031 00", "Grille de sécurité métallique avant pour canopy", 6, 26, "Grille de sécurité", "Acier zingué", "PIECE", 2800, "HAUTE"],
  ["ele_32", "5580 6032 00", "Grille de sécurité métallique arrière pour canopy", 6, 26, "Grille de sécurité", "Acier zingué", "PIECE", 2600, "HAUTE"],
  ["ele_34", "5580 6034 00", "Support métallique articulé noir pour miroir", 6, 26, "Support miroir", "Acier noir articulé", "PIECE", 190, "BASSE"],
  ["ele_35", "5580 6035 00", "Alternateur de rechange Cummins ventilateur courroie", 6, 22, "Courroie alternateur", "Standard", "PIECE", 450, "HAUTE"],

  // SOU-SYSTÈME 7 : CHÂSSIS, STRUCTURE & LIAISON (40 pièces)
  ["cha_01", "0428 7011 00", "Axe d'articulation centrale supérieur ST2G", 7, 27, "Axe central supérieur", "Acier trempé rectifié", "PIECE", 6800, "CRITIQUE"],
  ["cha_02", "0428 7011 01", "Axe d'articulation centrale inférieur ST2G", 7, 27, "Axe central inférieur", "Acier trempé rectifié", "PIECE", 7200, "CRITIQUE"],
  ["cha_03", "0428 7012 00", "Roulement à rotule supérieur d'articulation", 7, 27, "Roulement rotule SUP", "SKF GE80", "PIECE", 3400, "CRITIQUE"],
  ["cha_04", "0428 7012 01", "Roulement à rotule inférieur d'articulation", 7, 27, "Roulement rotule INF", "SKF GE80", "PIECE", 3400, "CRITIQUE"],
  ["cha_05", "0428 7014 00", "Bague d'usure de guidage d'articulation en bronze", 7, 27, "Bague bronze", "Bronze à collerette", "PIECE", 850, "HAUTE"],
  ["cha_06", "0428 7013 00", "Joint racleur d'étanchéité d'articulation centrale", 7, 27, "Joint d'articulation", "Élastomère", "PIECE", 290, "HAUTE"],
  ["cha_07", "0428 7011 10", "Kit complet d'articulation centrale ST2G", 7, 27, "Kit pivot central", "Avec pivots et cales", "KIT", 18500, "CRITIQUE"],
  ["cha_08", "0428 7001 05", "Axe de pied de bras de levage benne avant", 7, 28, "Axe de levage bras", "Acier trempé rectifié", "PIECE", 4200, "HAUTE"],
  ["cha_09", "0428 7001 06", "Axe de basculement de benne / godet", 7, 28, "Axe godet", "Acier trempé rectifié", "PIECE", 5400, "HAUTE"],
  ["cha_10", "0428 7001 07", "Bague d'usure en bronze de bras de levage principal", 7, 28, "Bague de bras", "Bronze fritté", "PIECE", 1100, "HAUTE"],
  ["cha_11", "0428 7001 08", "Bague de pivotement de benne côté godet", 7, 28, "Bague de godet", "Bronze fritté", "PIECE", 1250, "HAUTE"],
  ["cha_12", "0428 7019 00", "Marchepied métallique inférieur antidérapant d'accès", 7, 28, "Marchepied accès", "Acier antidérapant", "PIECE", 1100, "MOYENNE"],
  ["cha_13", "0428 7019 01", "Poignée d'accès canopy robuste en acier forgé", 7, 28, "Poignée d'accès", "Acier forgé", "PIECE", 240, "HAUTE"],
  ["cha_14", "0428 7015 00", "Butée de fin de course de bras en élastomère", 7, 28, "Butée de bras", "Élastomère 80 Sh", "PIECE", 320, "HAUTE"],
  ["cha_15", "0428 7030 00", "Grille de protection métallique de phare LED avant", 7, 28, "Grille phare LED", "Acier zingué", "PIECE", 420, "MOYENNE"],
  ["cha_16", "0428 7034 00", "Crochet de remorquage renforcé avant soudable", 7, 28, "Crochet de traction", "Acier forgé 25T", "PIECE", 1650, "MOYENNE"],
  ["cha_17", "0428 7011 05", "Rotule d'accouplement de biellette de direction", 7, 28, "Rotule de direction", "Acier trempé", "PIECE", 850, "CRITIQUE"],
  ["cha_18", "0428 7011 06", "Tresse métallique de mise à la masse en cuivre", 7, 28, "Tresse de masse", "Cuivre souple L:400", "PIECE", 160, "HAUTE"],
  ["cha_19", "0428 7027 05", "Bouchon de verrouillage à clé du réservoir gazole", 7, 28, "Bouchon de réservoir", "À clé", "PIECE", 340, "MOYENNE"],
  ["cha_20", "0428 7027 06", "Profilé d'étanchéité de capot moteur en EPDM", 7, 28, "Joint de capot", "EPDM armé L:6m", "METRE", 95, "BASSE"],
  ["cha_21", "0428 7027 07", "Vérin à gaz d'équilibrage et levage de capot moteur", 7, 28, "Vérin de capot", "Ressort à gaz 400N", "PIECE", 320, "BASSE"],
  ["cha_22", "0428 7011 15", "Kit complet de visserie et cales d'articulation", 7, 27, "Visserie d'articulation", "Vis Classe 12.9", "KIT", 1450, "HAUTE"],
  ["cha_23", "0428 7011 16", "Chape d'accouplement de tige de vérin de direction", 7, 28, "Chape de vérin", "Acier forgé", "PIECE", 2100, "HAUTE"],
  ["cha_24", "0428 7011 17", "Butée réglable de limitation d'angle de braquage", 7, 28, "Butée de braquage", "Acier trempé M24", "PIECE", 450, "HAUTE"],
  ["cha_25", "0428 7011 18", "Collier bride de guidage rigide de flexibles de bras", 7, 28, "Bride flexibles", "Polyamide double", "PIECE", 180, "MOYENNE"],
  ["cha_26", "0428 7015 10", "Flexible HP de déport de graissage d'articulation", 7, 27, "Flexible graissage", "DN02 HP L:600", "PIECE", 210, "BASSE"],
  ["cha_27", "0428 7038 00", "Plaque de protection inférieure avant (Blindage)", 7, 28, "Plaque de blindage", "Acier 15mm", "PIECE", 5400, "MOYENNE"],
  ["cha_28", "0428 7038 01", "Vis à tête fraisée de fixation de blindage M16x45", 7, 28, "Vis de blindage", "Classe 10.9 M16", "PIECE", 45, "MOYENNE"],
  ["cha_29", "0428 7038 02", "Grenouillère métallique cadenassable de capots", 7, 28, "Grenouillère capot", "Inox cadenassable", "PIECE", 160, "BASSE"],
  ["cha_30", "5580 7001 00", "Balise flash de signalisation LED de recul IP67", 7, 28, "Balise flash", "LED 24V IP67", "PIECE", 680, "HAUTE"],
  ["cha_31", "0428 7001 00", "Cadre de châssis mécano-soudé avant ST2G", 7, 28, "Châssis avant", "Acier mécano-soudé", "PIECE", 28000, "CRITIQUE"],
  ["cha_32", "0428 7002 00", "Cadre de châssis mécano-soudé arrière ST2G", 7, 28, "Châssis arrière", "Acier mécano-soudé", "PIECE", 25000, "CRITIQUE"],
  ["cha_33", "0428 7002 01", "Charnière renforcée pour capot moteur", 7, 28, "Charnière capot", "Acier forgé", "PIECE", 380, "BASSE"],
  ["cha_34", "0428 7026 00", "Plaque métallique de protection de réservoir hyd.", 7, 28, "Protection réservoir hyd", "Acier 8mm", "PIECE", 3800, "HAUTE"],
  ["cha_35", "0428 7027 00", "Plaque métallique de protection de réservoir gazole", 7, 28, "Protection réservoir fuel", "Acier 8mm", "PIECE", 3400, "HAUTE"],
  ["cha_36", "0428 7024 00", "Support d'aile de garde-boue avant gauche/droit", 7, 28, "Support garde-boue AV", "Acier", "PIECE", 1200, "BASSE"],
  ["cha_37", "0428 7025 00", "Support d'aile de garde-boue arrière gauche/droit", 7, 28, "Support garde-boue AR", "Acier", "PIECE", 1200, "BASSE"],
  ["cha_38", "0428 7007 00", "Traverse de renforcement de cadre de châssis", 7, 28, "Traverse châssis", "Acier lourd", "PIECE", 4500, "HAUTE"],
  ["cha_39", "0428 7001 12", "Goupille de verrouillage d'axe de pivotement", 7, 28, "Goupille d'axe", "Acier doux", "PIECE", 120, "MOYENNE"],
  ["cha_40", "0428 7015 15", "Graisseur droit à tête sphérique M10 articulation", 7, 27, "Graisseur M10", "Acier zingué droit", "PIECE", 15, "BASSE"]
];

export const ST2G_CATALOG: CatalogItem[] = RAW_ITEMS.map(([idSuffix, reference, designationRaw, catIndex, subCatIndex, component, subComponent, unit, price, criticality]) => {
  const cat = CATEGORIES[catIndex];
  const subCategory = SUB_CATEGORIES[subCatIndex];
  const designation = `[${cat.prefix}] - [${component.toUpperCase()}] - ${designationRaw}`;

  return {
    id: `st2g_${idSuffix}`,
    reference,
    designation,
    functionalCategory: cat.name,
    subCategory,
    component,
    subComponent,
    unit,
    price,
    proposedPrice: price,
    compatibility: "Epiroc Scooptram ST2G",
    criticality,
    suggestedType: "ENGINS"
  };
});
