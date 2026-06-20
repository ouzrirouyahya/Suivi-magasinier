
import { Timestamp, FieldValue } from 'firebase/firestore';

export type FirestoreDate = string | Timestamp | FieldValue | any;

export type SiteCode = 'SMI' | 'OUMEJRANE' | 'KOUDIA' | 'BOU-AZZER' | 'OUANSIMI' | 'ALL';

export type StockType = 'ENGINS' | 'PERFORATEURS' | 'CONSOMMABLES' | 'EPI' | 'OUTILS_TRAVAUX' | 'AUTRES';
export type ArticleType = StockType;

export interface Engin {
  id: string;
  code: string;
  type: string;
  site: SiteCode;
}

export interface Perforateur {
  id: string;
  code: string;
  type: string;
  site: SiteCode;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER' | 'LECTURE_SEULE';
  active: boolean;
  createdAt: FirestoreDate;
  assignedSite?: SiteCode;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedRole?: 'ADMIN' | 'MAGASINIER';
}

export interface Article {
  id: string;
  site: SiteCode;
  ref: string;
  designation: string;
  type: StockType;
  category: string;
  // Hierarchy fields from master catalog
  functionalCategory?: string; // e.g. "Système de Propulsion"
  subCategory?: string;        // e.g. "Moteur Complet"
  component?: string;          // e.g. "Bloc moteur"
  subComponent?: string;       // e.g. "Coussinet"
  unit: string;
  quantity: number;
  minStock: number;
  location: string; // Emplacement (ex: Rayon A-12)
  supplier?: string; // Fournisseur habituel
  price?: number; // PMP (Prix Moyen Pondéré)
  lastPurchasePrice?: number; // Dernier prix d'achat réel du Bon d'Entrée
  priceHistory?: PriceHistoryEntry[]; // Traçabilité complète des variations de prix
  active: boolean;
  lastInventoryDate?: string;
  notes?: string;
  compatibility?: string;
  criticality?: 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';
}

export interface PriceHistoryEntry {
  date: string;
  price: number;
  type: 'PMP' | 'ACHAT';
  quantityAttached?: number;
  mouvementId?: string;
  userEmail?: string;
}

export interface CatalogItem {
  id: string;
  reference: string;
  designation: string;
  functionalCategory: string; // Map to Level 1 Subsystem in BOM System
  subCategory: string;        // Map to Level 2 Assembly in BOM System
  component: string;          // Map to Level 3 Component in BOM System
  subComponent: string;       // Map to specification / subComponent
  notes?: string;
  price?: number;
  proposedPrice?: number;
  suggestedType: StockType;
  source?: 'MASTER' | 'UPLOAD';
  compatibility?: string;     // Map to Level 0 Machine in BOM System (e.g., ST2G, ST2D, MONTABERT)
  criticality?: 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';
  
  // Advanced Level 3 Intelligent BOM Parameters
  bomLevel?: 0 | 1 | 2 | 3;
  unit?: 'PIECE' | 'KIT' | 'ASSEMBLY' | 'SET';
  criticalityScore?: number;        // Score from 1 to 100
  mtbfHours?: number;               // Mean Time Between Failures in operational hours
  overhaulIntervalHours?: number;   // Recommended interval before rebuild
  failureModes?: string[];          // List of common failure modes
  relatedItems?: string[];          // IDs or references of dependent components/kits

  // ERP V3.1 Extensions for Real Underground Mining Conditions (-350m)
  // --- MODULE STOCK MAGASIN ---
  stockQty?: number;
  minStock?: number;
  criticalStock?: number;
  leadTimeDays?: number;
  supplierReal?: string;
  replacementRisk?: 'LOW' | 'MEDIUM' | 'HIGH';

  // --- MODULE MAGASINIER TERRAIN ---
  commonName?: string;              // Simplified field name used by operators
  searchTags?: string[];            // Emergency keywords
  urgentUse?: boolean;              // Highlight critical status for shift handover

