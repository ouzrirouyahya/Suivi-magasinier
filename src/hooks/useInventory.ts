import { useState, useCallback } from 'react';
import { Article } from '../types';
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
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [pendingMouvementNav, setPendingMouvementNav] = useState<{ type: 'ENTREE' | 'SORTIE'; articleId?: string } | null>(null);

  const navigateToMouvement = useCallback((param1: string, param2?: 'IN' | 'OUT') => {
    if (param2) {
      // Signature (articleId, action)
      setSelectedArticleId(param1);
      setPendingMouvementNav({ type: param2 === 'IN' ? 'ENTREE' : 'SORTIE', articleId: param1 });
    } else {
      // Signature (type)
      setSelectedArticleId(null);
      setPendingMouvementNav({ type: param1 as 'ENTREE' | 'SORTIE' });
    }
  }, []);

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
    isReadOnlyUser: auth.isReadOnlyUser,

    // ARTICLES
    articles: articles.articles,
    rawArticles: articles.rawArticles,
    hydrominesCatalog: articles.hydrominesCatalog || catalog.hydrominesCatalog,
    catalogItems: articles.catalogItems || catalog.catalog,
    deletionRequests: articles.deletionRequests,
    addArticle: articles.saveArticle,
    updateArticle: articles.saveArticle,
    deleteArticle: articles.deleteArticle,
    deleteArticles: articles.deleteArticles,
    ghostArticles: articles.ghostArticles,
    catalogUsageStats: articles.catalogUsageStats,
    saveArticle: articles.saveArticle,
    importAllCatalogToArticles: articles.importAllCatalogToArticles,
    importFromHydrominesCatalog: articles.importFromHydrominesCatalog,
    importSpecificCatalogItems: articles.importSpecificCatalogItems,
    requestDeletion: (articles as any).requestDeletion,
    approveDeletionRequest: articles.approveDeletionRequest,
    rejectDeletionRequest: articles.rejectDeletionRequest,
    calculateCatalogUsageStats: (articles as any).calculateCatalogUsageStats,

    // MOVEMENTS
    mouvements: movements.mouvements,
    movements: movements.mouvements,
    distributions: movements.distributions,
    purchaseRequests: movements.purchaseRequests,
    anomalyReports: movements.anomalyReports,
    inventaires: (movements as any).inventaires,
    addMouvement: movements.addMouvement,
    calculatePriceUpdates: movements.calculatePriceUpdates,
    addPurchaseRequest: movements.addPurchaseRequest,
    updatePRStatus: movements.updatePRStatus,
    saveInventaire: (movements as any).saveInventaire,
    approveMouvement: (movements as any).approveMouvement,
    rejectMouvement: (movements as any).rejectMouvement,

    // TRANSFERS
    transferts: transfers.transferts,
    addTransfert: transfers.addTransfert,
    approveTransfert: transfers.approveTransfert,
    completeTransfert: transfers.completeTransfert,
    cancelTransfert: transfers.closeTransfert,
    closeTransfert: transfers.closeTransfert,
    expedierTransfert: transfers.expedierTransfert,
    receptionnerTransfert: transfers.receptionnerTransfert,
    accepterEtCloturerTransfert: transfers.accepterEtCloturerTransfert,
    deleteTransfert: transfers.deleteTransfert,
    getArticleTransitQty: transfers.getArticleTransitQty,

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
    markNotificationAsRead: notifications.markNotificationAsRead,
    markAllNotificationsAsRead: notifications.markAllNotificationsAsRead,
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

    // SHARED UI / SEARCH / NAVIGATION
    selectedArticle,
    setSelectedArticle,
    selectedArticleId,
    setSelectedArticleId,
    globalSearch,
    setGlobalSearch,
    pendingMouvementNav,
    setPendingMouvementNav,
    navigateToMouvement,
  };
}

export default useInventory;
