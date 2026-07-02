import React from 'react';
import { 
  LayoutDashboard, 
  Settings2, 
  Truck, 
  Drill, 
  Droplets, 
  ArrowDownLeft, 
  ArrowUpRight, 
  History as HistoryIcon,
  MapPin,
  Package,
  RefreshCw,
  ClipboardCheck,
  ShieldCheck,
  Users,
  LogOut,
  ChevronDown,
  Wrench,
  Shield,
  Activity,
  ShoppingCart,
  Brain,
  MessageSquare,
  RotateCcw,
  Landmark,
  FileText,
  Smartphone,
  Sun,
  Moon,
  Database
} from 'lucide-react';
import { cn, generateSecureUUID } from '../lib/utils';
import { SITES } from '../demoData';
import { SiteCode } from '../types';
import { User } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNotifications } from '../hooks/useNotifications';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useMessages } from '../hooks/useMessages';
import { snapshotManager } from '../lib/snapshotManager';
import hydrominesLogo from '../assets/images/hydromines_logo.png';

export type Page = 
  | 'COCKPIT' 
  | 'STOCK_ENGINS' 
  | 'STOCK_PERFORATEURS' 
  | 'STOCK_CONSOMMABLES' 
  | 'STOCK_EPI' 
  | 'BON_ENTREE' 
  | 'BON_SORTIE' 
  | 'INVENTAIRE'
  | 'HISTORIQUE' 
  | 'AUDIT_LOG'
  | 'USER_MGMT'
  | 'GESTION_ARTICLES'
  | 'CATALOGUE_HYDROMINES'
  | 'REPORTS'
  | 'RESTOCK_MGMT'
  | 'RETURNS'
  | 'FINANCE'
  | 'SEARCH_RESULTS'
  | 'TRACEABILITY'
  | 'TRANSFERS'
  | 'COMMUNICATION'
  | 'MESSAGING'
  | 'ANALYSE_EQUIPEMENTS';

