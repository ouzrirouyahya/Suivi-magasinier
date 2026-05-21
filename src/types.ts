
import { Timestamp, FieldValue } from 'firebase/firestore';

export type FirestoreDate = string | Timestamp | FieldValue | any;

export type SiteCode = 'SMI' | 'OUMEJRANE' | 'KOUDIA' | 'BOU-AZZER' | 'OUANSIMI';

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
  role: 'ADMIN' | 'MAGASINIER';
  active: boolean;
  createdAt: FirestoreDate;
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
  price?: number;
  active: boolean;
  lastInventoryDate?: string;
  notes?: string;
}

export interface CatalogItem {
  id: string;
  reference: string;
  designation: string;
  functionalCategory: string;
  subCategory: string;
  component: string;
  subComponent: string;
  notes?: string;
  price?: number;
  suggestedType: StockType;
  source?: 'MASTER' | 'UPLOAD';
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
}

export interface EnginMaster {
  id: string;
  code: string; // Ex: EX-01
  label: string;
  site: SiteCode;
  type: 'PELLE' | 'DUMPER' | 'VEHICULE' | 'AUTRE';
}

export interface PerfoMaster {
  id: string;
  code: string; // Ex: PERFO 1
  site: SiteCode;
}

export interface AgentMaster {
  id: string;
  matricule: string;
  firstname: string;
  lastname: string;
  service: string;
  site: SiteCode;
}

export interface Transfert {
  id: string;
  sourceSite: SiteCode;
  targetSite: SiteCode;
  dateEnvoi: FirestoreDate;
  dateReception?: FirestoreDate;
  reference: string;
  items: MouvementItem[];
  status: 'PENDING_APPROVAL' | 'IN_TRANSIT' | 'RECEIVED' | 'DISPUTED' | 'CLOSED' | 'EN_TRANSIT' | 'RECU' | 'LITIGE';
  expediteur: string;
  recepteur?: string;
  disputeReason?: string;
  receivedItems?: MouvementItem[];
}

export interface Inventaire {
  id: string;
  site: SiteCode;
  date: string;
  type: 'TOURNANT' | 'ANNUEL';
  status: 'OUVERT' | 'VALIDE';
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
