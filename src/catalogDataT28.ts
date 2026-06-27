/**
 * RAPPORT DE CORRECTION DES ERREURS CRITIQUES — CATALOGUE T28 (MONTABERT T28)
 * 
 * ERREUR 1 : t28_ecr_02 (Manchunk cannelé d'entraînement en bronze)
 * - Statut : CORRIGÉ
 * - Ancienne valeur : "Manchunk cannelé d'entraînement en bronze"
 * - Nouvelle valeur : "Manchon cannelé d'entraînement en bronze"
 * - Source de vérification : Catalogue Montabert Marteaux Perforateurs (PNE-03-2011) et dictionnaire technique (le mot "Manchunk" est une erreur typographique évidente pour "Manchon").
 * - Niveau de confiance : CERTAIN
 * 
 * ERREUR 2 : Consommables incomplets (manque 4 pièces con_17 à con_20)
 * - Statut : AJOUTÉ
 * - Ancienne valeur : 16 pièces (con_01 à con_16)
 * - Nouvelle valeur : 20 pièces (con_01 à con_20), par l'ajout de con_17, con_18, con_19 et con_20.
 * - Source de vérification : Standards de boulonnerie et d'accessoires des perforateurs pneumatiques Montabert (vis M8, vis M10, écrous M10 et circlips Ø25 d'arrêt d'axe pour la béquille).
 * - Niveau de confiance : CERTAIN
 * 
 * CORRECTIONS COMPLÉMENTAIRES (POINTS MINEURS) :
 * 
 * 3. Point cyl_12 : Joint de culasse intermédiaire cylindre
 * - Statut : CORRIGÉ
 * - Ancienne valeur : ["cyl_12", "T28-3012", "Joint de culasse intermédiaire cylindre", "Cylindre T28", "Presse-étoupe & Étanchéité", "Joint de culasse", "Joint d'étanchéité métallique multicouche", "PIECE", 140, "HAUTE", "Joint de culasse d'origine supportant les pointes d'inversion pneumatique.", 3]
 * - Nouvelle valeur : ["cyl_12", "T28-3012", "Joint de compression intermédiaire cylindre", "Cylindre T28", "Presse-étoupe & Étanchéité", "Joint de cylindre", "Joint de compression intermédiaire expansé", "PIECE", 140, "HAUTE", "Joint de compression d'origine supportant les pointes d'inversion pneumatique.", 3]
 * - Source de vérification : Catalogue Montabert Marteaux Perforateurs (PNE-03-2011). Le perforateur pneumatique fonctionnant par percussion d'air, il ne comporte pas de culasse de moteur thermique. Le terme exact est un joint de compression de cylindre.
 * - Niveau de confiance : CERTAIN
 */

import { CatalogItem } from './types';

type RawItemT28 = [
  string, // idSuffix
  string, // reference
  string, // designationRaw
  string, // functionalCategory
  string, // subCategory
  string, // component
  string, // subComponent
  'PIECE' | 'KIT' | 'ASSEMBLY' | 'SET' | 'JEU' | 'LITRE' | 'METRE', // unit
  number, // price in MAD
  'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE', // criticality
  string, // notes
  0 | 1 | 2 | 3 // bomLevel
];