  // --- MODULE COMPATIBILITÉ ---
  compatibleMachines?: string[];    // Direct machine models (e.g. ['ST2G', 'ST2D'])
  interchangeableWith?: string[];   // List of alternative interchangeable part numbers/IDs

  // --- MODULE FIABILITÉ ---
  mtbfStatus?: 'ESTIMATED' | 'FIELD_PROVEN';

  // --- MODULE MAINTENANCE OPÉRATIONNELLE ---
  operationalPriority?: 1 | 2 | 3 | 4 | 5; // 1 = lowest, 5 = highest emergency
  downtimeImpact?: 'LOW' | 'MEDIUM' | 'CRITICAL';

  // --- MODULE HISTORIQUE PANNES ---
  realFailureReports?: {
    date: string;
    symptom: string;
    causeFound: string;
  }[];
}

export type MouvementType = 'ENTREE' | 'SORTIE' | 'TRANSFERT_OUT' | 'TRANSFERT_IN' | 'AJUSTEMENT' | 'RETOUR';

export interface MaintenanceLog {
  id: string;
  machineId: string; // ID for Engin or Perfo
  machineType: 'ENGIN' | 'PERFO';
  date: FirestoreDate;
  type: 'PREVENTIVE' | 'CURATIVE' | 'PREDICTIVE';
  description: string;
  hoursCounter?: number;
  partsUsed: { articleId: string, quantity: number }[];
  cost?: number;
  performer: string;
}

export interface MachineHealth {
  machineId: string;
  lastMaintenance: string;
  nextMaintenanceDue: string;
  healthScore: number; // 0-100
  predictionNotes: string;
}

export interface MouvementItem {
  articleId: string;
  quantity: number;
  price: number;
  lotNumber?: string; // Suivi par lot
  expiryDate?: string; // Date d'expiration
  beneficiaryId?: string; // ID of worker receiving the item
  beneficiaryName?: string; // Name of worker receiving the item
  beneficiaryService?: string; // Service of worker receiving the item
  quantityReceived?: number; // Saisie à la réception (Phase 7)
  quantityDamaged?: number; // Saisie à la réception (Phase 7)
  comment?: string; // Commentaire par article (Phase 7)
}

export interface Mouvement {
  id: string; 
  site: SiteCode;
  date: FirestoreDate;
  type: MouvementType;
  reference?: string; 
  items: MouvementItem[];
  vendeur?: string;
  demandeur?: string;
  mecanicien?: string;
  foreur?: string;
  service?: string;
  engin?: string;
  perforateur?: string;
  beneficiaire?: string; // Nom de la personne qui reçoit l'EPI ou l'article
  referenceEngin?: string; // Référence de l'engin pour plus de précision
  targetSite?: SiteCode; // For transfers
  status: 'BROUILLON' | 'VALIDE' | 'EN_TRANSIT' | 'COMPLETE';
  effectiveDemandeur?: string;
  category?: string;
  notes?: string;
  motif?: string; // Justification for the exit
  interventionType?: string;
  createdBy?: string; // Operator who created the movement
}

export interface EnginMaster {
  id: string;
  code: string; // Ex: EX-01
  label: string;
  site: SiteCode;
  type: 'PELLE' | 'DUMPER' | 'VEHICULE' | 'AUTRE';
  workingLocation?: string; // IMITER 2, IMITER 1, IMITER EST, IMITER EST BURE, etc.
}

export interface PerfoMaster {
  id: string;
  code: string; // Ex: PERFO 1
  site: SiteCode;
  location?: string; // IMITER 2, IMITER 1, IMITER EST, etc.
  sectorManager?: string; // Nom & Prénom du responsable de secteur
}

export interface AgentMaster {
  id: string;
  matricule: string;
  firstname: string;
  lastname: string;
  service: string;
  site: SiteCode;
  fonction?: string; // Ex: MINEUR, CHEF D'EQUIPE, MECANICIEN, COMMIS
}