interface SidebarProps {
  currentSite: SiteCode;
  setSite: (site: SiteCode) => void;
  user: User | null;
  isAdmin: boolean;
  notifications?: {id: string, type: string, message: string, timestamp: string}[];
  isOpen?: boolean;
  onClose?: () => void;
  onSignOut: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const pageRouteMap: Record<string, string> = {
  'COCKPIT': '/',
  'STOCK_ENGINS': '/stock/engins',
  'STOCK_PERFORATEURS': '/stock/perforateurs',
  'STOCK_CONSOMMABLES': '/stock/consommables',
  'STOCK_EPI': '/stock/epi',
  'BON_ENTREE': '/movement/entree',
  'BON_SORTIE': '/movement/sortie',
  'INVENTAIRE': '/inventaire',
  'TRACEABILITY': '/traceability',
  'TRANSFERS': '/transfers',
  'RETURNS': '/returns',
  'MAINTENANCE': '/maintenance',
  'RESTOCK_MGMT': '/restock',
  'GESTION_ARTICLES': '/catalog/master',
  'CATALOGUE_HYDROMINES': '/catalog/hydromines',
  'ANALYSE_EQUIPEMENTS': '/reports',
  'USER_MGMT': '/users',
  'AUDIT_LOGS': '/audit',
  'FINANCE': '/finance',
  'COMMUNICATION': '/communication',
  'MESSAGING': '/messaging',
};

export const Sidebar = React.memo(function Sidebar({ 
  currentSite, 
  setSite, 
  user, 
  isAdmin, 
  notifications = [], 
  isOpen, 
  onClose, 
  onSignOut, 
  isDarkMode = false, 
  onToggleDarkMode
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useInventory();
  const { addNotification } = useNotifications();
  const { isOnline, isSyncing } = useOfflineSync();
  const { unreadCount } = useMessages();

  const snapshot = snapshotManager.getSnapshot();
  const snapshotAge = snapshotManager.getSnapshotAgeMinutes();
  const hasSnapshot = snapshotManager.isFullSnapshotAvailable();

  // State to track if app can be installed as PWA
  const [isInstallable, setIsInstallable] = React.useState(!!(window as any).deferredPrompt);

  React.useEffect(() => {
    const handleInstallable = () => {
      setIsInstallable(true);
    };
    window.addEventListener('pwa-installable', handleInstallable);
    
    // Also track if successfully installed to hide the button
    const handleAppInstalled = () => {
      setIsInstallable(false);
      (window as any).deferredPrompt = null;
      toast.success("HydroMines a été installée sur votre appareil !");
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) {
      toast.info("L'installation n'est pas disponible pour le moment. Si vous êtes sur iOS, utilisez l'option 'Sur l'écran d'accueil' de Safari.");
      return;
    }
    promptEvent.prompt();
    promptEvent.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        toast.success("Installation acceptée !");
      }
      (window as any).deferredPrompt = null;
      setIsInstallable(false);
    });
  };

  const [showReplacementModal, setShowReplacementModal] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [days, setDays] = React.useState(1);

  const handleSubmitReplacement = async () => {
    if (!currentUser || !reason.trim()) return;
    
    const requestUuid = generateSecureUUID();
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    
    const reqData = {
      id: requestUuid,
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      site: currentSite,
      startDate,
      endDate,
      reason,
      requestedAt: new Date().toISOString(),
      status: 'PENDING'
    };

    try {
      await setDoc(doc(db, 'replacementRequests', requestUuid), reqData);
      
      await setDoc(doc(db, 'accounts', currentUser.id), {
        replacementRequestStatus: 'PENDING',
        replacementReason: reason,
        replacementStartDate: startDate,
        replacementEndDate: endDate,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await addNotification({
        siteId: currentSite,
        type: 'WARNING',
        category: 'SYSTEM',
        message: `🔧 Demande de remplacement : ${currentUser.name} veut remplacer le magasinier (${days} jours). Motif: ${reason}`,
        actionRoute: 'USER_MGMT',
        severity: 'WARNING',
        status: 'unread',
        isRead: false,
        timestamp: new Date().toISOString()
      });

      toast.success("🚀 Demande de remplacement envoyée !");
      setShowReplacementModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur : ${err.message || err}`);
    }
  };
  
  const criticalCount = notifications.filter(n => n.type === 'CRITICAL').length;
  const warningCount = notifications.filter(n => n.type === 'WARNING').length;

  // Determine active item based on route
  const getCurrentPage = (): string => {
    const path = location.pathname;
    if (path === '/') return 'COCKPIT';
    if (path.startsWith('/stock/')) {
      if (path === '/stock/engins') return 'STOCK_ENGINS';
      if (path === '/stock/perforateurs') return 'STOCK_PERFORATEURS';
      if (path === '/stock/consommables') return 'STOCK_CONSOMMABLES';
      if (path === '/stock/epi') return 'STOCK_EPI';
      return 'STOCK_ENGINS';
    }
    const match = Object.entries(pageRouteMap).find(([_, route]) => route === path);
    return match ? match[0] : 'COCKPIT';
  };

  const currentPage = getCurrentPage();

  // Memoized menuItems with precise dependencies
  const menuItems = React.useMemo(() => {
    const itemTemplates = [
      { id: 'COCKPIT', label: 'Mon Magasin', icon: LayoutDashboard, section: 'MON_MAGASIN' },
      
      { id: 'BON_ENTREE', label: 'Bons d’Entrée', icon: ArrowDownLeft, section: 'BONS_MOUVEMENT' },
      { id: 'BON_SORTIE', label: 'Bons de Sortie', icon: ArrowUpRight, section: 'BONS_MOUVEMENT' },
      { id: 'TRANSFERS', label: 'Transferts Inter-Sites', icon: Truck, section: 'BONS_MOUVEMENT' },
      { id: 'RETURNS', label: 'Retours Chantiers', icon: RotateCcw, section: 'BONS_MOUVEMENT' },

      { id: 'STOCK_ENGINS', label: 'État Général des Stocks', icon: Package, section: 'STOCKS_INVENTAIRE' },
      { id: 'INVENTAIRE', label: 'Inventaire Physique', icon: ClipboardCheck, section: 'STOCKS_INVENTAIRE' },
      { id: 'RESTOCK_MGMT', label: 'Alertes & Commandes', icon: ShoppingCart, badge: (criticalCount + warningCount) || 0, section: 'STOCKS_INVENTAIRE' },

      { id: 'TRACEABILITY', label: 'Grand Registre des Bons', icon: ShieldCheck, section: 'REGISTRES' },
      { id: 'GESTION_ARTICLES', label: 'Bibliothèque Technique', icon: Settings2, section: 'REGISTRES' },
      { id: 'CATALOGUE_HYDROMINES', label: 'Catalogue Hydromines ⭐', icon: Database, section: 'REGISTRES' },

      { id: 'ANALYSE_EQUIPEMENTS', label: 'Rapports & Analyses 📊', icon: Activity, section: 'ADMINISTRATION' },
      { id: 'USER_MGMT', label: 'Paramètres système', icon: Users, section: 'ADMINISTRATION' },

      { id: 'FINANCE', label: 'Valeur du Stock Mère', icon: Landmark, section: 'DIRECTION' },
      { id: 'MESSAGING', label: 'Messagerie & Annonces 💬', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount.toString() : undefined, section: 'MON_MAGASIN' }
    ];

    const sectionHeaders: Record<string, { label: string; id: string; isSeparator: boolean }> = {
      MON_MAGASIN: { id: 'SEP_MON_MAGASIN', label: '1. Mon Magasin', isSeparator: true },
      BONS_MOUVEMENT: { id: 'SEP_BONS_MOUVEMENT', label: '2. Bons de Mouvement', isSeparator: true },
      STOCKS_INVENTAIRE: { id: 'SEP_STOCKS_INVENTAIRE', label: '3. Stocks & Inventaire', isSeparator: true },
      REGISTRES: { id: 'SEP_REGISTRES', label: '4. Registres', isSeparator: true },
      ADMINISTRATION: { id: 'SEP_ADMINISTRATION', label: '5. Administration', isSeparator: true },
      DIRECTION: { id: 'SEP_DIRECTION', label: '6. Direction', isSeparator: true }
    };

    const userRole = currentUser?.role || 'ADMIN';
    const allowedPageIds = new Set<string>();

    if (userRole === 'SUPER_ADMIN') {
      itemTemplates.forEach(item => allowedPageIds.add(item.id));
    } else if (userRole === 'ADMIN') {
      itemTemplates.forEach(item => {
        if (item.id !== 'FINANCE') allowedPageIds.add(item.id);
      });
    } else if (userRole === 'MAGASINIER') {
      const allowed = ['COCKPIT', 'MESSAGING', 'BON_ENTREE', 'BON_SORTIE', 'TRANSFERS', 'RETURNS', 'STOCK_ENGINS', 'INVENTAIRE', 'RESTOCK_MGMT', 'TRACEABILITY', 'GESTION_ARTICLES', 'CATALOGUE_HYDROMINES', 'ANALYSE_EQUIPEMENTS'];
      allowed.forEach(id => allowedPageIds.add(id));
    } else if (userRole === 'RESPONSABLE_CHANTIER') {
      const allowed = currentUser?.isReplacingMagasinier && currentUser?.canWrite
        ? ['COCKPIT', 'MESSAGING', 'BON_ENTREE', 'BON_SORTIE', 'TRANSFERS', 'RETURNS', 'STOCK_ENGINS', 'INVENTAIRE', 'RESTOCK_MGMT', 'TRACEABILITY', 'GESTION_ARTICLES', 'CATALOGUE_HYDROMINES']
        : ['COCKPIT', 'MESSAGING', 'STOCK_ENGINS', 'GESTION_ARTICLES', 'CATALOGUE_HYDROMINES', 'TRACEABILITY', 'RESTOCK_MGMT'];
      allowed.forEach(id => allowedPageIds.add(id));
    }

    const filteredItems = itemTemplates.filter(item => allowedPageIds.has(item.id));
    const finalMenuItems: any[] = [];
    const sectionsWithItems = new Set<string>();
    filteredItems.forEach(item => sectionsWithItems.add(item.section));

    const sectionOrder = ['MON_MAGASIN', 'BONS_MOUVEMENT', 'STOCKS_INVENTAIRE', 'REGISTRES', 'ADMINISTRATION', 'DIRECTION'];

    sectionOrder.forEach(secKey => {
      if (sectionsWithItems.has(secKey)) {
        finalMenuItems.push(sectionHeaders[secKey]);
        filteredItems.forEach(item => {
          if (item.section === secKey) {
            finalMenuItems.push(item);
          }
        });
      }
    });

    return finalMenuItems;
  }, [currentUser?.role, currentUser?.isReplacingMagasinier, currentUser?.canWrite, criticalCount, warningCount, unreadCount]);

  // Memoized navigation handler
  const handlePageSelect = React.useCallback((pageId: Page) => {
    const route = pageRouteMap[pageId];
    if (route) {
      navigate(route);
    }
    if (onClose) onClose();
  }, [navigate, onClose]);

  return (
    <>
      {/* Dynamic Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45] animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "w-[260px] bg-white border-r border-slate-100/70 h-screen fixed inset-y-0 left-0 overflow-y-auto flex flex-col no-print shadow-xl shadow-slate-100/20 transition-all duration-300 ease-in-out z-50",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Visual Effect exclusively for the top of the sidebar - polished without dividing line */}
        <div className="absolute top-0 left-0 right-0 h-40 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-100/10 rounded-full blur-2xl" />
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
        </div>

        {/* Logo area - beautiful, continuous, no visible border lines */}
        <div className="p-5 pb-3 relative z-10 flex flex-col items-center text-center gap-2">
          <img 
            src={hydrominesLogo} 
            alt="Hydromines" 
            className="w-16 h-16 object-contain drop-shadow-md hover:scale-105 transition-transform duration-200"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black tracking-tighter flex items-center gap-0.5 leading-none">
              <span className="logo-hydro text-sky-500">HYDRO</span>
              <span className="logo-mines text-[#FF5252]">MINES</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.07em] mt-1.5 leading-none">Suivi magasinier</span>
          </div>
        </div>

        <div className="px-4 mb-4 relative z-10">
          <div className="bg-slate-50/50 rounded-xl p-2 border border-slate-100 flex items-center gap-3 relative group">
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-amber-500">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0 leading-none">SITE ACTIF</label>
              {isAdmin ? (
                <select 
                  value={currentSite}
                  onChange={(e) => setSite(e.target.value as SiteCode)}
                  className="w-full bg-transparent text-sm font-black text-slate-800 outline-none cursor-pointer appearance-none mt-0.5"
                >
                  <option value="ALL">Tous les sites (Global)</option>
                  {SITES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                </select>
              ) : (
                <div className="w-full bg-transparent text-sm font-black text-slate-800 outline-none mt-0.5">
                  {SITES.find(s => s.code === currentSite)?.label || currentSite}
                </div>
              )}
            </div>
            {isAdmin && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />}
          </div>
        </div>
        
        <nav className="flex-1 px-3 pb-8 flex flex-col gap-0.5 relative z-10">
          {menuItems.map((item) => {
            if (item.isSeparator) {
              return (
                <div 
                  key={item.id} 
                  className="px-3 pt-5 pb-1.5 text-[11px] font-black uppercase tracking-[0.07em] flex items-center gap-2 mt-4 first:mt-0 transition-all text-amber-700/90 border-l-2 border-amber-500 pl-2 bg-amber-50/5 py-0.5 rounded-r"
                >
                  {item.label}
                </div>
              );
            }
            
            if ('isSubHeader' in item && item.isSubHeader) {
              return (
                <div 
                  key={item.id} 
                  className="px-3 pt-3.5 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-2 transition-all"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full inline-block", item.dotColor || "bg-amber-500")} />
                  {item.label}
                </div>
              );
            }
            
            const Icon = item.icon!;
            const isActive = currentPage === item.id;
            
            return (
              <button
                 key={item.id}
                 onClick={() => handlePageSelect(item.id as Page)}
                 className={cn(
                   "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all w-full text-left relative",
                   isActive 
                     ? "bg-amber-50/45 text-amber-700 border border-amber-500/10 shadow-sm font-black" 
                     : "text-slate-500 hover:text-amber-600 hover:bg-amber-50/20"
                 )}
               >
                <Icon className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-amber-600 stroke-[2.2]" : "text-slate-400 group-hover:text-amber-500"
                )} />
                <span className="flex-1 truncate uppercase tracking-[0.05em]">{item.label}</span>
                {((typeof item.badge === 'number' && item.badge > 0) || (typeof item.badge === 'string' && item.badge !== '')) && (
                  <span className="bg-[#FF5252] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-lg shadow-rose-200">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="w-1 h-3 bg-amber-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-50 relative z-10 flex flex-col gap-4">
          {/* Remplacement Magasinier for RESPONSABLE_CHANTIER */}
          {currentUser?.role === 'RESPONSABLE_CHANTIER' && (
            <div className="space-y-2">
              {currentUser?.isReplacingMagasinier ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold uppercase tracking-wide">
                    <span>🔧</span>
                    <span>Remplacement Actif</span>
                  </div>
                  <p className="text-slate-500 font-medium leading-normal">
                    Jusqu'au {new Date(currentUser.replacementEndDate!).toLocaleDateString('fr-FR')}
                  </p>
                  <button 
                    onClick={() => {
                      setReason("Prolongation de remplacement");
                      setDays(5);
                      setShowReplacementModal(true);
                    }} 
                    className="text-[10px] text-emerald-600 font-black uppercase hover:underline block pt-1"
                  >
                    Prolonger la période
                  </button>
                </div>
              ) : currentUser?.replacementRequestStatus === 'PENDING' ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 text-amber-800 font-extrabold uppercase tracking-wide">
                    <span>⏳</span>
                    <span>Demande en attente</span>
                  </div>
                  <p className="text-slate-500 font-medium leading-normal mt-0.5">
                    Votre demande de remplacement est en cours d'examen.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setReason('');
                    setDays(1);
                    setShowReplacementModal(true);
                  }}
                  className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(245,158,11,0.2)] active:scale-95"
                >
                  <span>🔧</span> Remplacer Magasinier
                </button>
              )}
            </div>
          )}

          {isInstallable && (
            <button
              onClick={handleInstallApp}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#996515] text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_2px_10px_rgba(212,175,55,0.25)] active:scale-95 animate-pulse select-none"
            >
              <Smartphone className="w-3.5 h-3.5" /> Installer l'App PWA
            </button>
          )}

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"
              )} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {isOnline ? (isSyncing ? "Synchro..." : "Connecté Cloud") : "Mode Hors-Ligne"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onToggleDarkMode && (
                <button
                  onClick={onToggleDarkMode}
                  className="text-slate-400 hover:text-sky-500 dark:text-slate-450 dark:hover:text-amber-500 transition-colors p-1 rounded-md"
                  title={isDarkMode ? "Activer le mode jour" : "Activer le mode nuit"}
                >
                  {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              )}
              <RefreshCw className={cn("w-3 h-3 text-slate-300", isSyncing && "animate-spin text-amber-500")} />
            </div>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
            <Database className="w-2.5 h-2.5 flex-shrink-0 text-slate-500" />
            {hasSnapshot ? (
              <span className={
                snapshotAge && snapshotAge > 120 
                  ? 'text-orange-400' 
                  : 'text-slate-500'
              }>
                {'Sauvegarde : '}
                <span className="text-slate-300 font-medium">
                  {snapshotManager.formatSnapshotDate(snapshot.lastFullSync)}
                </span>
              </span>
            ) : (
              <span className="text-amber-500 font-medium">
                Aucune sauvegarde locale
              </span>
            )}
          </div>

          <div className="card-mini bg-slate-50/80 rounded-xl p-2.5 flex items-center gap-3 border border-slate-100/50">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center font-black text-sky-600 text-sm shadow-sm border border-slate-100 overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                (user?.displayName?.substring(0, 2) || user?.email?.substring(0, 2) || '??').toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800 truncate uppercase tracking-tighter leading-tight">
                {user?.displayName || (user?.email?.split('@')[0]) || 'User'}
              </p>
              <p className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-widest mt-0.5">
                {currentUser?.role || (isAdmin ? 'ADMIN' : 'OPÉRATEUR')}
              </p>
            </div>
            <button 
              onClick={onSignOut}
              className="text-slate-300 hover:text-rose-500 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Popup modal for Replacement Request */}
      {showReplacementModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-xl">🔧</span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Demande de Remplacement Temporaire
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Motif d'absence du magasinier :
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Maladie, congé, formation, absence imprévue..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all placeholder:text-slate-400 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Durée (jours) :
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={days}
                  onChange={(e) => setDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowReplacementModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors uppercase tracking-wider"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitReplacement}
                disabled={!reason.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black rounded-lg transition-colors uppercase tracking-wider"
              >
                Envoyer la Demande
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