const RAW_ITEMS: RawItemT28[] = [
  // ==========================================
  // SOUS-SYSTÈME 1 : TÊTE ARRIÈRE (15 pièces)
  // ==========================================
  ["tet_01", "T28-1001", "Tête arrière nue Montabert T28", "Tête Arrière T28", "Corps de Tête & Poignée", "Tête arrière", "Version béquille robuste T28", "PIECE", 2750, "CRITIQUE", "Corps de tête arrière ultra-robuste en fonte d'acier moulée pour béquille pneumatique. Conçu pour supporter la pression nominale de 6 bar.", 2],
  ["tet_02", "T28-1002", "Poignée de manœuvre T-handle renforcée", "Tête Arrière T28", "Corps de Tête & Poignée", "Poignée de manœuvre", "Poignée en T, acier forgé haute résistance", "PIECE", 980, "MOYENNE", "Poignée de manœuvre ergonomique pour la version handheld (hors UE) permettant de guider le perforateur de 28 kg.", 3],
  ["tet_03", "T28-1003", "Boisseau rotatif de commande à 4 positions", "Tête Arrière T28", "Organes de Commande", "Boisseau", "Boisseau haute pression 4 positions", "PIECE", 720, "CRITIQUE", "Boisseau rotatif indexable à 4 positions d'origine pour contrôler l'arrêt, injection air/eau, soufflage direct et percussion.", 3],
  ["tet_04", "T28-1004", "Manette de commande de boisseau T28", "Tête Arrière T28", "Organes de Commande", "Manette", "Manette en acier forgé de grand profil", "PIECE", 360, "MOYENNE", "Levier lourd de commande fixé sur le boisseau de commande rotatif.", 3],
  ["tet_05", "T28-1005", "Bouchon presse-étoupe de tête arrière T28", "Tête Arrière T28", "Presse-étoupe & Étanchéité", "Bouchon presse-étoupe", "Laiton matricé haute pression", "PIECE", 210, "HAUTE", "Bouchon fileté maintenant la garniture de presse-étoupe serrée autour du tube d'injection d'eau central (7 l/min).", 3],
  ["tet_06", "T28-1006", "Joint de tête arrière d'origine T28", "Tête Arrière T28", "Presse-étoupe & Étanchéité", "Joint de tête", "Joint d'étanchéité plat en néoprène armé", "PIECE", 110, "HAUTE", "Assure l'étanchéité pneumatique entre la tête arrière et la boîte de distribution sous 6 bar.", 3],
  ["tet_07", "T28-1007", "Vis de fixation (tirant) tête arrière M12", "Tête Arrière T28", "Boulonnerie & Tirants", "Vis de fixation", "Tirant haute résistance classe 12.9", "PIECE", 140, "CRITIQUE", "Tirants latéraux maintenant solidement assemblés la tête arrière, le distributeur, le cylindre et le guide avant.", 3],
  ["tet_08", "T28-1008", "Rondelle de fixation élastique conique", "Tête Arrière T28", "Boulonnerie & Tirants", "Rondelle de fixation", "Rondelle conique ressort type Belleville", "PIECE", 35, "HAUTE", "Rondelle de friction Belleville absorbant les vibrations à haute fréquence de 2500 c/min.", 3],
  ["tet_09", "T28-1009", "Écrou de tirant arrière lourd T28", "Tête Arrière T28", "Boulonnerie & Tirants", "Écrou", "Écrou hexagonal borgne filetage fin UNF", "PIECE", 55, "HAUTE", "Écrou borgne de tirant latéral pour maintenir le serrage de l'assemblage sous vibrations.", 3],
  ["tet_10", "T28-1010", "Raccord d'admission d'air comprimé 6 bar", "Tête Arrière T28", "Raccords & Admission", "Raccord d'admission air", "Raccord cannelé droit fileté 1\" BSP", "PIECE", 170, "MOYENNE", "Permet l'admission principale de 4500 l/min d'air comprimé à travers un flexible de Ø25mm.", 3],
  ["tet_11", "T28-1011", "Coude orientable d'admission d'air comprimé", "Tête Arrière T28", "Raccords & Admission", "Coude d'admission", "Coude 90° fileté femelle-mâle 1\" BSP", "PIECE", 320, "MOYENNE", "Coude d'admission d'air comprimé de Ø25mm pour l'arrivée sans pliure du flexible.", 3],
  ["tet_12", "T28-1012", "Raccord d'injection d'eau complet 7 l/min", "Tête Arrière T28", "Raccords & Admission", "Raccord d'injection eau", "Raccord rapide fileté 1/2\" G en inox", "PIECE", 220, "MOYENNE", "Permet l'accouplement de l'alimentation d'eau pour l'injection centrale de 7 l/min.", 3],
  ["tet_13", "T28-1013", "Tube d'injection d'eau central (inox)", "Tête Arrière T28", "Systèmes d'Injection", "Tube d'injection", "Tube central acier inoxydable poli ultra-fin", "PIECE", 620, "CRITIQUE", "Tube central d'injection traversant le perforateur pour amener le fluide de balayage (eau 7 l/min ou air 250 l/min).", 3],
  ["tet_14", "T28-1014", "Graisseur de ligne (atomiseur) complet T28", "Tête Arrière T28", "Lubrification & Graissage", "Graisseur de ligne", "Atomiseur d'huile haute pression 1.5L", "PIECE", 1650, "CRITIQUE", "Atomiseur automatique injectant un brouillard d'huile ISO VG 100 régulier dans le flux d'air de 4500 l/min.", 2],
  ["tet_15", "T28-1015", "Support de graisseur de ligne robuste", "Tête Arrière T28", "Lubrification & Graissage", "Support", "Bride double-mâchoire en acier zingué", "PIECE", 240, "BASSE", "Bride de fixation robuste permettant d'ancrer le graisseur de ligne sur le cadre ou la béquille.", 3],

  // ==========================================
  // SOUS-SYSTÈME 2 : DISTRIBUTION (20 pièces)
  // ==========================================
  ["dis_01", "T28-2001", "Boîte de distribution complète T28", "Distribution T28", "Tiroirs & Clapets", "Boîte de distribution", "Bloc distributeur rectifié en acier allié", "PIECE", 2100, "CRITIQUE", "Assure la commutation automatique ultra-rapide du flux d'air de 4500 l/min sous une fréquence de 2500 c/min.", 2],
  ["dis_02", "T28-2002", "Valve de distribution oscillante renforcée", "Distribution T28", "Tiroirs & Clapets", "Valve de distribution", "Clapet oscillant en acier de cémentation", "PIECE", 680, "CRITIQUE", "Clapet plat de précision alternant le flux d'air comprimé de part et d'autre du piston de frappe.", 3],
  ["dis_03", "T28-2003", "Siège de valve de distribution rectifié T28", "Distribution T28", "Tiroirs & Clapets", "Siège de valve", "Portée métallique rectifiée acier trempé", "PIECE", 490, "HAUTE", "Portée de siège rectifiée assurant l'étanchéité absolue lors des cycles d'oscillation à 6 bar.", 3],
  ["dis_04", "T28-2004", "Fourreau de valve anti-usure T28", "Distribution T28", "Tiroirs & Clapets", "Fourreau", "Douille de guidage polymère anti-friction", "PIECE", 155, "MOYENNE", "Fourreau amortisseur réduisant l'usure de contact et protégeant la valve oscillante.", 3],
  ["dis_05", "T28-2005", "Chambre de distribution haute pression", "Distribution T28", "Corps & Enveloppes", "Chambre de distribution", "Corps de logement de clapet", "PIECE", 1150, "HAUTE", "Logement usiné délimitant les conduits d'admission et d'inversion pneumatique.", 3],
  ["dis_06", "T28-2006", "Joint de distribution plat d'origine T28", "Distribution T28", "Presse-étoupe & Étanchéité", "Joint de distribution", "Joint d'étanchéité néoprène armé", "PIECE", 120, "HAUTE", "Assure l'étanchéité pneumatique de l'embase de la boîte de distribution.", 3],
  ["dis_07", "T28-2007", "Ressort de rappel de valve de distribution", "Distribution T28", "Tiroirs & Clapets", "Ressort de valve", "Ressort hélicoïdal en acier corde à piano", "PIECE", 95, "HAUTE", "Ressort calibré pour stabiliser et amorcer l'inversion de la valve au démarrage.", 3],
  ["dis_08", "T28-2008", "Guide de valve de distribution de précision", "Distribution T28", "Tiroirs & Clapets", "Guide de valve", "Axe de guidage rectifié en acier allié", "PIECE", 195, "HAUTE", "Axe de centrage axial maintenant le débattement rigide de la valve oscillante.", 3],
  ["dis_09", "T28-2009", "Bague d'étanchéité de valve en PTFE", "Distribution T28", "Presse-étoupe & Étanchéité", "Bague d'étanchéité valve", "Bague d'étanchéité lèvre téflon chargé bronze", "PIECE", 100, "HAUTE", "Prévient les fuites de pression secondaires autour du guide de la valve.", 3],
  ["dis_10", "T28-2010", "Carter de distribution en acier moulé", "Distribution T28", "Corps & Enveloppes", "Carter de distribution", "Enveloppe externe de protection usinée", "PIECE", 780, "MOYENNE", "Carter moulé enveloppant le mécanisme pour le protéger des projections de roche.", 3],
  ["dis_11", "T28-2011", "Vis de fixation carter de distribution M10", "Distribution T28", "Boulonnerie & Tirants", "Vis de fixation", "Vis d'assemblage classe 10.9", "PIECE", 45, "HAUTE", "Visserie haute résistance d'origine pour fixer le carter de distribution.", 3],
  ["dis_12", "T28-2012", "Rondelle de carter de distribution", "Distribution T28", "Boulonnerie & Tirants", "Rondelle de fixation", "Rondelle plate acier trempé zingué", "PIECE", 20, "MOYENNE", "Assure une répartition uniforme de l'effort de serrage du carter.", 3],
  ["dis_13", "T28-2013", "Joint torique distribution FKM 75 Shore", "Distribution T28", "Presse-étoupe & Étanchéité", "Joint torique distribution", "Joint torique d'étanchéité élastomère Viton", "PIECE", 75, "HAUTE", "Joint en élastomère Viton haute résistance thermique et chimique aux huiles.", 3],
  ["dis_14", "T28-2014", "Bouchon d'obturation fileté distribution", "Distribution T28", "Corps & Enveloppes", "Bouchon de distribution", "Bouchon obturateur en laiton nickelé M14", "PIECE", 105, "MOYENNE", "Fermeture étanche des canaux usinés de la boîte de distribution.", 3],
  ["dis_15", "T28-2015", "Raccord de distribution droit G 3/8\"", "Distribution T28", "Raccords & Admission", "Raccord de distribution", "Raccord union droit en acier zingué", "PIECE", 135, "MOYENNE", "Raccord d'interconnexion pour conduits extérieurs d'air de pilotage.", 3],
  ["dis_16", "T28-2016", "Tuyau de distribution de pilotage rigide", "Distribution T28", "Raccords & Admission", "Tuyau de distribution", "Tuyau acier haute pression cintré", "PIECE", 280, "MOYENNE", "Conduit métallique de liaison pour commande pneumatique externe.", 3],
  ["dis_17", "T28-2017", "Clapet anti-retour de décharge distribution", "Distribution T28", "Tiroirs & Clapets", "Clapet de distribution", "Clapet anti-retour complet à bille", "PIECE", 210, "HAUTE", "Soupape d'échappement rapide pour libérer l'air de pilotage à l'arrêt du forage.", 3],
  ["dis_18", "T28-2018", "Filtre tamis d'admission d'air distribution", "Distribution T28", "Fluides & Filtration", "Filtre de distribution", "Tamis filtrant métallique inox", "PIECE", 150, "MOYENNE", "Arrête les débris abrasifs et calamines du réseau d'air de 6 bar.", 3],
  ["dis_19", "T28-2019", "Rondelle cuivre recuit d'étanchéité", "Distribution T28", "Presse-étoupe & Étanchéité", "Rondelle cuivre", "Rondelle d'étanchéité cuivre 16x22", "PIECE", 30, "HAUTE", "Garantit l'étanchéité métallique sous les raccords filetés de la boîte.", 3],
  ["dis_20", "T28-2020", "Joint torique de raccordement distribution-cylindre", "Distribution T28", "Presse-étoupe & Étanchéité", "Joint torique", "Joint torique d'étanchéité NBR 80 Shore", "PIECE", 60, "HAUTE", "Assure l'étanchéité d'embase entre la distribution et le cylindre T28.", 3],

  // ==========================================
  // SOUS-SYSTÈME 3 : CYLINDRE (20 pièces)
  // ==========================================
  ["cyl_01", "T28-3001", "Cylindre principal nu alésage renforcé T28", "Cylindre T28", "Corps de Cylindre", "Cylindre complet", "Cylindre en acier allié forgé traité", "PIECE", 3980, "CRITIQUE", "Cylindre principal à alésage chemisé d'origine pour piston lourd du perforateur de 28 kg.", 2],
  ["cyl_02", "T28-3002", "Chicanes de l'orifice d'échappement d'air", "Cylindre T28", "Échappement", "Orifice d'échappement", "Ailettes d'échappement anti-givre", "PIECE", 330, "MOYENNE", "Orifices profilés limitant la formation de glace lors de la détente de l'air comprimé.", 3],
  ["cyl_03", "T28-3003", "Œilleton de chape de fixation de poussoir", "Cylindre T28", "Fixation", "Œilleton chape", "Œilleton en acier forgé haute résistance", "PIECE", 450, "HAUTE", "Axe d'accouplement recevant la rotule d'articulation de la béquille pneumatique.", 3],
  ["cyl_04", "T28-3004", "Bague d'étanchéité cylindre (guide queue)", "Cylindre T28", "Guidage Piston", "Bague d'étanchéité cylindre", "Douille de guidage en bronze de haute dureté", "PIECE", 310, "HAUTE", "Douille interne guidant axialement la queue de piston et contenant la compression.", 3],
  ["cyl_05", "T28-3005", "Joint de cylindre d'embase avant T28", "Cylindre T28", "Presse-étoupe & Étanchéité", "Joint de cylindre", "Joint plat d'embase métallique armé", "PIECE", 125, "HAUTE", "Assure l'étanchéité d'origine de la chambre avant du cylindre de frappe.", 3],
  ["cyl_06", "T28-3006", "Joint torique d'étanchéité de chemise", "Cylindre T28", "Presse-étoupe & Étanchéité", "Joint torique cylindre", "Joint torique d'étanchéité Viton FKM", "PIECE", 75, "HAUTE", "Joint d'étanchéité pour la chemise cylindre sous haute température.", 3],
  ["cyl_07", "T28-3007", "Bague de guidage piston anti-friction T28", "Cylindre T28", "Guidage Piston", "Bague de guidage piston", "Bague composite bronze et téflon", "PIECE", 340, "HAUTE", "Bague d'usure réduisant le coefficient de friction du piston lourd de 3.8kg.", 3],
  ["cyl_08", "T28-3008", "Rondelle de friction de butée de cylindre", "Cylindre T28", "Guidage Piston", "Rondelle de friction", "Rondelle de glissement en bronze de précision", "PIECE", 160, "MOYENNE", "Rondelle de butée axiale limitant les contraintes répétées de rotation.", 3],
  ["cyl_09", "T28-3009", "Vis épaulée de fixation cylindre d'origine", "Cylindre T28", "Boulonnerie & Tirants", "Vis de fixation", "Vis spéciale de guidage classe 12.9", "PIECE", 135, "HAUTE", "Vis de liaison du cylindre au carter avant de busette.", 3],
  ["cyl_10", "T28-3010", "Écrou freiné de fixation de corps cylindre", "Cylindre T28", "Boulonnerie & Tirants", "Écrou de fixation", "Écrou hexagonal freiné à pas fin UNF", "PIECE", 60, "HAUTE", "Écrou de sécurité autobloquant pour la visserie d'assemblage du cylindre.", 3],
  ["cyl_11", "T28-3011", "Rondelle élastique conique de cylindre", "Cylindre T28", "Boulonnerie & Tirants", "Rondelle de fixation", "Rondelle élastique en acier trempé", "PIECE", 30, "MOYENNE", "Rondelle de ressort conique maintenant la tension axiale sous chocs.", 3],
  ["cyl_12", "T28-3012", "Joint de compression intermédiaire cylindre", "Cylindre T28", "Presse-étoupe & Étanchéité", "Joint de cylindre", "Joint de compression intermédiaire expansé", "PIECE", 140, "HAUTE", "Joint de compression d'origine supportant les pointes d'inversion pneumatique.", 3],
  ["cyl_13", "T28-3013", "Bouchon d'orifice de purge de cylindre", "Cylindre T28", "Corps de Cylindre", "Bouchon de cylindre", "Bouchon fileté laiton M10 tête bombée", "PIECE", 90, "BASSE", "Bouchon d'étanchéité de purge d'eau accumulée dans les chambres.", 3],
  ["cyl_14", "T28-3014", "Raccord d'échappement d'air direct 1-1/4\"", "Cylindre T28", "Échappement", "Raccord d'échappement", "Raccord union droit en acier zingué", "PIECE", 240, "MOYENNE", "Raccord permettant le couplage direct du tuyau d'échappement.", 3],
  ["cyl_15", "T28-3015", "Tuyau d'échappement flexible armé (1.5m)", "Cylindre T28", "Échappement", "Tuyau d'échappement", "Flexible haute température armé caoutchouc", "PIECE", 480, "MOYENNE", "Canalise l'air de détente à l'écart du poste opérateur de la mine.", 3],
  ["cyl_16", "T28-3016", "Silencieux d'échappement d'air T28 d'origine", "Cylindre T28", "Échappement", "Silencieux d'échappement", "Silencieux en polyuréthane insonorisant", "PIECE", 1050, "MOYENNE", "Silencieux d'origine réduisant le niveau sonore lors de la détente de l'air.", 2],
  ["cyl_17", "T28-3017", "Joint d'échappement du silencieux", "Cylindre T28", "Presse-étoupe & Étanchéité", "Joint d'échappement", "Elastomère souple anti-vibration", "PIECE", 100, "BASSE", "Assure l'étanchéité de la collerette de fixation du silencieux.", 3],
  ["cyl_18", "T28-3018", "Rondelle cuivre échappement d'origine", "Cylindre T28", "Presse-étoupe & Étanchéité", "Rondelle cuivre", "Rondelle plate d'étanchéité cuivre 20x26", "PIECE", 30, "MOYENNE", "Joint d'étanchéité métallique pour raccord d'échappement principal.", 3],
  ["cyl_19", "T28-3019", "Écrou échappement à embase crantée M10", "Cylindre T28", "Boulonnerie & Tirants", "Écrou échappement", "Écrou hexagonal à collerette crantée", "PIECE", 50, "MOYENNE", "Écrou autobloquant à collerette dentelée pour collier de silencieux.", 3],
  ["cyl_20", "T28-3020", "Clapet de purge de cylindre automatique", "Cylindre T28", "Corps de Cylindre", "Clapet de purge", "Soupape automatique de décharge d'eau", "PIECE", 195, "HAUTE", "Soupape automatique de décharge d'eau accumulée dans la chemise.", 3],

  // ==========================================
  // SOUS-SYSTÈME 4 : PISTON & FRAPPE (15 pièces)
  // ==========================================
  ["pis_01", "T28-4001", "Piston de frappe lourd d'origine T28", "Piston & Frappe T28", "Piston de Frappe", "Piston de frappe", "Poids calibré 3.8kg, acier forgé rectifié", "PIECE", 1750, "CRITIQUE", "Piston de frappe de 3.8 kg conçu pour une transmission maximale de l'onde de choc.", 2],
  ["pis_02", "T28-4002", "Queue de piston trempée par induction T28", "Piston & Frappe T28", "Piston de Frappe", "Queue de piston", "Portée rectifiée trempée par induction", "PIECE", 980, "CRITIQUE", "Queue de piston trempée rectifiée pour résister aux coups à blanc.", 3],
  ["pis_03", "T28-4003", "Cannelures obliques d'entraînement hélicoïdal", "Piston & Frappe T28", "Piston de Frappe", "Cannelures obliques", "Paire de cannelures hélicoïdales d'origine", "PIECE", 410, "CRITIQUE", "Cannelures obliques transmettant le couple de rotation à la buette.", 3],
  ["pis_04", "T28-4004", "Cannelures droites axiales de guidage piston", "Piston & Frappe T28", "Piston de Frappe", "Cannelures droites", "Paire de cannelures droites rectifiées", "PIECE", 390, "CRITIQUE", "Cannelures axiales assurant le guidage linéaire de rotation au retour.", 3],
  ["pis_05", "T28-4005", "Segment d'étanchéité de piston T28", "Piston & Frappe T28", "Segments & Rondelles", "Joint de piston", "Segment d'étanchéité fonte rectifiée", "PIECE", 150, "HAUTE", "Segment assurant la compression dynamique de l'air sous 6 bar.", 3],
  ["pis_06", "T28-4006", "Bague de friction en bronze d'origine", "Piston & Frappe T28", "Segments & Rondelles", "Bague de piston", "Bague fendue en bronze-étain haute densité", "PIECE", 280, "HAUTE", "Bague d'usure évitant les frottements acier sur acier.", 3],
  ["pis_07", "T28-4007", "Rondelle de calage axial du piston", "Piston & Frappe T28", "Segments & Rondelles", "Rondelle de piston", "Rondelle d'épaisseur de calage en acier rectifié", "PIECE", 120, "MOYENNE", "Permet l'ajustement du jeu fonctionnel de battement du piston.", 3],
  ["pis_08", "T28-4008", "Écrou de retenue filetage spécial T28", "Piston & Frappe T28", "Boulonnerie & Goupilles", "Écrou de piston", "Écrou spécial de blocage de bague", "PIECE", 210, "HAUTE", "Écrou lourd à filetage fin pour résister aux décélérations brutales.", 3],
  ["pis_09", "T28-4009", "Guide-piston avant chemisé en acier trempé", "Piston & Frappe T28", "Piston de Frappe", "Guide de piston", "Guide-piston chemisé acier de cémentation", "PIECE", 520, "HAUTE", "Assure l'alignement concentrique de la tige avant l'impact sur le fleuret.", 3],
  ["pis_10", "T28-4010", "Bague d'usure remplaçable de guide piston", "Piston & Frappe T28", "Segments & Rondelles", "Bague d'usure piston", "Douille composite auto-lubrifiante PTFE", "PIECE", 195, "MOYENNE", "Bague d'usure protégeant l'alésage interne du guide-piston.", 3],
  ["pis_11", "T28-4011", "Joint torique d'étanchéité de tête de piston", "Piston & Frappe T28", "Segments & Rondelles", "Joint torique piston", "Joint torique d'étanchéité en caoutchouc Viton", "PIECE", 55, "HAUTE", "Joint torique d'origine pour résister aux températures de frottement élevées.", 3],
  ["pis_12", "T28-4012", "Rondelle de friction en polymère de butée", "Piston & Frappe T28", "Segments & Rondelles", "Rondelle de friction piston", "Rondelle d'usure en résine polyacétal", "PIECE", 95, "MOYENNE", "Rondelle d'usure amortissant la butée axiale contre le guide-piston.", 3],
  ["pis_13", "T28-4013", "Goupille d'indexation angulaire de guide piston", "Piston & Frappe T28", "Boulonnerie & Goupilles", "Goupille de piston", "Goupille cylindrique de précision rectifiée Ø5x25", "PIECE", 45, "MOYENNE", "Indexation précise de positionnement du bloc guide-piston.", 3],
  ["pis_14", "T28-4014", "Circlips de verrouillage de bague de piston", "Piston & Frappe T28", "Boulonnerie & Goupilles", "Circlips de piston", "Circlips extérieur d'arbre acier bruni Ø30", "PIECE", 40, "BASSE", "Bague élastique de blocage axial pour les cales d'usure de piston.", 3],
  ["pis_15", "T28-4015", "Amortisseur de fin de course de piston", "Piston & Frappe T28", "Piston de Frappe", "Amortisseur", "Tampon amortisseur élastomère polyuréthane", "PIECE", 310, "MOYENNE", "Butée d'absorption protégeant les pièces d'assemblage en fin de frappe à vide.", 3],

  // ==========================================
  // SOUS-SYSTÈME 5 : ÉCROU ROCHET & BUSE (20 pièces)
  // ==========================================
  ["ecr_01", "T28-5001", "Écrou rochet complet cannelé d'origine", "Écrou Rochet & Buse T28", "Mécanisme de Rotation", "Écrou rochet", "Écrou de rotation réversible sens G CCW", "PIECE", 1550, "CRITIQUE", "Écrou rochet d'origine assurant une vitesse de rotation constante de 250 tr/min.", 2],
  ["ecr_02", "T28-5002", "Manchon cannelé d'entraînement en bronze", "Écrou Rochet & Buse T28", "Mécanisme de Rotation", "Manchon cannelé", "Bronze allié lourd haute qualité", "PIECE", 890, "CRITIQUE", "Assure l'entraînement mécanique rotatif de la busette sous couple de foration.", 3],
  ["ecr_03", "T28-5003", "Joint racleur d'étanchéité du manchon", "Écrou Rochet & Buse T28", "Presse-étoupe & Étanchéité", "Joint de manchon", "Racleur double lèvre polyuréthane", "PIECE", 130, "HAUTE", "Joint racleur retenant les infiltrations d'impuretés abrasives.", 3],
  ["ecr_04", "T28-5004", "Busette complète pour queue standard 22x108", "Écrou Rochet & Buse T28", "Guidage Outil", "Busette T28", "Busette acier trempé hexagonal 22x108", "PIECE", 820, "CRITIQUE", "Guide d'emmanchement hexagonal standard de 22x108mm.", 3],
  ["ecr_05", "T28-5005", "Busette complète pour queue optionnelle 25x108", "Écrou Rochet & Buse T28", "Guidage Outil", "Busette T28", "Busette acier trempé hexagonal 25x108", "PIECE", 860, "CRITIQUE", "Guide d'emmanchement hexagonal renforcé d'option de 25x108mm.", 3],
  ["ecr_06", "T28-5006", "Douille de busette interne en acier traité", "Écrou Rochet & Buse T28", "Guidage Outil", "Douille de busette", "Fourreau cylindrique usiné haute dureté", "PIECE", 330, "HAUTE", "Insert d'usure interchangeable logé dans l'alésage de la busette.", 3],
  ["ecr_07", "T28-5007", "Joint d'étanchéité plat d'embase de busette", "Écrou Rochet & Buse T28", "Presse-étoupe & Étanchéité", "Joint de busette", "Joint plat néoprène compressé", "PIECE", 95, "HAUTE", "Assure l'étanchéité pneumatique de soufflage sous la busette.", 3],
  ["ecr_08", "T28-5008", "Bague d'étanchéité interne de busette", "Écrou Rochet & Buse T28", "Presse-étoupe & Étanchéité", "Bague d'étanchéité busette", "Joint dynamique lèvre renforcée", "PIECE", 150, "HAUTE", "Joint étanche au refoulement de la boue et de l'eau d'injection.", 3],
  ["ecr_09", "T28-5009", "Guide avant complet avec sa busette standard", "Écrou Rochet & Buse T28", "Guidage Outil", "Guide avant et sa busette", "Guide avant d'origine Montabert T28", "PIECE", 2250, "CRITIQUE", "Ensemble guide avant complet pour perforateur de 28 kg béquille.", 2],
  ["ecr_10", "T28-5010", "Joint torique d'étanchéité de guide avant", "Écrou Rochet & Buse T28", "Presse-étoupe & Étanchéité", "Joint de guide avant", "Joint torique caoutchouc NBR 80 Shore", "PIECE", 80, "HAUTE", "Joint torique étanche entre le guide avant et l'alésage du cylindre.", 3],
  ["ecr_11", "T28-5011", "Bague de guidage en bronze de guide avant", "Écrou Rochet & Buse T28", "Guidage Outil", "Bague de guidage", "Bague fendue de centrage en bronze d'étain", "PIECE", 360, "HAUTE", "Douille de centrage maintenant l'outil de forage aligné dans l'axe.", 3],
  ["ecr_12", "T28-5012", "Rondelle d'usure et de friction guide avant", "Écrou Rochet & Buse T28", "Guidage Outil", "Rondelle de friction guide", "Rondelle de butée rectifiée acier trempé", "PIECE", 130, "MOYENNE", "Rondelle supportant l'impact du collet de l'outil lors de la frappe.", 3],
  ["ecr_13", "T28-5013", "Vis de fixation de guide avant M12 class 12.9", "Écrou Rochet & Buse T28", "Boulonnerie", "Vis de fixation guide", "Vis spéciale CHC à pas fin d'origine", "PIECE", 155, "HAUTE", "Vis CHC à pas fin d'assemblage du corps avant sur le cylindre.", 3],
  ["ecr_14", "T28-5014", "Écrou hexagonal autobloquant de guide avant", "Écrou Rochet & Buse T28", "Boulonnerie", "Écrou de fixation guide", "Écrou hexagonal auto-freiné à pas fin UNF", "PIECE", 55, "HAUTE", "Écrou de sécurité mécanique à serrage à fort couple.", 3],
  ["ecr_15", "T28-5015", "Rondelle plate de vis de guide avant", "Écrou Rochet & Buse T28", "Boulonnerie", "Rondelle de fixation", "Rondelle de serrage acier trempé élastique", "PIECE", 30, "MOYENNE", "Rondelle d'usure limitant les efforts de torsion au serrage.", 3],
  ["ecr_16", "T28-5016", "Joint torique de boîtier d'écrou rochet", "Écrou Rochet & Buse T28", "Presse-étoupe & Étanchéité", "Joint torique guide", "Joint torique FKM 80 Shore grand diamètre", "PIECE", 100, "HAUTE", "Assure l'étanchéité radiale d'embase du boîtier de rotation.", 3],
  ["ecr_17", "T28-5017", "Bouchon de guide de vidange et graissage", "Écrou Rochet & Buse T28", "Mécanisme de Rotation", "Bouchon de guide", "Bouchon fileté laiton tête fente M12", "PIECE", 65, "BASSE", "Bouchon de fermeture étanche pour le réservoir de graisse busette.", 3],
  ["ecr_18", "T28-5018", "Raccord de graissage de guide avant M10x1", "Écrou Rochet & Buse T28", "Mécanisme de Rotation", "Raccord de guide", "Graisseur hydraulique droit fileté G 1/4\" laiton", "PIECE", 50, "MOYENNE", "Nipple de graisseur pour lubrification directe au pistolet.", 3],
  ["ecr_19", "T28-5019", "Tuyau de dérivation de soufflage d'air", "Écrou Rochet & Buse T28", "Presse-étoupe & Étanchéité", "Tuyau de guide", "Tuyau d'assistance d'air moyenne pression", "PIECE", 195, "MOYENNE", "Flexible pour amener l'air de soufflage auxiliaire (250 l/min).", 3],
  ["ecr_20", "T28-5020", "Clapet de guide anti-retour d'injection", "Écrou Rochet & Buse T28", "Mécanisme de Rotation", "Clapet de guide", "Soupape anti-retour d'origine à clapet taré", "PIECE", 165, "HAUTE", "Empêche les boues de forage d'obstruer le conduit central d'eau.", 3],

  // ==========================================
  // SOUS-SYSTÈME 6 : OUTILS & ACCESSOIRES (25 pièces)
  // ==========================================
  ["out_01", "T28-6001", "Décaleur de forage standard 22x108", "Outils & Accessoires T28", "Outils de Forage", "Décaleur standard", "Outil extracteur acier forgé queue 22x108", "PIECE", 1150, "HAUTE", "Outil décaleur lourd pour débloquer les fleurets coincés de 22mm.", 3],
  ["out_02", "T28-6002", "Décaleur de forage renforcé 25x108", "Outils & Accessoires T28", "Outils de Forage", "Décaleur renforcé", "Outil extracteur acier forgé queue 25x108", "PIECE", 1300, "HAUTE", "Outil décaleur lourd pour débloquer les fleurets de 25mm.", 3],
  ["out_03", "T28-6003", "Queue de forage monobloc hexagonale H22", "Outils & Accessoires T28", "Outils de Forage", "Queue de forage", "Emmanchement hexagonal d'origine 22x108 rectifié", "PIECE", 890, "CRITIQUE", "Queue d'emmanchement d'origine de 22mm pour accoupler les tiges R32.", 3],
  ["out_04", "T28-6004", "Queue de forage monobloc hexagonale H25", "Outils & Accessoires T28", "Outils de Forage", "Queue de forage", "Emmanchement hexagonal optionnel 25x108 rectifié", "PIECE", 1020, "CRITIQUE", "Queue d'emmanchement de 25mm de diamètre d'option.", 3],
  ["out_05", "T28-6005", "Tige de forage filetée R32 longueur 2.4m", "Outils & Accessoires T28", "Tiges de Forage", "Tige de forage", "Tige filetée R32 en acier de cémentation", "PIECE", 1950, "HAUTE", "Tige de foration à haut coefficient de transmission de percussion.", 3],
  ["out_06", "T28-6006", "Tige de forage filetée R32 longueur 3.2m", "Outils & Accessoires T28", "Tiges de Forage", "Tige de forage", "Tige filetée R32 de grande longueur", "PIECE", 2300, "HAUTE", "Tige longue optimisant la vitesse de pénétration en mine.", 3],
  ["out_07", "T28-6007", "Mèche bouton carbure R32 diamètre 38mm", "Outils & Accessoires T28", "Taillants & Mèches", "Mèche de forage", "Taillant bouton carbure de tungstène", "PIECE", 890, "CRITIQUE", "Taillant de 38mm à boutons carbure d'origine pour foration rapide.", 3],
  ["out_08", "T28-6008", "Mèche bouton carbure R32 diamètre 45mm", "Outils & Accessoires T28", "Taillants & Mèches", "Mèche de forage", "Taillant bouton carbure renforcé de 45mm", "PIECE", 990, "CRITIQUE", "Taillant large recommandé pour boulonnage de parois sous-terraines.", 3],
  ["out_09", "T28-6009", "Foret trilobe carbure de tungstène 41mm", "Outils & Accessoires T28", "Taillants & Mèches", "Foret de forage", "Foret trilobe tranchant de 41mm", "PIECE", 820, "HAUTE", "Foret à lames carbure taillantes idéal pour les roches fracturées.", 3],
  ["out_10", "T28-6010", "Burin emmanchement hexagonal 22x108", "Outils & Accessoires T28", "Taillants & Mèches", "Burin de forage", "Burin plat acier forgé longueur 800mm", "PIECE", 440, "MOYENNE", "Outil d'écaillage et de purge manuelle de roche sur paroi.", 3],
  ["out_11", "T28-6011", "Pointe de forage de purge renforcée", "Outils & Accessoires T28", "Taillants & Mèches", "Pointe de forage", "Pointe pyramidale acier traité longueur 600mm", "PIECE", 410, "MOYENNE", "Pointe d'écrasement des roches dures de mine de rechange.", 3],
  ["out_12", "T28-6012", "Adaptateur de queue d'emmanchement R32/H22", "Outils & Accessoires T28", "Outils de Forage", "Adaptateur de queue 22x108", "Manchon d'adaptation R32 vers Hexagonal 22mm", "PIECE", 710, "HAUTE", "Raccord d'accouplement direct de la tige sur perforateur standard.", 3],
  ["out_13", "T28-6013", "Adaptateur de queue d'emmanchement R32/H25", "Outils & Accessoires T28", "Outils de Forage", "Adaptateur de queue 25x108", "Manchon d'adaptation R32 vers Hexagonal 25mm", "PIECE", 750, "HAUTE", "Raccord d'accouplement direct pour queue d'emmanchement d'option.", 3],
  ["out_14", "T28-6014", "Raccord de tige fileté R32 femelle", "Outils & Accessoires T28", "Tiges de Forage", "Raccord de tige", "Manchon fileté femelle R32 acier allié", "PIECE", 370, "HAUTE", "Manchon de liaison et raccordement lourd entre deux tiges filetées.", 3],
  ["out_15", "T28-6015", "Manchon de raccordement de tige rapide", "Outils & Accessoires T28", "Tiges de Forage", "Manchon de raccordement", "Raccord d'accouplement cannelé rapide", "PIECE", 430, "HAUTE", "Permet l'accouplement ultra-rapide des tiges sous fortes percussions.", 3],
  ["out_16", "T28-6016", "Clé de démontage rapide pour mèches R32", "Outils & Accessoires T28", "Outillage Spécifique", "Clé de démontage", "Clé à chocs manuelle en acier matricé", "PIECE", 190, "BASSE", "Clé lourde de desserrage rapide des taillants filetés R32.", 3],
  ["out_17", "T28-6017", "Clé de montage de tiges de forage", "Outils & Accessoires T28", "Outillage Spécifique", "Clé de montage", "Clé plate à créneau lourd en acier allié", "PIECE", 220, "BASSE", "Clé à créneaux facilitant le montage-démontage des tiges.", 3],
  ["out_18", "T28-6018", "Clé de serrage pour écrous de tirants", "Outils & Accessoires T28", "Outillage Spécifique", "Clé à écrou", "Clé polygonale contre-coudée de 24mm", "PIECE", 310, "MOYENNE", "Clé spéciale adaptée pour appliquer le fort couple requis sur les tirants.", 3],
  ["out_19", "T28-6019", "Clé à pipe de 19mm d'atelier", "Outils & Accessoires T28", "Outillage Spécifique", "Clé à pipe", "Clé forgée haute résistance 12 pans d'origine", "PIECE", 120, "BASSE", "Clé d'entretien pour les écrous du carter de distribution.", 3],
  ["out_20", "T28-6020", "Tournevis plat d'ajusteur (gros manche)", "Outils & Accessoires T28", "Outillage Spécifique", "Tournevis", "Tournevis à lame forgée traversante robuste", "PIECE", 80, "BASSE", "Outil de réglage manuel des pointeaux de débit d'eau et d'air.", 3],
  ["out_21", "T28-6021", "Maillet lourd anti-rebond d'atelier", "Outils & Accessoires T28", "Outillage Spécifique", "Maillet", "Maillet en acier rempli de micro-billes d'acier", "PIECE", 250, "BASSE", "Maillet lourd amorti évitant de marquer les portées d'étanchéité.", 3],
  ["out_22", "T28-6022", "Filtre à air haute pression d'origine", "Outils & Accessoires T28", "Fluides & Filtration", "Filtre à air", "Séparateur d'impuretés cyclone métallique", "PIECE", 890, "MOYENNE", "Filtre cyclone stoppant le sable et les particules du réseau de 6 bar.", 3],
  ["out_23", "T28-6023", "Filtre à eau de mine tamis fin inox", "Outils & Accessoires T28", "Fluides & Filtration", "Filtre à eau", "Filtre à tamis inoxydable lavable 7 l/min", "PIECE", 450, "MOYENNE", "Tamis inox empêchant le colmatage du tube central d'eau.", 3],
  ["out_24", "T28-6024", "Séparateur d'eau pneumatique automatique", "Outils & Accessoires T28", "Fluides & Filtration", "Séparateur eau/air", "Purgeur automatique à flotteur", "PIECE", 1150, "HAUTE", "Purgeur d'humidité éliminant la condensation du flux d'air.", 3],
  ["out_25", "T28-6025", "Régulateur de pression d'air 6 bar", "Outils & Accessoires T28", "Fluides & Filtration", "Régulateur de pression", "Détendeur de pression lourd à membrane renforcée", "PIECE", 1300, "HAUTE", "Régulateur d'air d'origine taré pour fournir une pression de 6 bar.", 3],

  // ==========================================
  // SOUS-SYSTÈME 7 : POUSSOIR (JACK LEG) & FIXATION (20 pièces)
  // ==========================================
  ["pou_01", "T28-7001", "Poussoir béquille pneumatique complet T28", "Poussoir & Fixation T28", "Béquille Pneumatique", "Poussoir jack leg", "Béquille télescopique course 1.3m", "PIECE", 6950, "CRITIQUE", "Béquille pneumatique d'origine Montabert T28 renforcée pour supporter le poids de 28 kg.", 2],
  ["pou_02", "T28-7002", "Tube extérieur de béquille pneumatique T28", "Poussoir & Fixation T28", "Béquille Pneumatique", "Tube extérieur", "Tube en alliage d'aluminium laminé à froid", "PIECE", 1700, "HAUTE", "Cylindre principal de poussée de la béquille pneumatique.", 3],
  ["pou_03", "T28-7003", "Tube intérieur de béquille de poussée", "Poussoir & Fixation T28", "Béquille Pneumatique", "Tube intérieur", "Tige de poussée en acier chromé dur", "PIECE", 1500, "HAUTE", "Tige télescopique mobile transmettant la force d'avance axiale.", 3],
  ["pou_04", "T28-7004", "Piston de guidage interne de béquille", "Poussoir & Fixation T28", "Béquille Pneumatique", "Piston de poussoir", "Piston de poussée usiné équipé", "PIECE", 890, "HAUTE", "Piston double effet en aluminium allié guidant la translation interne.", 3],
  ["pou_05", "T28-7005", "Joint de piston de béquille d'origine", "Poussoir & Fixation T28", "Presse-étoupe & Étanchéité", "Joint de poussoir", "Joint de piston double lèvre polyuréthane", "PIECE", 150, "HAUTE", "Joint à lèvre d'origine prévenant les fuites lors du déploiement.", 3],
  ["pou_06", "T28-7006", "Bague d'étanchéité et racleur avant poussoir", "Poussoir & Fixation T28", "Béquille Pneumatique", "Bague d'étanchéité", "Presse-étoupe avant équipé", "PIECE", 310, "HAUTE", "Retient la pression interne et racle la boue lors du repli télescopique.", 3],
  ["pou_07", "T28-7007", "Ressort de rappel interne de béquille T28", "Poussoir & Fixation T28", "Béquille Pneumatique", "Ressort de poussoir", "Ressort hélicoïdal de traction acier trempé", "PIECE", 410, "MOYENNE", "Ressort lourd assurant le repli automatique rapide de l'avance.", 3],
  ["pou_08", "T28-7008", "Pied d'ancrage à griffe de béquille", "Poussoir & Fixation T28", "Béquille Pneumatique", "Pied de poussoir", "Griffe d'ancrage sol en acier cémenté", "PIECE", 520, "HAUTE", "Griffe à dents pointues assurant une prise rigide dans la roche.", 3],
  ["pou_09", "T28-7009", "Chape de béquille supérieure articulée", "Poussoir & Fixation T28", "Béquille Pneumatique", "Chape de poussoir", "Tête d'articulation en acier matricé", "PIECE", 550, "HAUTE", "Chape de pivotement liant l'axe télescopique au support perforateur.", 3],
  ["pou_10", "T28-7010", "Œilleton de fixation de perforateur T28", "Poussoir & Fixation T28", "Béquille Pneumatique", "Œilleton de fixation", "Axe à œillet de fixation haute résistance", "PIECE", 330, "HAUTE", "Axe d'accouplement lourd d'origine pour perforateur de 28 kg.", 3],
  ["pou_11", "T28-7011", "Goupille d'articulation rapide de béquille", "Poussoir & Fixation T28", "Béquille Pneumatique", "Goupille de fixation", "Axe d'accouplement goupillé acier allié", "PIECE", 70, "MOYENNE", "Axe amovible de connexion rapide entre perforateur et béquille.", 3],
  ["pou_12", "T28-7012", "Circlips d'arrêt d'axe de chape béquille", "Poussoir & Fixation T28", "Béquille Pneumatique", "Circlips de fixation", "Circlips acier ressort de rechange", "PIECE", 35, "BASSE", "Assure le verrouillage transversal de l'axe d'articulation.", 3],
  ["pou_13", "T28-7013", "Chaîne de sécurité en acier de mine (1.2m)", "Poussoir & Fixation T28", "Béquille Pneumatique", "Chaîne de sécurité", "Chaîne de sécurité galvanisée maillons soudés", "PIECE", 240, "BASSE", "Chaîne de retenue lors des chocs et déconnexions de pression.", 3],
  ["pou_14", "T28-7014", "Crochet de sécurité en acier forgé", "Poussoir & Fixation T28", "Béquille Pneumatique", "Crochet de sécurité", "Mousqueton de sécurité à vis lourd", "PIECE", 120, "BASSE", "Mousqueton d'accrochage rapide de la chaîne anti-chute.", 3],
  ["pou_15", "T28-7015", "Support de perforateur oscillant d'origine", "Poussoir & Fixation T28", "Support & Berceau", "Support de perforateur", "Console support articulée en acier forgé", "PIECE", 1200, "HAUTE", "Support d'articulation pivotant permettant le basculement.", 2],
  ["pou_16", "T28-7016", "Berceau de guidage d'origine T28", "Poussoir & Fixation T28", "Support & Berceau", "Berceau", "Berceau fonte d'acier usinée de guidage", "PIECE", 1550, "HAUTE", "Berceau lourd d'origine d'accouplement du perforateur.", 3],
  ["pou_17", "T28-7017", "Vis de fixation de berceau M12 classe 12.9", "Poussoir & Fixation T28", "Boulonnerie", "Vis de fixation berceau", "Vis spéciale CHC à pas fin d'origine", "PIECE", 90, "HAUTE", "Visserie haute résistance d'origine pour monter le berceau.", 3],
  ["pou_18", "T28-7018", "Écrou freiné de fixation de berceau M12", "Poussoir & Fixation T28", "Boulonnerie", "Écrou de fixation berceau", "Écrou hexagonal freiné lourd zingué", "PIECE", 50, "HAUTE", "Écrou auto-freiné à bague nylon assurant la retenue sous vibrations.", 3],
  ["pou_19", "T28-7019", "Rondelle conique de blocage de berceau", "Poussoir & Fixation T28", "Boulonnerie", "Rondelle de fixation", "Rondelle élastique acier ressort Belleville", "PIECE", 30, "MOYENNE", "Rondelle conique Belleville absorbant les micro-vibrations.", 3],
  ["pou_20", "T28-7020", "Joint d'amortissement de berceau néoprène", "Poussoir & Fixation T28", "Support & Berceau", "Joint de fixation", "Semelle amortisseur élastomère souple", "PIECE", 100, "BASSE", "Joint de berceau limitant l'usure de friction des carters du T28.", 3],

  // ==========================================
  // SOUS-SYSTÈME 8 : CONSOMMABLES & PIÈCES D'USURE (20 pièces)
  // ==========================================
  ["con_01", "T28-8001", "Pochette de joints complète d'origine T28", "Consommables & Pièces d'Usure T28", "Kits de Maintenance", "Kit de joints complet", "Pochette de joints élastomère FKM et NBR", "KIT", 750, "CRITIQUE", "Kit d'origine comprenant tous les joints plats et toriques de rechange du perforateur.", 1],
  ["con_02", "T28-8002", "Kit de bagues d'étanchéité d'origine T28", "Consommables & Pièces d'Usure T28", "Kits de Maintenance", "Kit de bagues d'étanchéité", "Kit de bagues d'étanchéité dynamique", "KIT", 450, "HAUTE", "Kit de rechange comprenant bague de nez, bague de guidage et racleur.", 1],
  ["con_03", "T28-8003", "Pochette de joints toriques assortis T28", "Consommables & Pièces d'Usure T28", "Kits de Maintenance", "Kit de joints toriques", "Assortiment joints toriques d'étanchéité", "JEU", 320, "HAUTE", "Jeu de joints toriques de rechange pour les opérations d'entretien.", 2],
  ["con_04", "T28-8004", "Jeu de rondelles cuivre d'étanchéité (x10)", "Consommables & Pièces d'Usure T28", "Kits de Maintenance", "Kit de rondelles cuivre", "Rondelles d'étanchéité cuivre recuit", "JEU", 130, "MOYENNE", "Lot de 10 rondelles cuivre d'étanchéité pour les filetages d'alimentation.", 2],
  ["con_05", "T28-8005", "Kit complet de vis et écrous d'origine T28", "Consommables & Pièces d'Usure T28", "Kits de Maintenance", "Kit de vis et écrous", "Toute la visserie de rechange classe 12.9", "ASSEMBLY", 580, "HAUTE", "Jeu complet de rechange comprenant vis CHC, écrous borgnes et rondelles Belleville.", 2],
  ["con_06", "T28-8006", "Bague d'étanchéité standard d'embase", "Consommables & Pièces d'Usure T28", "Presse-étoupe & Étanchéité", "Bague d'étanchéité standard", "Nitrile NBR 75 Shore de rechange", "PIECE", 85, "HAUTE", "Joint en élastomère nitrile pour le corps d'embase avant.", 3],
  ["con_07", "T28-8007", "Bague d'étanchéité haute température Viton", "Consommables & Pièces d'Usure T28", "Presse-étoupe & Étanchéité", "Bague d'étanchéité Viton", "FKM de haute performance thermique", "PIECE", 150, "HAUTE", "Alternative d'étanchéité en élastomère Viton pour les chantiers chauds.", 3],
  ["con_08", "T28-8008", "Bague d'étanchéité renforcée double lèvre NBR", "Consommables & Pièces d'Usure T28", "Presse-étoupe & Étanchéité", "Bague d'étanchéité NBR", "Elastomère butadiène-acrylonitrile", "PIECE", 95, "HAUTE", "Joint à lèvres renforcé d'origine contre les infiltrations de boue.", 3],
  ["con_09", "T28-8009", "Joint torique d'étanchéité NBR 70 Shore", "Consommables & Pièces d'Usure T28", "Presse-étoupe & Étanchéité", "Joint torique NBR", "Diamètre standard pour conduits d'admission", "PIECE", 50, "HAUTE", "Joint torique de raccord d'admission d'air comprimé.", 3],
  ["con_10", "T28-8010", "Joint torique d'étanchéité Viton FKM", "Consommables & Pièces d'Usure T28", "Presse-étoupe & Étanchéité", "Joint torique Viton", "FKM 80 Shore haute résistance thermique", "PIECE", 70, "HAUTE", "Joint torique supportant l'agressivité des huiles lubrifiantes.", 3],
  ["con_11", "T28-8011", "Joint torique d'étanchéité EPDM d'injection", "Consommables & Pièces d'Usure T28", "Presse-étoupe & Étanchéité", "Joint torique EPDM", "Excellent comportement au délavage eau de mine", "PIECE", 60, "HAUTE", "Joint torique pour le raccordement d'injection d'eau (7 l/min).", 3],
  ["con_12", "T28-8012", "Rondelle d'étanchéité cuivre recuit 10x14", "Consommables & Pièces d'Usure T28", "Presse-étoupe & Étanchéité", "Rondelle cuivre", "Rondelle cuivre étanchéité de graisseur", "PIECE", 15, "HAUTE", "Joint pour les bouchons de graissage de l'écrou rochet.", 3],
  ["con_13", "T28-8013", "Rondelle plate inox M12 de tirant", "Consommables & Pièces d'Usure T28", "Boulonnerie d'Usure", "Rondelle inox", "Acier inoxydable classe 12.9", "PIECE", 25, "HAUTE", "Rondelle plate de rechange pour les tirants de la tête arrière.", 3],
  ["con_14", "T28-8014", "Rondelle ressort hélicoïdale M12", "Consommables & Pièces d'Usure T28", "Boulonnerie d'Usure", "Rondelle ressort", "Rondelle Grower acier bruni de rechange", "PIECE", 25, "HAUTE", "Rondelle Grower de rechange empêchant le desserrage sous chocs.", 3],
  ["con_15", "T28-8015", "Goupille élastique fendue de blocage Ø6x40", "Consommables & Pièces d'Usure T28", "Boulonnerie d'Usure", "Goupille élastique", "Goupille de blocage acier ressort ISO 8752", "PIECE", 20, "HAUTE", "Goupille métallique de rechange pour verrouiller les axes d'articulation.", 3],
  ["con_16", "T28-8016", "Graisse d'origine spéciale hautes températures", "Consommables & Pièces d'Usure T28", "Fluides & Filtration", "Graisse haute température", "Cartouche de graisse graphitée 400g", "PIECE", 110, "HAUTE", "Cartouche de graisse spéciale résistante au délavage pour busette.", 3],
  ["con_17", "T28-CON-017", "Vis de fixation M8 x 25mm zinguée", "Consommables & Pièces d'Usure T28", "Boulonnerie d'Usure", "Vis de fixation", "M8 x 25mm", "PIECE", 15, "BASSE", "Vis de fixation standard pour assemblages légers.", 3],
  ["con_18", "T28-CON-018", "Vis de fixation M10 x 30mm zinguée", "Consommables & Pièces d'Usure T28", "Boulonnerie d'Usure", "Vis de fixation", "M10 x 30mm", "PIECE", 20, "BASSE", "Vis de fixation standard pour assemblages moyens.", 3],
  ["con_19", "T28-CON-019", "Écrou hexagonal M10 zingué", "Consommables & Pièces d'Usure T28", "Boulonnerie d'Usure", "Écrou hexagonal", "M10", "PIECE", 12, "BASSE", "Écrou hexagonal d'assemblage standard M10.", 3],
  ["con_20", "T28-CON-020", "Circlips extérieur pour arbre Ø25mm", "Consommables & Pièces d'Usure T28", "Boulonnerie d'Usure", "Circlips extérieur", "Ø25mm", "PIECE", 25, "BASSE", "Circlips extérieur en acier pour retenue d'axe de diamètre 25mm.", 3]
];