export type TransfertStatus = 
  | 'BROUILLON' 
  | 'DEMANDE' 
  | 'APPROUVE' 
  | 'EXPEDIE' 
  | 'RECEPTIONNE' 
  | 'ACCEPTE' 
  | 'LITIGE'
  | 'PENDING_APPROVAL' | 'IN_TRANSIT' | 'RECEIVED' | 'DISPUTED' | 'CLOSED' | 'EN_TRANSIT' | 'RECU'; // Compatibilité descendante

export interface TransfertHistoryEntry {
  status: TransfertStatus;
  date: string;
  userEmail: string;
  comment?: string;
}

export interface Transfert {
  id: string;
  sourceSite: SiteCode;
  targetSite: SiteCode;
  dateEnvoi: FirestoreDate;
  dateReception?: FirestoreDate;
  reference: string;
  items: MouvementItem[];
  status: TransfertStatus;
  expediteur: string;
  recepteur?: string;
  disputeReason?: string;
  receivedItems?: MouvementItem[];
  // Nouveaux champs Phase 7
  creatorEmail?: string;
  approverEmail?: string;
  shipperEmail?: string;
  receiverEmail?: string;
  history?: TransfertHistoryEntry[];
}

export interface Inventaire {
  id: string;
  site: SiteCode;
  date: string;
  type: 'TOURNANT' | 'ANNUEL';
  status: 'OUVERT' | 'VALIDE';
  compteur?: string;
  validePar?: string;
  items: {
    articleId: string;
    theoricQuantity: number;
    countedQuantity: number;
    difference: number;
    justification?: string;
  }[];
}

export interface DistributionEPI {
  id: string;
  site: SiteCode;
  agentName: string;
  service: string;
  articleId: string;
  date: string;
  quantity: number;
}

export interface AuditLog {
  id: string;
  timestamp: FirestoreDate;
  userEmail: string;
  site: SiteCode;
  action: string;
  details: string;
  amount?: number;
  userId?: string;
  userRole?: string;
  deviceInfo?: string;
  sourcePlatform?: string;
}

export interface PurchaseRequest {
  id: string;
  site: SiteCode;
  date: string;
  status: 'BROUILLON' | 'ENVOYE' | 'VALIDE' | 'COMMANDE' | 'RECU';
  items: {
    articleId: string;
    quantity: number;
    lastPrice?: number;
    estimatedPrice?: number;
  }[];
  notes?: string;
  createdBy: string;
  reference?: string;
}

export interface AnomalyReport {
  id: string;
  site: SiteCode;
  timestamp: FirestoreDate;
  type: 'CONSUMPTION_PATTERN' | 'STOCK_INCOHERENCE' | 'FREQUENT_CHANGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  articleId?: string;
  machineId?: string;
  suggestedAction?: string;
  status: 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
}

export interface AppNotification {
  id: string;
  siteId: string;
  userId?: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'STOCK' | 'TRANSFER' | 'SYNC' | 'SYSTEM' | 'DAILY';
  message: string;
  timestamp: string;
  relatedEntityId?: string;
  actionRoute: string;
  isRead: boolean;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SYSTEM';
  status: 'read' | 'unread';
}

export interface DeletionRequest {
  id: string;
  articleIds: string[];
  articleRefs: string[];
  articleDesignations: string[];
  site: SiteCode;
  requestedBy: string;
  requestedAt: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}

export interface HydrominesCatalogItem {
  id: string;
  reference: string;
  designation: string;
  suggestedType: string;
  functionalCategory: string;
  unit: string;
  sourceCatalog: string; // e.g. "ST2G", "ST2D", "T23", etc.
  equipmentFamily: 'ST2G' | 'ST2D' | 'T23' | 'EPI' | 'CONSOMMABLES' | 'AUTRE';
  status: 'ACTIF' | 'INACTIF';
  isHydrominesCritical?: boolean;
  createdAt: string;
  updatedAt: string;
}



