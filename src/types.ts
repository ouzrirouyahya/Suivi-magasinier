
import { Timestamp, FieldValue } from './lib/db';
import type { SiteCode } from './lib/constants';

export type FirestoreDate = string | Timestamp | FieldValue;
export type { SiteCode };

export function toDateString(date: FirestoreDate | null | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  // Firestore Timestamp (objet avec seconds)
  if (typeof date === 'object' && 'seconds' in date && typeof (date as any).seconds === 'number') {
    return new Date((date as any).seconds * 1000).toISOString();
  }
  // FieldValue (serverTimestamp etc.) — pas de conversion possible
  return '';
}

export function compareDates(a: FirestoreDate | null | undefined, b: FirestoreDate | null | undefined): number {
  const dateA = toDateString(a);
  const dateB = toDateString(b);
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  return dateA.localeCompare(dateB);
}

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

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MAGASINIER' | 'RESPONSABLE_CHANTIER';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: FirestoreDate;
  assignedSite?: SiteCode;
  status?: 'PENDING' | 'PENDING_REGISTRATION' | 'APPROVED' | 'REJECTED' | 'DISABLED';
  requestedRole?: 'ADMIN' | 'MAGASINIER' | 'RESPONSABLE_CHANTIER';
  canWrite?: boolean;
  isReplacingMagasinier?: boolean;
  replacementStartDate?: string;
  replacementEndDate?: string;
  replacementReason?: string;
  replacementRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
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
  hydrominesCatalogRefId?: string; // Référence vers HydrominesCatalogItem.id d'origine
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
  unit?: 'PIECE' | 'KIT' | 'ASSEMBLY' | 'SET' | 'JEU' | 'LITRE' | 'METRE';
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

export interface ReplacementRequest {
  id: string;
  userId: string;           // ID du responsable
  userEmail: string;
  userName: string;
  site: SiteCode;
  startDate: string;        // ISO date
  endDate: string;          // ISO date (startDate + days)
  reason: string;           // Motif d'absence du magasinier
  requestedAt: string;      // ISO date
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  approvedBy?: string;     // ID du SUPER_ADMIN qui a approuvé
  approvedAt?: string;     // ISO date
}

/**
 * =========================================================================
 * AJOUTS ET MODIFICATIONS - ÉTAPE 2 : NOUVEAUX TYPES CATALOGUE & ST7
 * =========================================================================
 */

/**
 * Familles d'équipements gérées par la plateforme Hydromines.
 */
export type EquipmentFamily = 'ST2G' | 'ST2D' | 'ST7' | 'T23' | 'T28' | 'EPI' | 'CONSOMMABLES' | 'AUTRE';

/**
 * Filtre de recherche et de navigation pour le catalogue principal.
 */
export interface CatalogFilter {
  equipmentFamily: EquipmentFamily;
  searchQuery?: string;
  category?: string;
  subCategory?: string;
}

/**
 * Configuration visuelle pour le sélecteur graphique d'équipements/modèles dans l'UI.
 */
export interface CatalogSelectorConfig {
  id: EquipmentFamily;
  label: string;
  description: string;
  color: string; // Classes de gradients Tailwind (ex: from-blue-500 to-indigo-600)
  icon?: string;
}

export interface HydrominesCatalogItem {
  id: string;
  reference: string;
  designation: string;
  suggestedType: string;
  functionalCategory: string;
  unit: string;
  sourceCatalog: string; // e.g. "ST2G", "ST2D", "T23", etc.
  equipmentFamily: EquipmentFamily; // Modifié pour utiliser le nouveau type consolidé avec ST7
  status: 'ACTIF' | 'INACTIF';
  isHydrominesCritical?: boolean;
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// PHASE 1 — MESSAGERIE & NOTIFICATIONS BANNIÈRES
// Extensions de types pour le système de communication interne Hydromines
// =========================================================================

export type MessagePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type MessageTargetType = 'INDIVIDUAL' | 'SITE' | 'ROLE' | 'ALL';

export type MessageStatus = 'ACTIVE' | 'DELETED_BY_SENDER';

export type RecipientStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

export type TelemetryEventType =
  | 'MESSAGE_OPENED'
  | 'MESSAGE_CLOSED'
  | 'REPLY_STARTED'
  | 'REPLY_DRAFT_SAVED'
  | 'REPLY_TEXT_EDITED'
  | 'REPLY_TEXT_DELETED'
  | 'REPLY_SENT'
  | 'ATTACHMENT_OPENED'
  | 'MESSAGE_SCROLLED'
  | 'USER_TYPING';

export type BannerStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'DELETED';

export interface MessageAttachment {
  id: string;
  fileName: string;
  originalUrl: string;           // URL Firebase Storage (original)
  compressedUrl?: string;        // URL Firebase Storage (compressé)
  mimeType: string;
  sizeBytes: number;
  compressedSizeBytes?: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface MessageRecipient {
  userId: string;                // Email
  userName: string;
  userRole: UserRole;
  site: SiteCode;
  status: RecipientStatus;
  readAt?: string;               // Heure exacte de lecture
  timeSpentSeconds?: number;     // Temps passé avant réponse/fermeture
  dismissedAt?: string;
}

export interface SystemMessage {
  id: string;
  senderId: string;              // Email expéditeur
  senderName: string;
  senderRole: UserRole;
  senderSite: SiteCode;

