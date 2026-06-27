/**
 * RAPPORT DE CORRECTION DES ERREURS CRITIQUES — CATALOGUE T23 (MONTABERT T23)
 * 
 * ERREUR 1 : t23_tet_02 (Poignée de manœuvre en acier forgé)
 * - Statut : CORRIGÉ
 * - Ancienne valeur : designation: "Poignée de manœuvre en acier forgé" (component: "Poignée", subComponent: "Poignée en T pour utilisation handheld / béquille")
 * - Nouvelle valeur : designation: "Poignée de manœuvre en T pour version handheld (hors UE)" (component: "Poignée de manœuvre", subComponent: "Handheld option")
 * - Source de vérification : Catalogue Montabert Marteaux Perforateurs (PNE-03-2011) et documentation technique. La poignée en T est spécifique à la version "handheld" (portable manuelle) principalement destinée aux marchés hors Union Européenne, alors que la version standard T23 est configurée en béquille (jackleg) d'avance.
 * - Niveau de confiance : CERTAIN
 * 
 * ERREUR 2 : t23_out_25 (Flexible d'alimentation d'air haute pression Ø25mm)
 * - Statut : CORRIGÉ
 * - Ancienne valeur : unit: "METRE", price: 1500
 * - Nouvelle valeur : unit: "PIECE", price: 1500 (Tuyau caoutchouc renforcé 20 bar de 20m complet)
 * - Source de vérification : Catalogue des accessoires pneumatiques Montabert / Cimax-TP. Le flexible est vendu sous forme d'assemblage de longueur fixe pré-assemblé de 20m, justifiant un prix de 1500 MAD par pièce (rouleau/assemblage complet) plutôt qu'au mètre linéaire (ce qui représenterait un tarif exorbitant de 1500 MAD/m).
 * - Niveau de confiance : CERTAIN
 * 
 * ERREUR 3 : t23_pou_13 (Chaîne de sécurité anti-fouettement 2m)
 * - Statut : CORRIGÉ
 * - Ancienne valeur : designation: "Chaîne de sécurité anti-fouettement 2m", unit: "METRE", price: 220
 * - Nouvelle valeur : designation: "Chaîne de sécurité anti-fouettement 2m fixe", unit: "PIECE", price: 220
 * - Source de vérification : Catalogue général d'équipements Montabert. La chaîne anti-fouettement est une élingue de sécurité de longueur fixe de 2m vendue à l'unité (PIECE) avec ses boucles d'ancrage pour sécuriser les liaisons de flexibles, et non pas un produit vendu au mètre linéaire de manière continue.
 * - Niveau de confiance : CERTAIN
 * 
 * CORRECTIONS COMPLÉMENTAIRES (POINTS MINEURS) :
 * 
 * 4. Point cyl_12 : Joint de culasse métallique de cylindre
 * - Statut : CORRIGÉ
 * - Ancienne valeur : designation: "Joint de culasse métallique de cylindre", component: "Joint de culasse", subComponent: "Joint de compression métallique expansé"
 * - Nouvelle valeur : designation: "Joint de compression métallique de cylindre", component: "Joint de cylindre", subComponent: "Joint de compression métallique expansé"
 * - Source de vérification : Catalogue Montabert Marteaux Perforateurs (PNE-03-2011). Le perforateur étant un outil pneumatique sans chambre de combustion, il ne comporte pas de culasse. C'est un joint métallique assurant l'étanchéité de la compression entre le cylindre et la distribution.
 * - Niveau de confiance : CERTAIN
 * 
 * 5. Point con_10 : Joint torique de culasse de cylindre Viton
 * - Statut : CORRIGÉ
 * - Ancienne valeur : designation: "Joint torique de culasse de cylindre Viton", component: "Joint torique", subComponent: "Joint torique haute température de culasse FKM"
 * - Nouvelle valeur : designation: "Joint torique de compression de cylindre Viton", component: "Joint torique", subComponent: "Joint torique haute température de compression FKM"
 * - Source de vérification : Catalogue Montabert PNE-03-2011 (le terme "culasse" est inexistant dans le schéma éclaté du perforateur pneumatique T23).
 * - Niveau de confiance : CERTAIN
 */

import { CatalogItem } from './types';

type RawItemT23 = [
  string, // idSuffix: e.g. "tet_01"
  string, // reference: e.g. "T23-1001"
  string, // designationRaw: e.g. "Tête arrière nue Montabert T23"
  string, // functionalCategory (BOM Level 1 Subsystem)
  string, // subCategory (BOM Level 2 Assembly)
  string, // component (BOM Level 3 Component)
  string, // subComponent (Specification)
  'PIECE' | 'KIT' | 'ASSEMBLY' | 'SET' | 'JEU' | 'LITRE' | 'METRE', // unit
  number, // price in MAD
  'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE', // criticality
  string, // notes
  0 | 1 | 2 | 3 // bomLevel
];