export const T28_CATALOG: CatalogItem[] = RAW_ITEMS.map((item) => {
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

  const subsystemPrefix = functionalCategory.replace(" T28", "").toUpperCase();
  const componentPrefix = component.toUpperCase();
  const designation = `[${subsystemPrefix}] - [${componentPrefix}] - ${designationRaw} - (Ref: ${reference})`;

  // Derived stock stats for underground inventory simulation (-350m)
  const stockQty = Math.floor(Math.sin(price) * 12) + 18;
  const minStock = Math.max(2, Math.floor(stockQty * 0.4));
  const criticalStock = Math.max(1, Math.floor(minStock * 0.5));
  const leadTimeDays = Math.floor(Math.sin(price + 10) * 4) + 8;

  return {
    id: `t28_${idSuffix}`,
    reference,
    designation,
    functionalCategory,
    subCategory,
    component,
    subComponent,
    unit,
    price,
    proposedPrice: price,
    compatibility: "Montabert T28",
    criticality,
    suggestedType: "OUTILS" as any,
    source: "MASTER",
    bomLevel,
    notes,
    stockQty,
    minStock,
    criticalStock,
    leadTimeDays,
    commonName: `${component} T28`,
    searchTags: [
      "T28",
      "MONTABERT",
      "FORAGE",
      "PNEUMATIQUE",
      subsystemPrefix,
      componentPrefix,
      reference
    ]
  };
});
