import { useAuth } from './useAuth';
import { useArticles } from './useArticles';
import { useMovements } from './useMovements';
import { useTransfers } from './useTransfers';
import { useMaintenance } from './useMaintenance';
import { useOffline } from './useOffline';
import { useNotifications } from './useNotifications';
import { useAudit } from './useAudit';
import { useCatalog } from './useCatalog';
import { useSystem } from './useSystem';

export function useInventory() {
  // === HOOKS CRITIQUES (Toujours actifs) ===
  // Essentiels pour le fonctionnement de base de l'application, l'état d'authentification et les données de stock temps réel.
  const auth = useAuth();           // Critique : Gestion de session, profil et droits d'accès
  const articles = useArticles();   // Critique : Inventaire, détails des articles et PMP
  const movements = useMovements(); // Critique : Mouvements de stock (entrées/sorties) critiques pour la traçabilité immédiate
  const offline = useOffline();     // Critique : Gestion de la base hors-ligne IndexedDB / Snapshots

  // === HOOKS SECONDAIRES (Éligibles au lazy-loading / paramètre 'enabled') ===
  // Ces modules peuvent être désactivés ou restreints s'ils ne sont pas requis par la page active,
  // afin de limiter les connexions Firebase onSnapshot multiplexées sur les réseaux mobiles faibles (ex: 3G chantiers).
  const transfers = useTransfers();         // Secondaire : Flux logistique inter-sites
  const notifications = useNotifications(); // Secondaire : Bannière d'activité et alertes
  
  // === HOOKS LAZY / DEUXIÈME RANG ===
  // À appeler idéalement de manière isolée sur leurs pages respectives plutôt que dans le contexte global.
  const maintenance = useMaintenance();     // Lazy : Carnets d'entretien engins / perforateurs
  const audit = useAudit();                 // Lazy : Logs d'audit sécurité (Admin uniquement)
  const catalog = useCatalog();             // Lazy : Catalogue Hydromines de référence
  const system = useSystem();               // Lazy : Configuration système et maintenance globale

  return {
    // AUTH
    currentUser: auth.currentUser,
    accounts: auth.accounts,
    isLoaded: auth.isLoaded,
    currentSite: auth.currentSite,
    setCurrentSite: auth.setCurrentSite,
    approveUser: auth.approveUser,
    rejectUser: auth.rejectUser,
    toggleUser: auth.toggleUser,
    setUserRole: auth.setUserRole,
    setUserAssignedSite: auth.setUserAssignedSite,
    isAdmin: auth.currentUser?.role === 'ADMIN' || auth.currentUser?.role === 'SUPER_ADMIN',
    isReadOnlyUser: auth.currentUser?.role === 'ADMIN' && !auth.currentUser?.canWrite,

    // ARTICLES
    articles: articles.articles,
    rawArticles: articles.articles,
    hydrominesCatalog: catalog.hydrominesCatalog,
    catalogItems: (articles as any).catalogItems,
    deletionRequests: articles.deletionRequests,
    addArticle: articles.saveArticle,
    updateArticle: articles.saveArticle,
    deleteArticle: articles.deleteArticle,
    importFromHydrominesCatalog: articles.importFromHydrominesCatalog,
    importSpecificCatalogItems: articles.importSpecificCatalogItems,
    requestDeletion: (articles as any).requestDeletion,
    approveDeletionRequest: articles.approveDeletionRequest,
    rejectDeletionRequest: articles.rejectDeletionRequest,
    calculateCatalogUsageStats: (articles as any).calculateCatalogUsageStats,

    // MOVEMENTS
    mouvements: movements.mouvements,
    distributions: movements.distributions,
    purchaseRequests: movements.purchaseRequests,
    anomalyReports: movements.anomalyReports,
    addMouvement: movements.addMouvement,
    calculatePriceUpdates: movements.calculatePriceUpdates,
    addPurchaseRequest: movements.addPurchaseRequest,
    updatePRStatus: movements.updatePRStatus,

    // TRANSFERS
    transferts: transfers.transferts,
    addTransfert: transfers.addTransfert,
    approveTransfert: transfers.approveTransfert,
    completeTransfert: transfers.completeTransfert,
    cancelTransfert: transfers.closeTransfert,
    closeTransfert: transfers.closeTransfert,

    // MAINTENANCE
    maintenanceLogs: maintenance.maintenanceLogs,
    engins: maintenance.engins,
    perfos: maintenance.perfos,
    agents: maintenance.agents,
    addMaintenanceLog: maintenance.addMaintenanceLog,
    setEngin: maintenance.setEngin,
    setPerfo: maintenance.setPerfo,
    setAgent: maintenance.setAgent,

    // OFFLINE
    isOnline: (offline as any).isOnline ?? navigator.onLine,
    retryQueue: offline.retryQueue,
    networkQuality: offline.networkQuality,
    isDegradedNetwork: offline.isDegradedNetwork,
    dlq: offline.dlq,
    avgTxDuration: offline.avgTxDuration,
    txStats: offline.txStats,
    forceRunQueue: offline.forceRunQueue,
    clearDLQ: offline.clearDLQ,
    simulateRuleFailure: offline.simulateRuleFailure,
    simulateConcurrentConflicts: offline.simulateConcurrentConflicts,

    // NOTIFICATIONS
    notifications: notifications.notifications,
    addNotification: notifications.addNotification,
    markAllRead: notifications.markAllNotificationsAsRead,

    // AUDIT
    auditLogs: audit.auditLogs,
    dateFilter: audit.dateFilter,
    setDateFilter: audit.setDateFilter,
    loadMoreAuditLogs: audit.loadMoreAuditLogs,
    hasMore: audit.hasMore,
    hasMoreAuditLogs: audit.hasMore,
    logAction: audit.logAction,

    // CATALOG
    catalog: catalog.catalog,
    hydrominesCatalog_ref: catalog.hydrominesCatalog,
    saveCatalogItem: catalog.saveCatalogItem,
    deleteCatalogItem: catalog.deleteCatalogItem,
    saveHydrominesCatalogItem: catalog.saveHydrominesCatalogItem,
    saveHydrominesItem: catalog.saveHydrominesItem,
    deleteHydrominesItem: catalog.deleteHydrominesItem,
    addToHydrominesCatalog: catalog.addToHydrominesCatalog,
    buildHierarchy: catalog.buildHierarchy,
    catalogStats: (catalog as any).catalogStats,
    maintenanceStats: (catalog as any).maintenanceStats,

    // SYSTEM
    systemConfig: (system as any).systemConfig,
    techLogs: system.techLogs,
    addTechLog: system.addTechLog,
    isSafeMode: system.isSafeMode,
    rcglResult: system.rcglResult,
    maintenanceMode: system.maintenanceMode,
    maintenanceReason: system.maintenanceReason,
    toggleMaintenanceLock: system.toggleMaintenanceLock,
    collectSystemMetrics: system.collectSystemMetrics,
    exportForensic: system.exportForensic,
  };
}

export default useInventory;