  // Ciblage
  targetType: MessageTargetType;
  targetSite?: SiteCode;         // Si targetType === 'SITE'
  targetRole?: UserRole;         // Si targetType === 'ROLE'
  targetUserId?: string;         // Si targetType === 'INDIVIDUAL'

  // Contenu
  subject: string;
  body: string;
  priority: MessagePriority;
  attachments?: MessageAttachment[];

  // Thread / Conversation
  parentId?: string;             // ID du message parent (pour réponses)
  threadId: string;              // ID racine de la conversation
  replyCount: number;

  // Recipients (denormalisé pour lecture rapide sans jointure)
  recipientIds: string[];          // Tableau des emails destinataires
  recipients: MessageRecipient[];

  // Métadonnées
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: MessageStatus;
}

export interface UserInboxItem {
  id: string;                    // = messageId
  userId: string;                // Email du propriétaire de l'inbox
  messageId: string;             // Référence vers SystemMessage.id
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderSite: SiteCode;
  subject: string;
  body: string;                  // Tronqué si > 500 caractères, "..." ajouté
  priority: MessagePriority;
  threadId: string;
  parentId?: string;
  hasAttachments: boolean;
  attachmentCount: number;
  status: RecipientStatus;
  readAt?: string;
  timeSpentSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDraft {
  id: string;
  senderId: string;
  messageId?: string;            // Si réponse à un message existant
  threadId?: string;
  recipientType: MessageTargetType;
  recipientSite?: SiteCode;
  recipientRole?: UserRole;
  recipientId?: string;          // Email individuel
  subject: string;
  body: string;
  attachments?: MessageAttachment[];
  lastSavedAt: string;
  createdAt: string;
  isLocalOnly?: boolean;         // True si pas encore sync avec Firestore
}

export interface MessageTelemetryEvent {
  id: string;
  messageId: string;
  threadId: string;
  userId: string;                // Email de l'utilisateur tracké
  userName: string;
  userRole: UserRole;
  userSite: SiteCode;
  eventType: TelemetryEventType;
  timestamp: string;             // ISO 8601 exact
  sessionId: string;             // UUID de session (regroupe les événements)
  payload?: {
    draftText?: string;          // Texte du brouillon à l'instant T
    previousText?: string;       // Avant modification
    newText?: string;            // Après modification
    deletedText?: string;        // Ce qui a été supprimé
    cursorPosition?: number;     // Position du curseur
    timeSpentSoFar?: number;     // Temps cumulé en secondes
    attachmentId?: string;       // Si ouverture pièce jointe
    scrollDepth?: number;        // % de scroll dans le message
    viewportTime?: number;       // Temps passé dans le viewport
  };
}

export interface BannerNotification {
  id: string;
  title: string;
  body: string;

  // Média (image compressée)
  imageUrl?: string;             // URL Firebase Storage (compressée)
  imageMimeType?: string;        // image/jpeg, image/webp
  originalImageSizeBytes?: number;
  compressedImageSizeBytes?: number;
  compressionRatio?: number;   // Ex: 0.85 = 85% de réduction

  // Ciblage
  targetSites: (SiteCode | 'ALL')[];       // ['SMI'] ou ['ALL']
  targetRoles: (UserRole | 'ALL')[];       // ['MAGASINIER'] ou ['ALL']
  targetUsers?: string[];        // Ciblage ultra-précis (optionnel)

  // Comportement
  dismissible: boolean;          // L'utilisateur peut-il fermer ?
  priority: MessagePriority;
  startDate: string;             // Date de début d'affichage
  endDate: string;               // Date d'expiration

  // Métadonnées
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: BannerStatus;
}

export interface BannerView {
  id: string;
  bannerId: string;
  userId: string;
  userName: string;
  userSite: SiteCode;
  userRole: UserRole;
  viewedAt: string;
  dismissedAt?: string;
  timeSpentSeconds?: number;
  clickedAt?: string;
  clickTarget?: string;          // Si la bannière a un lien
}

export interface MessageAnalytics {
  messageId: string;
  totalRecipients: number;
  readCount: number;
  unreadCount: number;
  archivedCount: number;
  averageReadTimeSeconds?: number;
  medianReadTimeSeconds?: number;
  replyCount: number;
  lastActivityAt: string;
  readRatePercent: number;       // (readCount / totalRecipients) * 100
}

export interface MessageFilter {
  site?: SiteCode;
  role?: UserRole;
  status?: RecipientStatus;
  priority?: MessagePriority;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface BannerFilter {
  site?: SiteCode;
  role?: UserRole;
  status?: BannerStatus;
  dateFrom?: string;
  dateTo?: string;
}

// Convenient type aliases matching phase 2 requirements
export type Message = SystemMessage;
export type InboxItem = UserInboxItem;
export type MessageTelemetry = MessageTelemetryEvent;

export interface MonthlyClosing {
  id: string; // e.g. "2026-06"
  month: string; // e.g. "2026-06"
  closedAt: string;
  closedBy: string;
  closedByName: string;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  mouvementsCount: number;
  mouvementsCountNote?: 'INCOMPLET_HORS_FENETRE_90J' | 'COMPLET';
  status: 'LOCKED' | 'CLOSED';
  vigilanceChecks: {
    activeTransfers: number;
    pendingRequests: number;
    negativeStocks: number;
  };
  siteMetrics: {
    site: string;
    name: string;
    value: number;
    count: number;
    critical: number;
  }[];
}