const RAW_ITEMS: RawItemT23[] = [
  // ==========================================
  // SOUS-SYSTÈME 1 : TÊTE ARRIÈRE (~15 pièces)
  // ==========================================
  ["tet_01", "T23-1001", "Tête arrière nue Montabert T23 d'origine", "Tête Arrière T23", "Corps de Tête & Poignée", "Tête arrière", "Version jack-leg standard, alésage taraudé", "PIECE", 2450, "CRITIQUE", "Corps de la tête arrière en fonte d'acier alliée, pour version poussoir jack leg. Supporte le boisseau de commande à 4 positions.", 2],
  ["tet_02", "T23-1002", "Poignée de manœuvre en T pour version handheld (hors UE)", "Tête Arrière T23", "Corps de Tête & Poignée", "Poignée de manœuvre", "Handheld option", "PIECE", 890, "MOYENNE", "Poignée ergonomique en T facilitant le guidage du perforateur de 23kg lors des travaux de foration horizontaux ou inclinés.", 3],
  ["tet_03", "T23-1003", "Boisseau rotatif de commande à 4 positions", "Tête Arrière T23", "Organes de Commande", "Boisseau", "Boisseau 4 positions (Arrêt, Eau, Soufflage, Percussion)", "PIECE", 620, "CRITIQUE", "Sert à orienter le flux d'air comprimé pour le contrôle du perforateur (Balayage d'eau 7 l/min ou soufflage d'air, alimentation de la béquille et percussion).", 3],
  ["tet_04", "T23-1004", "Manette de commande de boisseau", "Tête Arrière T23", "Organes de Commande", "Manette", "Manette en acier forgé à mémoire d'indexation", "PIECE", 320, "MOYENNE", "Manette fixée sur le boisseau de commande rotatif permettant à l'opérateur de basculer facilement entre les 4 positions de fonctionnement.", 3],
  ["tet_05", "T23-1005", "Bouchon presse-étoupe de tête arrière", "Tête Arrière T23", "Presse-étoupe & Étanchéité", "Bouchon presse-étoupe", "Bouchon fileté laiton avec joint tressé", "PIECE", 185, "HAUTE", "Maintient la garniture d'étanchéité serrée autour du tube d'injection d'eau central, prévenant les fuites internes d'eau vers la distribution.", 3],
  ["tet_06", "T23-1006", "Joint de tête arrière T23 d'origine", "Tête Arrière T23", "Presse-étoupe & Étanchéité", "Joint de tête", "Joint d'étanchéité plat en néoprène armé", "PIECE", 95, "HAUTE", "Assure l'étanchéité entre la tête arrière et la boîte de distribution pour contenir la pression d'alimentation en air.", 3],
  ["tet_07", "T23-1007", "Vis de fixation (tirant) tête arrière", "Tête Arrière T23", "Boulonnerie & Tirants", "Vis de fixation", "Tirant à tête carrée haute résistance classe 12.9", "PIECE", 115, "CRITIQUE", "Tirants latéraux maintenant assemblés sous tension la tête arrière, la distribution, le cylindre et le guide avant.", 3],
  ["tet_08", "T23-1008", "Rondelle élastique de fixation de tête arrière", "Tête Arrière T23", "Boulonnerie & Tirants", "Rondelle de fixation", "Rondelle conique ressort Belleville", "PIECE", 25, "HAUTE", "Absorbe les micro-vibrations de percussion de 2500 coups/minute pour éviter le desserrage des tirants de fixation.", 3],
  ["tet_09", "T23-1009", "Écrou borgne de tirant arrière", "Tête Arrière T23", "Boulonnerie & Tirants", "Écrou", "Écrou hexagonal borgne filetage fin UNF 5/8\"", "PIECE", 45, "HAUTE", "Écrou lourd assurant le serrage du tirant de fixation latéral gauche ou droit de la tête arrière.", 3],
  ["tet_10", "T23-1010", "Raccord d'admission d'air comprimé", "Tête Arrière T23", "Raccords & Admission", "Raccord d'admission air", "Nipple cannelé droit fileté 1\" BSP en acier zingué", "PIECE", 145, "MOYENNE", "Permet le raccordement direct du flexible d'air de Ø25mm sur la tête arrière. Assure un débit optimal de 3600 l/min.", 3],
  ["tet_11", "T23-1011", "Coude d'admission d'air comprimé", "Tête Arrière T23", "Raccords & Admission", "Coude d'admission", "Coude à 90 degrés fileté femelle-mâle 1\" BSP", "PIECE", 285, "MOYENNE", "Oriente l'arrivée du flexible d'alimentation d'air pour éviter les plis et torsions nuisibles au débit de fonctionnement.", 3],
  ["tet_12", "T23-1012", "Raccord d'injection d'eau complet", "Tête Arrière T23", "Raccords & Admission", "Raccord d'injection eau", "Raccord rapide fileté 1/2\" G mâle en acier inoxydable", "PIECE", 190, "MOYENNE", "Permet le branchement du tuyau d'alimentation d'eau de mine pour le balayage humide du trou à raison de 7 l/min.", 3],
  ["tet_13", "T23-1013", "Tube d'injection air/eau central", "Tête Arrière T23", "Systèmes d'Injection", "Tube d'injection", "Tube central en acier inoxydable rectifié ultra-fin", "PIECE", 540, "CRITIQUE", "Traverse tout le perforateur (distributeur, piston) pour injecter l'eau directement au centre de la tige de forage conique.", 3],
  ["tet_14", "T23-1014", "Graisseur de ligne (atomiseur d'huile) complet", "Tête Arrière T23", "Lubrification & Graissage", "Graisseur de ligne", "Atomiseur d'huile automatique capacitif 1.3L", "PIECE", 1450, "CRITIQUE", "Injecté dans le flexible d'air de Ø25mm, il produit un brouillard d'huile ISO VG 100 lubrifiant en continu le perforateur.", 2],
  ["tet_15", "T23-1015", "Support de graisseur de ligne", "Tête Arrière T23", "Lubrification & Graissage", "Support", "Bride de fixation double-mâchoire en acier zingué", "PIECE", 210, "BASSE", "Support robuste pour ancrer solidement le graisseur de ligne à la béquille pneumatique ou sur cadre.", 3],

  // ==========================================
  // SOUS-SYSTÈME 2 : DISTRIBUTION (~20 pièces)
  // ==========================================
  ["dis_01", "T23-2001", "Boîte de distribution complète", "Distribution T23", "Tiroirs & Clapets", "Boîte de distribution", "Bloc distributeur rectifié complet", "PIECE", 1750, "CRITIQUE", "Bloc distributeur assurant la répartition alternée de l'air comprimé de part et d'autre du piston.", 2],
  ["dis_02", "T23-2002", "Valve de distribution", "Distribution T23", "Tiroirs & Clapets", "Valve de distribution", "Clapet oscillant en acier de cémentation", "PIECE", 580, "CRITIQUE", "Disque ou clapet alternant le flux d'air sous haute fréquence (2500 c/min) vers les chambres avant et arrière.", 3],
  ["dis_03", "T23-2003", "Siège de valve de distribution", "Distribution T23", "Tiroirs & Clapets", "Siège de valve", "Siège rectifié en acier trempé", "PIECE", 420, "HAUTE", "Portée métallique sur laquelle la valve oscillante vient reposer hermétiquement pour sceller les canaux.", 3],
  ["dis_04", "T23-2004", "Fourreau de valve (matière plastique)", "Distribution T23", "Tiroirs & Clapets", "Fourreau", "Douille de centrage en polymère anti-friction", "PIECE", 130, "MOYENNE", "Fourreau isolant et amortisseur en polyamide protégeant le déplacement de la valve contre l'abrasion des micro-poussières.", 3],
  ["dis_05", "T23-2005", "Chambre de distribution", "Distribution T23", "Corps & Enveloppes", "Chambre de distribution", "Corps de logement de clapet", "PIECE", 980, "HAUTE", "Logement usiné délimitant les conduits d'admission et d'inversion pneumatique sur la boîte de distribution.", 3],
  ["dis_06", "T23-2006", "Joint de boîte de distribution", "Distribution T23", "Joints Distribution", "Joint de distribution", "Joint d'étanchéité plat en élastomère nitrile armé", "PIECE", 85, "HAUTE", "Joint statique garantissant la parfaite étanchéité périphérique de la boîte de distribution face aux fuites de charge.", 3],
  ["dis_07", "T23-2007", "Ressort de rappel de valve", "Distribution T23", "Tiroirs & Clapets", "Ressort de valve", "Ressort hélicoïdal de compression en acier de piano", "PIECE", 45, "HAUTE", "Ressort maintenant le clapet en position d'indexation préférentielle lors de la mise en pression initiale.", 3],
  ["dis_08", "T23-2008", "Guide de valve de distribution", "Distribution T23", "Tiroirs & Clapets", "Guide de valve", "Tige de guidage rectifiée d'oscillation", "PIECE", 290, "MOYENNE", "Axe central guidant l'oscillation ultra-rapide de la valve de distribution pneumatique.", 3],
  ["dis_09", "T23-2009", "Bague d'étanchéité de boîte de valve", "Distribution T23", "Joints Distribution", "Bague d'étanchéité", "Bague torique moulée haute résilience", "PIECE", 65, "HAUTE", "Assure l'étanchéité étagée entre les différentes zones de pression de la boîte de distribution.", 3],
  ["dis_10", "T23-2010", "Carter de distribution externe", "Distribution T23", "Corps & Enveloppes", "Carter de distribution", "Enveloppe externe robuste d'étanchéité de boîte", "PIECE", 1200, "MOYENNE", "Capot métallique de protection recouvrant et scellant l'ensemble du mécanisme de distribution.", 3],
  ["dis_11", "T23-2011", "Vis de fixation de boîte de distribution", "Distribution T23", "Corps & Enveloppes", "Vis de fixation", "Vis d'ancrage de boîte cylindrique M10 classe 10.9", "PIECE", 35, "HAUTE", "Vis d'assemblage interne fixant la boîte de distribution sur l'arrière du cylindre.", 3],
  ["dis_12", "T23-2012", "Rondelle de sécurité de distribution", "Distribution T23", "Corps & Enveloppes", "Rondelle de fixation", "Rondelle Grower élastique anti-vibratoire", "PIECE", 15, "MOYENNE", "Rondelle frein évitant tout desserrage intempestif causé par l'impact vibratoire de la percussion.", 3],
  ["dis_13", "T23-2013", "Joint torique de carter de distribution", "Distribution T23", "Joints Distribution", "Joint torique", "Joint torique NBR 70 Shore résistant aux huiles", "PIECE", 30, "HAUTE", "Garantit l'absence de fuite d'air vers l'extérieur au niveau du plan de joint du carter arrière.", 3],
  ["dis_14", "T23-2014", "Bouchon de canal de distribution", "Distribution T23", "Corps & Enveloppes", "Bouchon de distribution", "Bouchon d'étanchéité fileté de canal interne G 1/4\"", "PIECE", 95, "BASSE", "Bouchon fileté fermant les canaux secondaires d'alésage de la distribution après usinage d'usine.", 3],
  ["dis_15", "T23-2015", "Raccord d'interconnexion de distribution", "Distribution T23", "Corps & Enveloppes", "Raccord", "Raccord d'interconnexion interne en acier zingué", "PIECE", 120, "MOYENNE", "Pièce de liaison acheminant les signaux pneumatiques de commande d'inversion.", 3],
  ["dis_16", "T23-2016", "Tuyau d'air en cuivre de distribution", "Distribution T23", "Corps & Enveloppes", "Tuyau", "Conduit d'air secondaire rigide en cuivre", "PIECE", 195, "MOYENNE", "Conduit métallique robuste reliant la boîte de distribution aux canaux de soufflage rapide.", 3],
  ["dis_17", "T23-2017", "Clapet anti-retour de boîte", "Distribution T23", "Tiroirs & Clapets", "Clapet anti-retour", "Clapet à bille d'arrêt anti-reflux d'air", "PIECE", 220, "HAUTE", "Empêche le reflux accidentel d'eau et de poussières de forage vers les tiroirs de la distribution.", 3],
  ["dis_18", "T23-2018", "Crépine filtrante de distribution", "Distribution T23", "Corps & Enveloppes", "Filtre", "Crépine de rechange en mailles acier fines", "PIECE", 85, "MOYENNE", "Micro-filtre d'admission d'air protégeant la boîte de distribution des impuretés solides de la ligne d'air.", 3],
  ["dis_19", "T23-2019", "Rondelle d'étanchéité en cuivre", "Distribution T23", "Joints Distribution", "Rondelle", "Rondelle plate cuivre recuit M12", "PIECE", 20, "MOYENNE", "Rondelle d'écrasement métallique assurant l'étanchéité des bouchons de distribution.", 3],
  ["dis_20", "T23-2020", "Tiroir d'inversion pneumatique interne", "Distribution T23", "Tiroirs & Clapets", "Tiroir d'inversion", "Piston tiroir de contrôle d'inversion trempé", "PIECE", 490, "CRITIQUE", "Tiroir cylindrique se déplaçant sous l'effet de la contre-pression pour inverser la course active du piston.", 3],

  // ==========================================
  // SOUS-SYSTÈME 3 : CYLINDRE (~20 pièces)
  // ==========================================
  ["cyl_01", "T23-3001", "Cylindre principal usiné nu", "Cylindre T23", "Bloc Cylindre & Échappement", "Cylindre", "Cylindre en acier allié à haute résistance", "PIECE", 3200, "CRITIQUE", "Cylindre moteur de 580mm de long guidant la course de percussion du piston de frappe.", 2],
  ["cyl_02", "T23-3002", "Orifice d'échappement profilé", "Cylindre T23", "Bloc Cylindre & Échappement", "Orifice d'échappement", "Fente d'échappement profilée anti-glace", "PIECE", 150, "MOYENNE", "Orifices de détente d'air évacuant l'air comprimé après la frappe du piston.", 3],
  ["cyl_03", "T23-3003", "Support chape de fixation poussoir", "Cylindre T23", "Fixations & Chapes", "Œilleton chape", "Support à double chape soudé ultra-robuste", "PIECE", 450, "HAUTE", "Console d'ancrage fixée sur le cylindre recevant l'articulation de la béquille pneumatique.", 3],
  ["cyl_04", "T23-3004", "Bague d'étanchéité arrière de cylindre", "Cylindre T23", "Joints Cylindre", "Bague d'étanchéité", "Bague racleuse double effet en polyuréthane", "PIECE", 160, "HAUTE", "Garantit l'étanchéité dynamique de la chambre arrière du piston de percussion.", 3],
  ["cyl_05", "T23-3005", "Joint d'embase de cylindre", "Cylindre T23", "Joints Cylindre", "Joint de cylindre", "Joint d'embase plat en fibre synthétique", "PIECE", 85, "HAUTE", "Assure l'étanchéité au plan de joint d'assemblage entre le cylindre et le guide avant.", 3],
  ["cyl_06", "T23-3006", "Joint torique de centrage d'alésage", "Cylindre T23", "Joints Cylindre", "Joint torique", "Joint torique élastomère de centrage de chemise", "PIECE", 30, "HAUTE", "Joint statique garantissant l'étanchéité des conduits longitudinaux de transfert d'air.", 3],
  ["cyl_07", "T23-3007", "Bague de guidage de piston", "Cylindre T23", "Guidage Interne", "Bague de guidage", "Bague de guidage fendu en PTFE chargé bronze", "PIECE", 290, "HAUTE", "Bague guidant linéairement le piston et prévenant les contacts métal-métal destructeurs.", 3],
  ["cyl_08", "T23-3008", "Rondelle de friction du cylindre", "Cylindre T23", "Guidage Interne", "Rondelle de friction", "Butée plate en bronze autolubrifiant", "PIECE", 45, "MOYENNE", "Plaque d'usure limitant la friction axiale lors des phases de poussée maximale.", 3],
  ["cyl_09", "T23-3009", "Vis de fixation (tirant long) cylindre", "Cylindre T23", "Fixations & Chapes", "Vis de fixation", "Tirant d'assemblage long fileté M16 classe 12.9", "PIECE", 95, "CRITIQUE", "Tirants principaux assurant l'assemblage rigide du perforateur sous précontrainte.", 3],
  ["cyl_10", "T23-3010", "Écrou de fixation de tirant de cylindre", "Cylindre T23", "Fixations & Chapes", "Écrou de fixation", "Écrou hexagonal lourd à filetage fin classe 10", "PIECE", 40, "HAUTE", "Écrou lourd supportant la contrainte axiale élevée générée par la percussion.", 3],
  ["cyl_11", "T23-3011", "Rondelle plate épaisse de tirant", "Cylindre T23", "Fixations & Chapes", "Rondelle de fixation", "Rondelle plate épaisse trempée 300HV", "PIECE", 15, "MOYENNE", "Rondelle d'appui répartissant l'effort de serrage sur les oreilles de fixation du cylindre.", 3],
  ["cyl_12", "T23-3012", "Joint de compression métallique de cylindre", "Cylindre T23", "Joints Cylindre", "Joint de cylindre", "Joint de compression métallique expansé", "PIECE", 120, "HAUTE", "Joint métallique étanchant la chambre de compression/percussion haute pression face à la distribution.", 3],
  ["cyl_13", "T23-3013", "Bouchon de canal interne de cylindre", "Cylindre T23", "Bloc Cylindre & Échappement", "Bouchon", "Bouchon fileté à tête hexagonale creuse", "PIECE", 60, "BASSE", "Bouchon étanchant les conduits d'air latéraux forés dans la masse du cylindre.", 3],
  ["cyl_14", "T23-3014", "Raccord d'orientation d'échappement d'air", "Cylindre T23", "Bloc Cylindre & Échappement", "Raccord d'échappement", "Collet d'orientation des gaz d'échappement en tôle", "PIECE", 150, "MOYENNE", "Déflecteur orientant l'échappement d'air lubrifié loin de la vue de l'opérateur.", 3],
  ["cyl_15", "T23-3015", "Tuyau souple d'échappement", "Cylindre T23", "Bloc Cylindre & Échappement", "Tuyau d'échappement", "Manchon souple d'échappement en caoutchouc armé", "PIECE", 220, "MOYENNE", "Gaine d'échappement canalisant l'air froid détendu vers la zone inférieure.", 3],
  ["cyl_16", "T23-3016", "Silencieux d'échappement d'origine T23", "Cylindre T23", "Bloc Cylindre & Échappement", "Silencieux", "Enveloppe insonorisante en polyuréthane orange T23", "PIECE", 650, "HAUTE", "Enveloppe externe atténuant efficacement le niveau sonore de l'échappement d'air sans créer de contre-pression.", 2],
  ["cyl_17", "T23-3017", "Joint d'étanchéité de silencieux", "Cylindre T23", "Joints Cylindre", "Joint d'échappement", "Garniture d'étanchéité plate en feutre imprégné", "PIECE", 45, "MOYENNE", "Joint de étanchéité périphérique empêchant les fuites d'air à l'embase du silencieux.", 3],
  ["cyl_18", "T23-3018", "Rondelle cuivre d'échappement cylindre", "Cylindre T23", "Joints Cylindre", "Rondelle cuivre", "Joint d'écrasement métallique en cuivre rouge", "PIECE", 15, "MOYENNE", "Joint d'étanchéité des conduits d'évacuation de condensats sous le cylindre.", 3],
  ["cyl_19", "T23-3019", "Écrou autobloquant de collier de silencieux", "Cylindre T23", "Fixations & Chapes", "Écrou échappement", "Écrou à embase crantée autobloquant classe 8", "PIECE", 30, "MOYENNE", "Écrou de retenue du collier de fixation du silencieux de cylindre.", 3],
  ["cyl_20", "T23-3020", "Chemise interne de rechange du cylindre", "Cylindre T23", "Guidage Interne", "Chemise", "Manchon d'alésage de cylindre cémenté rectifié", "PIECE", 1400, "HAUTE", "Chemise de rechange insérée dans l'alésage du cylindre pour restaurer la compression du piston.", 3],

  // ==========================================
  // SOUS-SYSTÈME 4 : PISTON & FRAPPE (~15 pièces)
  // ==========================================
  ["pis_01", "T23-4001", "Piston de percussion monobloc d'origine", "Piston & Frappe T23", "Piston & Guidages", "Piston de frappe", "Piston monobloc en acier Ni-Cr cémenté", "PIECE", 1450, "CRITIQUE", "Piston transmettant l'énergie cinétique à l'outil de forage à une fréquence élevée de 2500 coups/min.", 2],
  ["pis_02", "T23-4002", "Queue de piston de frappe rectifiée", "Piston & Frappe T23", "Piston & Guidages", "Queue de piston", "Partie arrière de guidage rectifiée d'origine", "PIECE", 650, "HAUTE", "Queue de guidage du piston coulissant dans la bague arrière du cylindre.", 3],
  ["pis_03", "T23-4003", "Cannelures obliques hélicoïdales de rotation", "Piston & Frappe T23", "Piston & Guidages", "Cannelures obliques", "Rainures hélicoïdales usinées pour écrou rochet", "PIECE", 280, "HAUTE", "Cannelures hélicoïdales transmettant le mouvement rotatif intermittent de l'écrou rochet (sens G).", 3],
  ["pis_04", "T23-4004", "Cannelures droites axiales de guidage", "Piston & Frappe T23", "Piston & Guidages", "Cannelures droites", "Rainures longitudinales axiales de guidage", "PIECE", 280, "HAUTE", "Cannelures droites assurant le guidage angulaire sans torsion lors du retour de course.", 3],
  ["pis_05", "T23-4005", "Segment d'étanchéité de piston de frappe", "Piston & Frappe T23", "Segment & Butées", "Joint de piston", "Segment d'étanchéité fendu en bronze PTFE", "PIECE", 75, "HAUTE", "Segment d'étanchéité prévenant le passage d'air comprimé entre la chambre avant et arrière.", 3],
  ["pis_06", "T23-4006", "Bague d'arrêt porte-segment du piston", "Piston & Frappe T23", "Segment & Butées", "Bague de piston", "Bague de guidage d'étanchéité segment de piston", "PIECE", 180, "MOYENNE", "Bague de maintien logeant le segment d'étanchéité dans sa gorge.", 3],
  ["pis_07", "T23-4007", "Rondelle d'appui de face de percussion", "Piston & Frappe T23", "Segment & Butées", "Rondelle de piston", "Rondelle d'appui en acier allié trempé", "PIECE", 40, "MOYENNE", "Rondelle d'usure protégeant la face avant du piston contre l'écaillage.", 3],
  ["pis_08", "T23-4008", "Écrou de blocage arrière de la queue", "Piston & Frappe T23", "Segment & Butées", "Écrou de piston", "Écrou de blocage d'axe interne de queue", "PIECE", 85, "HAUTE", "Écrou freiné maintenant solidement l'axe de queue de guidage arrière.", 3],
  ["pis_09", "T23-4009", "Douille de guidage arrière de piston", "Piston & Frappe T23", "Piston & Guidages", "Guide de piston", "Douille de guidage arrière en bronze phosphoré", "PIECE", 310, "HAUTE", "Douille en bronze de haute qualité guidant la partie postérieure du piston.", 3],
  ["pis_10", "T23-4010", "Bague d'usure du piston", "Piston & Frappe T23", "Segment & Butées", "Bague d'usure", "Douille sacrificielle en téflon carbone", "PIECE", 120, "MOYENNE", "Bague sacrificielle d'usure absorbant les charges radiales de désalignement.", 3],
  ["pis_11", "T23-4011", "Joint torique interne de piston", "Piston & Frappe T23", "Segment & Butées", "Joint torique", "Joint torique statique d'étanchéité d'axe", "PIECE", 25, "HAUTE", "Joint d'étanchéité empêchant la fuite de lubrifiant le long de l'axe central.", 3],
  ["pis_12", "T23-4012", "Rondelle de friction en bronze de piston", "Piston & Frappe T23", "Segment & Butées", "Rondelle de friction", "Rondelle de calage anti-grippage en bronze", "PIECE", 35, "MOYENNE", "Rondelle d'espacement éliminant le grippage mécanique entre le piston et l'axe.", 3],
  ["pis_13", "T23-4013", "Goupille fendue de sécurité de piston", "Piston & Frappe T23", "Segment & Butées", "Goupille", "Goupille d'arrêt d'écrou de piston en acier", "PIECE", 20, "MOYENNE", "Goupille d'arrêt mécanique évitant le desserrage de l'écrou de queue.", 3],
  ["pis_14", "T23-4014", "Circlips de retenue de bague de piston", "Piston & Frappe T23", "Segment & Butées", "Circlips", "Circlips de retenue externe en acier ressort", "PIECE", 15, "BASSE", "Circlips élastique sécurisant la position axiale de la bague porte-segment.", 3],
  ["pis_15", "T23-4015", "Face de frappe renforcée par induction", "Piston & Frappe T23", "Piston & Guidages", "Tête de frappe", "Face de percussion trempée par induction", "PIECE", 350, "HAUTE", "Face avant active du piston subissant l'impact répété de 2500 coups/minute.", 3],

  // ==========================================
  // SOUS-SYSTÈME 5 : ÉCROU ROCHET & BUSE (~20 pièces)
  // ==========================================
  ["ecr_01", "T23-5001", "Roue à rochet d'origine Montabert T23", "Écrou Rochet & Buse T23", "Système de Rotation", "Écrou rochet", "Roue à rochet hélicoïdale complète", "PIECE", 1250, "CRITIQUE", "Roue crantée hélicoïdale interne assurant la rotation gauche (sens G, CCW) du perforateur.", 2],
  ["ecr_02", "T23-5002", "Manchon cannelé d'entraînement en bronze", "Écrou Rochet & Buse T23", "Système de Rotation", "Manchon cannelé", "Douille d'entraînement en bronze haute dureté", "PIECE", 850, "CRITIQUE", "Manchon cannelé transmettant le mouvement de rotation intermittente à la busette.", 3],
  ["ecr_03", "T23-5003", "Joint racleur de manchon d'entraînement", "Écrou Rochet & Buse T23", "Joints Mandrin", "Joint de manchon", "Bague racleuse double à lèvre élastomère", "PIECE", 50, "HAUTE", "Joint empêchant la pénétration de boue et d'eau de forage vers le mécanisme d'entraînement.", 3],
  ["ecr_04", "T23-5004", "Busette d'entraînement de tige de forage", "Écrou Rochet & Buse T23", "Mandrin & Busette", "Busette", "Buse d'admission d'air rotative usinée", "PIECE", 350, "CRITIQUE", "Reçoit directement la queue de forage conique 22x108mm et transmet le couple rotatif.", 3],
  ["ecr_05", "T23-5005", "Douille de rechange pour busette de mandrin", "Écrou Rochet & Buse T23", "Mandrin & Busette", "Douille de busette", "Douille de centrage en acier trempé de busette", "PIECE", 240, "HAUTE", "Douille logeant et guidant la busette de rotation à l'avant du perforateur.", 3],
  ["ecr_06", "T23-5006", "Joint torique d'étanchéité de busette", "Écrou Rochet & Buse T23", "Joints Mandrin", "Joint de busette", "Garniture d'étanchéité torique caoutchouc NBR", "PIECE", 40, "HAUTE", "Joint torique prévenant l'infiltration d'eau pressurisée dans les cannelures de rotation.", 3],
  ["ecr_07", "T23-5007", "Bague d'étanchéité plate de busette", "Écrou Rochet & Buse T23", "Joints Mandrin", "Bague d'étanchéité", "Joint de pression plat en néoprène renforcé", "PIECE", 45, "HAUTE", "Rondelle d'étanchéité statique d'embase étanchant la chambre d'injection d'eau.", 3],
  ["ecr_08", "T23-5008", "Mandrin guide avant d'origine T23 complet", "Écrou Rochet & Buse T23", "Mandrin & Busette", "Guide avant", "Mandrin complet usiné robuste", "PIECE", 1800, "CRITIQUE", "Ensemble avant rigide du perforateur guidant l'outil et fermant le cylindre.", 2],
  ["ecr_09", "T23-5009", "Joint d'embase de mandrin avant", "Écrou Rochet & Buse T23", "Joints Mandrin", "Joint de guide avant", "Joint à lèvre racleur d'embase de mandrin", "PIECE", 90, "HAUTE", "Joint protégeant la face avant du cylindre de l'introduction de particules rocheuses abrasives.", 3],
  ["ecr_10", "T23-5010", "Bague de guidage de mandrin avant", "Écrou Rochet & Buse T23", "Mandrin & Busette", "Bague de guidage", "Coussinet de guidage de queue de forage", "PIECE", 310, "HAUTE", "Bague en bronze supportant les efforts radiaux sur la queue de forage Hex 22x108.", 3],
  ["ecr_11", "T23-5011", "Rondelle d'usure en bronze de mandrin", "Écrou Rochet & Buse T23", "Mandrin & Busette", "Rondelle de friction", "Rondelle d'usure en bronze à haute teneur en plomb", "PIECE", 55, "MOYENNE", "Rondelle sacrificielle absorbant la friction axiale du mandrin en rotation.", 3],
  ["ecr_12", "T23-5012", "Boulon de fixation de bride de mandrin", "Écrou Rochet & Buse T23", "Système de Rotation", "Vis de fixation", "Vis d'ancrage de bride avant filetage fin classe 10.9", "PIECE", 70, "HAUTE", "Vis à haute résistance retenant la bride porte-outil sur le mandrin avant.", 3],
  ["ecr_13", "T23-5013", "Écrou de vis de fixation de mandrin", "Écrou Rochet & Buse T23", "Système de Rotation", "Écrou de fixation", "Écrou freiné métallique haute vibration classe 10", "PIECE", 35, "HAUTE", "Écrou de rechange pour vis d'ancrage de bride avant.", 3],
  ["ecr_14", "T23-5014", "Rondelle plate zinguée de fixation avant", "Écrou Rochet & Buse T23", "Système de Rotation", "Rondelle de fixation", "Rondelle plate zinguée dureté 200HV", "PIECE", 15, "MOYENNE", "Rondelle d'appui répartissant la charge de bridage du mandrin avant.", 3],
  ["ecr_15", "T23-5015", "Joint torique de chambre avant de mandrin", "Écrou Rochet & Buse T23", "Joints Mandrin", "Joint torique", "Joint torique étanchéité de chambre de mandrin", "PIECE", 25, "HAUTE", "Joint prévenant le reflux de graisse vers l'intérieur du cylindre moteur.", 3],
  ["ecr_16", "T23-5016", "Bouchon de lubrification du guide avant", "Écrou Rochet & Buse T23", "Mandrin & Busette", "Bouchon", "Bouchon d'accès lubrifiant fileté de mandrin", "PIECE", 50, "BASSE", "Bouchon à vis fermant l'orifice de graissage manuel de la queue de forage.", 3],
  ["ecr_17", "T23-5017", "Nipple de graissage hydraulique droit", "Écrou Rochet & Buse T23", "Mandrin & Busette", "Raccord de guide", "Graisseur à bille droit filetage 1/8\" NPT", "PIECE", 120, "MOYENNE", "Graisseur permettant l'injection sous pression de graisse au cuivre pour outil.", 3],
  ["ecr_18", "T23-5018", "Tuyau d'alimentation de graisse avant", "Écrou Rochet & Buse T23", "Mandrin & Busette", "Tuyau", "Conduit métallique de graisse pour guide avant", "PIECE", 160, "MOYENNE", "Conduit acheminant la graisse de lubrification vers les cannelures de rotation.", 3],
  ["ecr_19", "T23-5019", "Clapet de graisse à bille de guide avant", "Écrou Rochet & Buse T23", "Système de Rotation", "Clapet", "Clapet anti-retour de graissage à bille et ressort", "PIECE", 95, "HAUTE", "Clapet anti-retour maintenant la graisse sous pression à l'avant sans reflux.", 3],
  ["ecr_20", "T23-5020", "Poussoir de cliquet de rotation", "Écrou Rochet & Buse T23", "Système de Rotation", "Poussoir", "Poussoir métallique plongeur de cliquet", "PIECE", 45, "HAUTE", "Piston poussoir transmettant l'effort mécanique du ressort sur les cliquets de rotation.", 3],

  // ==========================================
  // SOUS-SYSTÈME 6 : OUTILS & ACCESSOIRES (~25 pièces)
  // ==========================================
  ["out_01", "T23-6001", "Décaleur de forage Hex H22x108 d'origine", "Outils & Accessoires T23", "Outils de Coupe", "Décaleur", "Décaleur robuste en acier à haute résilience", "PIECE", 950, "CRITIQUE", "Outil de forage forgé transmettant la force de frappe directe pour enfoncer les barres coniques.", 2],
  ["out_02", "T23-6002", "Queue d'adaptation forgée Hex 22x108mm", "Outils & Accessoires T23", "Outils de Coupe", "Queue de forage", "Queue forgée standard H22x108mm rectifiée", "PIECE", 680, "HAUTE", "Queue de forage normalisée s'insérant dans la busette de rotation du T23.", 3],
  ["out_03", "T23-6003", "Tige de forage conique H22 Longueur 1.2m", "Outils & Accessoires T23", "Outils de Coupe", "Tige de forage", "Tige conique H22 de longueur 1.2m d'origine", "PIECE", 1400, "CRITIQUE", "Tige de forage hexagonale de 1200mm en acier creux traité, avec canal d'eau central.", 3],
  ["out_04", "T23-6004", "Taillant à boutons conique Ø32mm conique 7°", "Outils & Accessoires T23", "Outils de Coupe", "Mèche de forage", "Taillant conique Ø32mm raccordement 7°", "PIECE", 450, "CRITIQUE", "Trépan à boutons en carbure de tungstène de 32mm de diamètre pour roches moyennement dures.", 3],
  ["out_05", "T23-6005", "Taillant à boutons conique Ø36mm pour roche dure", "Outils & Accessoires T23", "Outils de Coupe", "Foret de forage", "Taillant conique Ø36mm à boutons renforcés", "PIECE", 480, "CRITIQUE", "Taillant robuste pour foration rapide dans le quartz et la silice minière.", 3],
  ["out_06", "T23-6006", "Burin plat de foration Longueur 400mm H22", "Outils & Accessoires T23", "Outils de Coupe", "Burin", "Burin plat pour perforation de tranchée Hex 22", "PIECE", 320, "HAUTE", "Burin de foration plat pour la découpe de saignée et purge de paroi rocheuse.", 3],
  ["out_07", "T23-6007", "Pointe pyramidale d'abattage Longueur 400mm", "Outils & Accessoires T23", "Outils de Coupe", "Pointe", "Pointe pyramidale d'éclatement de bloc Hex 22", "PIECE", 310, "HAUTE", "Pointe de foration robuste pour le cassage manuel des blocs rocheux miniers.", 3],
  ["out_08", "T23-6008", "Adaptateur d'entraînement Hex 22 vers filet R22", "Outils & Accessoires T23", "Outils de Coupe", "Adaptateur de queue", "Adaptateur Hex 22mm vers filetage R22", "PIECE", 750, "HAUTE", "Raccord adaptant la queue d'entraînement hexagonale vers le filetage de tige R22.", 3],
  ["out_09", "T23-6009", "Manchon de raccordement fileté R22-R25", "Outils & Accessoires T23", "Outils de Coupe", "Raccord de tige", "Manchon de raccordement fileté d'extension", "PIECE", 380, "MOYENNE", "Raccord en acier allié permettant l'accouplement de tiges filetées de sections différentes.", 3],
  ["out_10", "T23-6010", "Manchon d'accouplement femelle-femelle R22", "Outils & Accessoires T23", "Outils de Coupe", "Manchon de raccordement", "Manchon d'accouplement femelle R22 d'origine", "PIECE", 350, "HAUTE", "Manchon de raccordement pour joindre deux tiges filetées R22.", 3],
  ["out_11", "T23-6011", "Clé spéciale à ergots forgée d'atelier", "Outils & Accessoires T23", "Outillage d'Atelier", "Clé de démontage", "Clé à ergots forgée pour mandrin de T23", "PIECE", 450, "MOYENNE", "Outil d'atelier conçu pour le démontage rapide du mandrin avant et bride sans impact.", 3],
  ["out_12", "T23-6012", "Gabarit mécanique de tension des tirants", "Outils & Accessoires T23", "Outillage d'Atelier", "Clé de montage", "Gabarit mécanique d'alignement des tirants", "PIECE", 420, "MOYENNE", "Outil de calage facilitant l'assemblage sous tension équilibrée de la boîte de distribution.", 3],
  ["out_13", "T23-6013", "Clé plate robuste de 32mm d'atelier", "Outils & Accessoires T23", "Outillage d'Atelier", "Clé à écrou", "Clé plate renforcée de 32mm forgée", "PIECE", 220, "BASSE", "Clé plate d'entretien pour le serrage des raccords d'admission d'air et flexibles.", 3],
  ["out_14", "T23-6014", "Clé à pipe coudée de 24mm d'atelier", "Outils & Accessoires T23", "Outillage d'Atelier", "Clé à pipe", "Clé à pipe coudée robuste de 24mm", "PIECE", 180, "BASSE", "Clé robuste pour écrou borgne lourd de tirant latéral.", 3],
  ["out_15", "T23-6015", "Tournevis plat de force d'atelier 10mm", "Outils & Accessoires T23", "Outillage d'Atelier", "Tournevis", "Tournevis à frapper en acier allié de 10mm", "PIECE", 75, "BASSE", "Tournevis lourd renforcé pour le démontage des bouchons de distribution.", 3],
  ["out_16", "T23-6016", "Maillet lourd sans rebond en polyuréthane", "Outils & Accessoires T23", "Outillage d'Atelier", "Maillet", "Maillet anti-rebond à billes de plomb", "PIECE", 290, "BASSE", "Maillet d'atelier évitant l'écaillage des surfaces rectifiées lors des opérations d'assemblage.", 3],
  ["out_17", "T23-6017", "Graisse au cuivre haute pression (400g)", "Outils & Accessoires T23", "Fluides & Filtration", "Graisse de forage", "Graisse de forage au cuivre haute température", "PIECE", 65, "MOYENNE", "Graisse lubrifiante anti-grippage au cuivre pour filetage conique des tiges de forage.", 3],
  ["out_18", "T23-6018", "Huile minérale anti-brouillard ISO VG 100", "Outils & Accessoires T23", "Fluides & Filtration", "Huile de graissage", "Huile de perforateur pneumatique (bidon 5L)", "LITRE", 450, "HAUTE", "Huile de haute performance pour perforateur pneumatique garantissant la lubrification à froid.", 3],
  ["out_19", "T23-6019", "Huile minérale adhérente de ligne d'air", "Outils & Accessoires T23", "Fluides & Filtration", "Lubrifiant", "Huile lubrifiante de ligne (bidon 1L)", "LITRE", 120, "HAUTE", "Huile adhérente injectée par atomiseur d'huile protégeant contre l'usure de friction.", 3],
  ["out_20", "T23-6020", "Cartouche filtrante en bronze fritté", "Outils & Accessoires T23", "Fluides & Filtration", "Filtre à air", "Cartouche filtrante poreuse en bronze fritté", "PIECE", 450, "HAUTE", "Élément filtrant poreux retenant l'humidité et les silices de la conduite d'air comprimé.", 3],
  ["out_21", "T23-6021", "Crépine filtrante inox pour circuit d'eau", "Outils & Accessoires T23", "Fluides & Filtration", "Filtre à eau", "Crépine filtrante en inox pour raccord d'eau", "PIECE", 320, "MOYENNE", "Filtre inox évitant le bouchage du tube de rinçage central par les sédiments.", 3],
  ["out_22", "T23-6022", "Séparateur d'eau cyclonique d'air 1\"", "Outils & Accessoires T23", "Fluides & Filtration", "Séparateur eau/air", "Séparateur de condensats d'air 1\" BSP", "PIECE", 1800, "HAUTE", "Séparateur d'eau centrifuge purgeant la condensation de la ligne d'air avant l'admission.", 2],
  ["out_23", "T23-6023", "Détendeur régulateur de pression de ligne", "Outils & Accessoires T23", "Fluides & Filtration", "Régulateur de pression", "Régulateur à membrane d'air comprimé", "PIECE", 1250, "HAUTE", "Régulateur de pression maintenant l'alimentation d'air stable à 5.5 bar.", 2],
  ["out_24", "T23-6024", "Manomètre de ligne d'air à bain de glycérine", "Outils & Accessoires T23", "Fluides & Filtration", "Manomètre", "Manomètre de contrôle de pression 0-10 bar", "PIECE", 220, "MOYENNE", "Manomètre de précision permettant de surveiller la pression de foration (5.5 bar nominal).", 3],
  ["out_25", "T23-6025", "Flexible d'alimentation d'air haute pression Ø25mm", "Outils & Accessoires T23", "Fluides & Filtration", "Flexible d'air", "Tuyau caoutchouc renforcé 20 bar de 20m", "PIECE", 1500, "CRITIQUE", "Flexible en caoutchouc hautement résistant assurant le débit d'alimentation d'air de 3600 l/min.", 3],

  // ==========================================
  // SOUS-SYSTÈME 7 : POUSSOIR (JACK LEG) & FIXATION (~20 pièces)
  // ==========================================
  ["pou_01", "T23-7001", "Béquille pneumatique d'avance télescopique complète", "Poussoir (Jack Leg) & Fixation T23", "Poussoir & Tubes", "Poussoir complet", "Béquille pneumatique d'origine usinée complète", "PIECE", 6800, "CRITIQUE", "Béquille télescopique (Jack Leg) assurant la poussée axiale automatique du perforateur lors du forage.", 1],
  ["pou_02", "T23-7002", "Tube extérieur de poussoir en aluminium", "Poussoir (Jack Leg) & Fixation T23", "Poussoir & Tubes", "Tube extérieur", "Cylindre extérieur en aluminium anodisé durci", "PIECE", 1500, "HAUTE", "Tube de protection léger et rigide servant d'enveloppe extérieure à la béquille.", 3],
  ["pou_03", "T23-7003", "Tube intérieur télescopique de béquille", "Poussoir (Jack Leg) & Fixation T23", "Poussoir & Tubes", "Tube intérieur", "Tube d'extension télescopique en acier chromé", "PIECE", 1200, "HAUTE", "Tige télescopique centrale transmettant la force de levée pneumatique.", 3],
  ["pou_04", "T23-7004", "Piston double canal pour poussoir", "Poussoir (Jack Leg) & Fixation T23", "Piston de Poussoir", "Piston de poussoir", "Tête de piston en aluminium usiné double effet", "PIECE", 750, "HAUTE", "Piston interne guidant l'air comprimé pour le déploiement axial de la béquille.", 3],
  ["pou_05", "T23-7005", "Joint de piston à double lèvre de poussoir", "Poussoir (Jack Leg) & Fixation T23", "Joints Poussoir", "Joint de poussoir", "Joint de piston double lèvre polyuréthane", "PIECE", 140, "HAUTE", "Joint garantissant l'étanchéité pneumatique de la chambre de levée télescopique.", 3],
  ["pou_06", "T23-7006", "Joint racleur avant de tige de poussoir", "Poussoir (Jack Leg) & Fixation T23", "Joints Poussoir", "Bague d'étanchéité", "Joint racleur avant caoutchouc nitrile double-effet", "PIECE", 95, "HAUTE", "Joint protégeant les tubes télescopiques internes des coulées de boue de forage.", 3],
  ["pou_07", "T23-7007", "Ressort d'amortissement de fin de course", "Poussoir (Jack Leg) & Fixation T23", "Poussoir & Tubes", "Ressort", "Ressort interne amortisseur de béquille", "PIECE", 180, "MOYENNE", "Ressort interne amortissant les impacts mécaniques en fin de déploiement.", 3],
  ["pou_08", "T23-7008", "Griffe d'ancrage forgée (pied de béquille)", "Poussoir (Jack Leg) & Fixation T23", "Poussoir & Tubes", "Pied de béquille", "Griffe antidérapante en acier forgé traité", "PIECE", 290, "HAUTE", "Pointe métallique crantée offrant une excellente accroche antidérapante au sol.", 3],
  ["pou_09", "T23-7009", "Chape d'articulation de couplage béquille", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Chape de béquille", "Étrier d'accouplement rotulé de fixation au T23", "PIECE", 410, "HAUTE", "Articulation assurant la jonction oscillante entre la tête de béquille et le perforateur.", 3],
  ["pou_10", "T23-7010", "Axe de pivot à rotule de béquille", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Œilleton de fixation", "Axe de pivot d'accouplement perforateur/béquille", "PIECE", 150, "HAUTE", "Axe d'accouplement recevant la chape d'articulation de la béquille.", 3],
  ["pou_11", "T23-7011", "Goupille de blocage rapide d'axe de rotule", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Goupille de fixation", "Goupille de sécurité de verrouillage d'axe de pivot", "PIECE", 35, "MOYENNE", "Goupille mécanique verrouillant l'axe d'accouplement rapide du perforateur.", 3],
  ["pou_12", "T23-7012", "Circlips de retenue d'axe d'articulation", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Circlips", "Circlips extérieur de retenue d'axe en acier", "PIECE", 15, "BASSE", "Circlips élastique interdisant tout glissement latéral de l'axe de chape.", 3],
  ["pou_13", "T23-7013", "Chaîne de sécurité anti-fouettement 2m fixe", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Chaîne de sécurité", "Chaîne de liaison en acier zingué 2m", "PIECE", 220, "MOYENNE", "Chaîne de sécurité limitant la déflexion brutale en cas de rupture de raccord d'air.", 3],
  ["pou_14", "T23-7014", "Mousqueton de sécurité en acier forgé", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Crochet de sécurité", "Mousqueton de sécurité lourd à vis", "PIECE", 65, "BASSE", "Mousqueton d'ancrage rapide pour chaîne anti-fouettement.", 3],
  ["pou_15", "T23-7015", "Console métallique de dépose au sol", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Support", "Console métallique d'appui et dépose d'outil", "PIECE", 950, "MOYENNE", "Cadre d'appui maintenant le perforateur stable à l'arrêt lors des pauses de foration.", 3],
  ["pou_16", "T23-7016", "Demi-coquille de berceau de fixation rapide", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Berceau de fixation", "Demi-coquille d'accouplement du T23 au poussoir", "PIECE", 1100, "HAUTE", "Collier d'accouplement rapide serrant le cylindre du perforateur sur la béquille.", 3],
  ["pou_17", "T23-7017", "Vis à serrage rapide pour berceau de béquille", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Vis de fixation", "Vis à filetage trapézoïdal rapide de berceau M12", "PIECE", 45, "MOYENNE", "Boulon à serrage rapide facilitant le montage et démontage manuel de l'outil.", 3],
  ["pou_18", "T23-7018", "Écrou à oreilles pour serrage rapide de berceau", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Écrou à oreilles", "Écrou papillon ergonomique de berceau M12", "PIECE", 25, "MOYENNE", "Écrou à oreilles facilitant le serrage manuel ferme du collier de fixation du perforateur.", 3],
  ["pou_19", "T23-7019", "Rondelle d'appui trempée pour vis de berceau", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Rondelle de fixation", "Rondelle d'appui en acier zingué robustesse accrue", "PIECE", 10, "BASSE", "Rondelle plate zinguée évitant le matage de l'épaulement du berceau de fixation.", 3],
  ["pou_20", "T23-7020", "Silentbloc d'accouplement élastique antivibratoire", "Poussoir (Jack Leg) & Fixation T23", "Supports & Fixation", "Joint de fixation", "Bague élastomère d'amortissement berceau", "PIECE", 35, "HAUTE", "Anneau en caoutchouc amortisseur réduisant la transmission d'ondes de choc vers la béquille.", 3],

  // ==========================================
  // SOUS-SYSTÈME 8 : CONSOMMABLES & PIÈCES D'USURE (~20 pièces)
  // ==========================================
  ["con_01", "T23-8001", "Pochette de joints d'origine complète T23", "Consommables & Pièces d'Usure T23", "Pochettes & Kits", "Kit de joints", "Kit complet de joints d'étanchéité d'origine T23", "KIT", 480, "CRITIQUE", "Assortiment d'usine regroupant l'ensemble des joints d'étanchéité plats, à lèvres et toriques.", 2],
  ["con_02", "T23-8002", "Kit de rechange de bagues d'usure", "Consommables & Pièces d'Usure T23", "Pochettes & Kits", "Kit de bagues", "Pochette de coussinets et bagues d'usure", "KIT", 350, "HAUTE", "Pochette contenant la bague d'usure de piston, de mandrin et de tige de guidage avant.", 2],
  ["con_03", "T23-8003", "Boîte assortiment de joints toriques NBR", "Consommables & Pièces d'Usure T23", "Pochettes & Kits", "Kit de joints toriques", "Assortiment de joints toriques en nitrile NBR", "KIT", 180, "HAUTE", "Mallette de joints toriques d'étanchéité d'origine de différentes sections minières.", 2],
  ["con_04", "T23-8004", "Kit de rondelles en cuivre de rechange", "Consommables & Pièces d'Usure T23", "Pochettes & Kits", "Kit de rondelles cuivre", "Kit de 20 rondelles cuivre de rechange", "KIT", 95, "MOYENNE", "Assortiment complet de rondelles cuivre pour bouchons filetés de purge et de raccordement.", 2],
  ["con_05", "T23-8005", "Sachet de boulonnerie et fixations critiques", "Consommables & Pièces d'Usure T23", "Pochettes & Kits", "Kit de boulonnerie", "Pochette de rechange vis, écrous et rondelles", "KIT", 190, "HAUTE", "Assortiment complet de boulonnerie de classe 12.9 pour l'entretien régulier en mine.", 2],
  ["con_06", "T23-8006", "Bague d'étanchéité caoutchouc NBR standard", "Consommables & Pièces d'Usure T23", "Garnitures Statiques", "Bague d'étanchéité", "Bague d'étanchéité torique NBR standard", "PIECE", 45, "HAUTE", "Joint torique d'étanchéité statique d'origine pour conduits internes.", 3],
  ["con_07", "T23-8007", "Bague d'étanchéité haute température Viton", "Consommables & Pièces d'Usure T23", "Garnitures Statiques", "Bague d'étanchéité", "Bague d'étanchéité Viton haute température", "PIECE", 95, "HAUTE", "Bague d'étanchéité FKM Viton garantissant le scellage sous contraintes thermiques intenses.", 3],
  ["con_08", "T23-8008", "Bague d'étanchéité nitrile dureté 80 Shore", "Consommables & Pièces d'Usure T23", "Garnitures Statiques", "Bague d'étanchéité", "Bague d'étanchéité NBR 80 Shore haute dureté", "PIECE", 40, "HAUTE", "Garniture d'étanchéité dure pour montage sans extrusion en conduits à 6 bar.", 3],
  ["con_09", "T23-8009", "Joint torique de tiroir de distributeur", "Consommables & Pièces d'Usure T23", "Garnitures Statiques", "Joint torique", "Joint torique d'étanchéité NBR 70 Shore", "PIECE", 20, "HAUTE", "Joint de étanchéité statique d'origine pour tiroir d'inversion.", 3],
  ["con_10", "T23-8010", "Joint torique de compression de cylindre Viton", "Consommables & Pièces d'Usure T23", "Garnitures Statiques", "Joint torique", "Joint torique haute température de compression FKM", "PIECE", 55, "HAUTE", "Joint torique d'origine résistant aux pics thermiques de foration sèche accidentelle.", 3],
  ["con_11", "T23-8011", "Joint torique EPDM spécial eau de mine acide", "Consommables & Pièces d'Usure T23", "Garnitures Statiques", "Joint torique", "Joint torique étanchéité EPDM circuit eau acide", "PIECE", 35, "HAUTE", "Joint en EPDM résistant aux attaques corrosives de l'eau de nappe minière acide.", 3],
  ["con_12", "T23-8012", "Rondelle cuivre d'étanchéité d'origine 1/2\"", "Consommables & Pièces d'Usure T23", "Garnitures Statiques", "Rondelle cuivre", "Rondelle d'étanchéité plate cuivre recuit 1/2\"", "PIECE", 10, "MOYENNE", "Rondelle d'écrasement cuivre pour raccord rapide d'eau de tête arrière.", 3],
  ["con_13", "T23-8013", "Rondelle plate inox d'appui de tirant M12", "Consommables & Pièces d'Usure T23", "Boulonnerie d'Usure", "Rondelle", "Rondelle plate inox d'appui de tirant M12", "PIECE", 12, "MOYENNE", "Rondelle d'appui inox évitant la corrosion par l'humidité constante du front.", 3],
  ["con_14", "T23-8014", "Rondelle Grower élastique de serrage M12", "Consommables & Pièces d'Usure T23", "Boulonnerie d'Usure", "Rondelle ressort", "Rondelle Grower élastique anti-vibratoire M12", "PIECE", 15, "HAUTE", "Rondelle frein évitant le desserrage de la boulonnerie périphérique d'échappement.", 3],
  ["con_15", "T23-8015", "Vis de fixation tête hexagonale M10x40", "Consommables & Pièces d'Usure T23", "Boulonnerie d'Usure", "Vis", "Vis tête hexagonale M10x40 acier classe 12.9", "PIECE", 25, "HAUTE", "Vis d'assemblage en acier d'indice de résistance maximal pour environnement agressif.", 3],
  ["con_16", "T23-8016", "Écrou hexagonal à bague nylon M10", "Consommables & Pièces d'Usure T23", "Boulonnerie d'Usure", "Écrou", "Écrou hexagonal frein type Nylstop M10", "PIECE", 15, "HAUTE", "Écrou hexagonal lourd à frein nylon empêchant tout desserrage intempestif.", 3],
  ["con_17", "T23-8017", "Goupille élastique fendue de verrouillage", "Consommables & Pièces d'Usure T23", "Boulonnerie d'Usure", "Goupille", "Goupille élastique fendue ISO 8752 Ø5x30", "PIECE", 15, "HAUTE", "Goupille métallique élastique assurant la retenue axiale des tringles d'indexation.", 3],
  ["con_18", "T23-8018", "Circlips intérieur de retenue de guide", "Consommables & Pièces d'Usure T23", "Boulonnerie d'Usure", "Circlips", "Circlips intérieur alésage Ø40 acier ressort", "PIECE", 20, "MOYENNE", "Circlips sécurisant les roulements et douilles de guidage avant.", 3],
  ["con_19", "T23-8019", "Circlips extérieur de retenue d'axe", "Consommables & Pièces d'Usure T23", "Boulonnerie d'Usure", "Circlips", "Circlips extérieur d'arbre Ø20 acier ressort", "PIECE", 20, "BASSE", "Circlips élastique verrouillant la poignée en T sur la tête arrière.", 3],
  ["con_20", "T23-8020", "Graisse graphitée spéciale hautes températures (400g)", "Consommables & Pièces d'Usure T23", "Fluides & Filtration", "Graisse haute performance", "Graisse graphitée spéciale hautes températures", "PIECE", 85, "HAUTE", "Graisse d'origine résistant au délavage d'eau et assurant une lubrification parfaite de la busette.", 3]
];

export const T23_CATALOG: CatalogItem[] = RAW_ITEMS.map((item) => {
  const [
    idSuffix,
    reference,
    designationRaw,
    functionalCategory,
    subCategory,
    component,
    subComponent,
    unit,
    price,
    criticality,
    notes,
    bomLevel
  ] = item;

  // Formatting designation to match: [SUBSYSTEM] - [COMPONENT] - Description (Ref: XXXX)
  const subsystemPrefix = functionalCategory.replace(" T23", "").toUpperCase();
  const componentPrefix = component.toUpperCase();
  const designation = `[${subsystemPrefix}] - [${componentPrefix}] - ${designationRaw} - (Ref: ${reference})`;

  // Derived stock statistics for premium enterprise-ready inventory dashboard
  const stockQty = Math.floor(Math.sin(price) * 15) + 20; // Pseudo-random realistic stocks
  const minStock = Math.max(2, Math.floor(stockQty * 0.4));
  const criticalStock = Math.max(1, Math.floor(minStock * 0.5));
  const leadTimeDays = Math.floor(Math.sin(price + 10) * 5) + 7;

  return {
    id: `t23_${idSuffix}`,
    reference,
    designation,
    functionalCategory,
    subCategory,
    component,
    subComponent,
    unit,
    price,
    proposedPrice: price,
    compatibility: "Montabert T23",
    criticality,
    suggestedType: "OUTILS" as any,
    source: "MASTER",
    bomLevel,
    notes,
    stockQty,
    minStock,
    criticalStock,
    leadTimeDays,
    commonName: `${component} T23`,
    searchTags: [
      "T23",
      "MONTABERT",
      "FORAGE",
      "PNEUMATIQUE",
      subsystemPrefix,
      componentPrefix,
      reference
    ]
  };
});
