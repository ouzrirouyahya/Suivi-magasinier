/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useInventory } from './context/InventoryContext';
import { cn } from './lib/utils';
import { toast } from 'sonner';
import { 
  WifiOff, RefreshCw, Lock, ShieldAlert, LayoutDashboard, 
  ArrowDownLeft, ArrowUpRight, ShoppingCart, Menu, Loader2 
} from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import LoginPage from './components/LoginPage';
import { PageLoading } from './components/common/PageLoading';
import { HydrominesSecurityAlert } from './components/common/HydrominesSecurityAlert';
import { Toolbar } from './components/layout/Toolbar';
import { ArticleDetail } from './components/ArticleDetail';
import hydrominesLogo from './assets/images/hydromines_logo.png';

// Lazy load Page wrappers
const CockpitPage = lazy(() => import('./pages/CockpitPage'));
const StockEnginesPage = lazy(() => import('./pages/StockEnginesPage'));
const StockPerforatorsPage = lazy(() => import('./pages/StockPerforatorsPage'));
const StockConsumablesPage = lazy(() => import('./pages/StockConsumablesPage'));
const StockEpiPage = lazy(() => import('./pages/StockEpiPage'));
const BonEntreePage = lazy(() => import('./pages/BonEntreePage'));
const BonSortiePage = lazy(() => import('./pages/BonSortiePage'));
const InventairePage = lazy(() => import('./pages/InventairePage'));
const TraceabilityPage = lazy(() => import('./pages/TraceabilityPage'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const FinancialPage = lazy(() => import('./pages/FinancialPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const RestockPage = lazy(() => import('./pages/RestockPage'));
const MasterCatalogPage = lazy(() => import('./pages/MasterCatalogPage'));
const HydrominesCatalogPage = lazy(() => import('./pages/HydrominesCatalogPage'));

const pageRouteMap: Record<string, string> = {
  'COCKPIT': '/',
  'STOCK_ENGINS': '/stock/engines',
  'STOCK_PERFORATEURS': '/stock/perforators',
  'STOCK_CONSOMMABLES': '/stock/consumables',
  'STOCK_EPI': '/stock/epi',
  'BON_ENTREE': '/mouvement/entree',
  'BON_SORTIE': '/mouvement/sortie',
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
};

function LayoutWrapper() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() => {
    return localStorage.getItem('hydromines_viewport_mode') !== 'mobile';
  });
  const [isMobile, setIsMobile] = useState(false);
  const [density, setDensity] = useState<'compact' | 'standard' | 'large'>(() => {
    return (localStorage.getItem('hydromines_layout_density') as 'compact' | 'standard' | 'large') || 'compact';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('hydromines_dark_mode') === 'true';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAdminAlert, setShowAdminAlert] = useState(false);

  const {
    currentSite, setCurrentSite, currentUser, networkQuality, retryQueue = [],
    maintenanceMode, maintenanceReason, articles, movements, selectedArticle, setSelectedArticle,
    notifications, isLoaded, globalSearch, setGlobalSearch, movements: movementsList
  } = useInventory();

  const handleToggleDarkMode = () => setIsDarkMode(prev => !prev);
  const handleDensityChange = (d: 'compact' | 'standard' | 'large') => {
    setDensity(d);
    localStorage.setItem('hydromines_layout_density', d);
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('hydromines_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    try {
      const vp = document.getElementById('viewport-meta');
      if (vp) {
        if (isDesktopViewport) {
          const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          vp.setAttribute('content', isMobileDevice ? 'width=1280, initial-scale=0.27' : 'width=device-width, initial-scale=1.0');
        } else {
          vp.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }
      }
      localStorage.setItem('hydromines_viewport_mode', isDesktopViewport ? 'desktop' : 'mobile');
      window.dispatchEvent(new Event('resize'));
    } catch (e) {
      console.error('[Viewport Sync UI Error]', e);
    }
  }, [isDesktopViewport]);

  useEffect(() => {
    const handleResize = () => {
      const mobileActive = window.innerWidth < 1024 && !isDesktopViewport;
      setIsMobile(mobileActive);
      if (mobileActive) setDensity('compact');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDesktopViewport]);

  const getPageFromPath = (path: string): string => {
    const match = Object.entries(pageRouteMap).find(([_, route]) => route === path);
    return match ? match[0] : 'COCKPIT';
  };

  const currentPage = getPageFromPath(location.pathname);

  const setCurrentPage = (page: string) => {
    const route = pageRouteMap[page];
    if (route) navigate(route);
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN' || isSuperAdmin;

  return (
    <div className="min-h-screen bg-white flex relative overflow-hidden" data-density={density}>
      {showAdminAlert && <HydrominesSecurityAlert onClose={() => setShowAdminAlert(false)} />}
      
      <Sidebar 
        currentPage={currentPage} 
        setPage={setCurrentPage} 
        currentSite={currentSite}
        setSite={(site) => { if (isAdmin) setCurrentSite(site); }} 
        user={auth.currentUser}
        isAdmin={isAdmin}
        notifications={notifications}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={() => signOut(auth)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />
      
      <main className={cn(
        "flex-grow bg-white transition-all duration-350 relative z-10 min-h-screen",
        isMobile ? 'pb-24' : 'pb-8',
        density === 'compact' ? 'p-2.5 sm:p-4 md:p-5' : 
        density === 'large' ? 'p-6 sm:p-8 md:p-10' : 'p-4 sm:p-6 md:p-8'
      )}>
        <Suspense fallback={<PageLoading />}>
          <Toolbar 
            globalSearch={globalSearch}
            setGlobalSearch={(val) => {
              setGlobalSearch(val);
              if (val.length >= 2 && location.pathname !== '/stock/engines') {
                navigate('/stock/engines');
              }
            }}
            articles={articles}
            currentSite={currentSite}
            onSearchFocus={() => { if (location.pathname !== '/stock/engines') navigate('/stock/engines'); }}
            onOpenMenu={() => setSidebarOpen(true)}
            onNavigateToForensic={() => {
              if (isAdmin) navigate('/traceability');
              else toast.error("Le cockpit de télémétrie et de forensic système est réservé aux administrateurs.");
            }}
            onNavigateTo={(page) => setCurrentPage(page)}
            density={density}
            onChangeDensity={handleDensityChange}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            isDesktopViewport={isDesktopViewport}
            onToggleViewportMode={() => setIsDesktopViewport(p => !p)}
          />

          <AnimatePresence>
            {networkQuality === 'OFFLINE' && (
              <motion.div 
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 flex items-start gap-4 shadow-sm"
              >
                <div className="p-3 bg-amber-500/15 text-amber-600 rounded-lg shrink-0">
                  <WifiOff className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500 text-amber-950 rounded flex items-center gap-1">
                      <WifiOff className="w-3 h-3" /> MODE HORS-LIGNE ACTIF
                    </span>
                    {retryQueue.length > 0 && (
                      <span className="text-xs text-amber-700 font-extrabold uppercase tracking-wide">
                        {retryQueue.length} opération{retryQueue.length > 1 ? 's' : ''} en attente
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Connexion réseau absente ou instable sur le chantier
                  </h3>
                  <p className="text-xs text-slate-600">
                    L'application fonctionne en Offline-First. Vos mouvements et saisies sont sauvegardés localement (IndexedDB) et se synchroniseront automatiquement au retour de la connexion.
                  </p>
                </div>
              </motion.div>
            )}

            {networkQuality === 'RECOVERING' && (
              <motion.div 
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4 flex items-start gap-4 shadow-sm"
              >
                <div className="p-3 bg-emerald-500/15 text-emerald-600 rounded-lg shrink-0">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-500 text-emerald-950 rounded flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> SYNCHRONISATION EN COURS
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Réseau rétabli — Consolidation des données de chantier
                  </h3>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {maintenanceMode && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-8 flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-amber-500/15 text-amber-600 rounded-lg animate-pulse">
                <Lock className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500 text-amber-950 rounded">
                    SÉCURITÉ ET MAINTENANCE ACTIVES
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Système en accès restreint : <span className="text-amber-800 font-mono font-bold">{maintenanceReason || "Maintenance de routine."}</span>
                </p>
              </div>
            </div>
          )}

          <div className="max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/" element={<CockpitPage />} />
              <Route path="/stock/engines" element={<StockEnginesPage />} />
              <Route path="/stock/perforators" element={<StockPerforatorsPage />} />
              <Route path="/stock/consumables" element={<StockConsumablesPage />} />
              <Route path="/stock/epi" element={<StockEpiPage />} />
              <Route path="/mouvement/entree" element={<BonEntreePage />} />
              <Route path="/mouvement/sortie" element={<BonSortiePage />} />
              <Route path="/inventaire" element={<InventairePage />} />
              <Route path="/traceability" element={<TraceabilityPage />} />
              <Route path="/transfers" element={<TransfersPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/restock" element={<RestockPage />} />
              <Route path="/catalog/master" element={<MasterCatalogPage />} />
              <Route path="/catalog/hydromines" element={<HydrominesCatalogPage />} />
              
              {/* Admin Guarded Routes */}
              <Route path="/maintenance" element={isAdmin ? <MaintenancePage /> : <Navigate to="/" replace />} />
              <Route path="/reports" element={isAdmin ? <ReportsPage /> : <Navigate to="/" replace />} />
              <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/" replace />} />
              <Route path="/audit" element={isAdmin ? <AuditLogsPage /> : <Navigate to="/" replace />} />
              
              {/* Super Admin Guarded Routes */}
              <Route path="/finance" element={isSuperAdmin ? <FinancialPage /> : <Navigate to="/" replace />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Suspense>
      </main>

      {/* Floating Bottom Dock Navigation Menu for Mobile Devices */}
      {isMobile && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-[40] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-2xl p-2 flex justify-around items-center max-w-[500px] mx-auto select-none gap-0.5">
          <button
            onClick={() => navigate('/')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all flex-1 min-h-[44px]",
              location.pathname === '/' ? "text-sky-600 bg-sky-50 font-black" : "text-slate-400"
            )}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-tight scale-90">Cockpit</span>
          </button>

          <button
            onClick={() => navigate('/mouvement/entree')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all flex-1 min-h-[44px]",
              location.pathname === '/mouvement/entree' ? "text-emerald-600 bg-emerald-50 font-black" : "text-slate-400"
            )}
          >
            <ArrowDownLeft className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-tight scale-90">Entrées</span>
          </button>

          <button
            onClick={() => navigate('/mouvement/sortie')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all flex-1 min-h-[44px]",
              location.pathname === '/mouvement/sortie' ? "text-rose-600 bg-rose-50 font-black" : "text-slate-400"
            )}
          >
            <ArrowUpRight className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-tight scale-90">Sorties</span>
          </button>

          <button
            onClick={() => navigate('/restock')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all relative flex-1 min-h-[44px]",
              location.pathname === '/restock' ? "text-amber-600 bg-amber-50 font-black" : "text-slate-400"
            )}
          >
            <ShoppingCart className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-tight scale-90">Alertes</span>
            {notifications.filter(n => n.siteId === currentSite && !n.isRead).length > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl text-slate-400 flex-1 min-h-[44px]"
          >
            <Menu className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-tight scale-90">Plus</span>
          </button>
        </div>
      )}

      {selectedArticle && (
        <ArticleDetail 
          article={selectedArticle} 
          mouvements={movementsList} 
          onClose={() => setSelectedArticle(null)} 
        />
      )}
    </div>
  );
}

export function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { isLoaded, currentUser } = useInventory();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-sky-100 border-t-sky-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-lg animate-pulse">Initialisation Sécurité...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-lg animate-pulse">Initialisation Système Magasinier...</p>
        </div>
      </div>
    );
  }

  if (currentUser && (!currentUser.active || currentUser.status !== 'APPROVED')) {
    const isRootSuperAdmin = currentUser?.email?.toLowerCase() === 'ouzrirouyahya@gmail.com';
    if (!isRootSuperAdmin) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 font-sans select-none px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white border border-slate-150 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center space-y-6"
          >
            <div className="flex justify-center flex-col items-center gap-3">
              <div className="flex justify-center">
                <img 
                  src={hydrominesLogo} 
                  alt="HYDROMINES Logo" 
                  className="w-[120px] h-[120px] object-contain select-none"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {currentUser.status === 'REJECTED' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-[9px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Demande Refusée
                </div>
              ) : currentUser.active === false && currentUser.status === 'APPROVED' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Compte Désactivé
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-[9px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  Attente d'Approbation
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                {currentUser.status === 'REJECTED' 
                  ? "Accès Refusé" 
                  : currentUser.active === false && currentUser.status === 'APPROVED'
                  ? "Compte Temporairement Désactivé"
                  : "Validation de Profil Requise"}
              </h1>
              
              <div className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl max-w-sm mx-auto border border-slate-100 text-left space-y-3">
                <p>
                  <strong>Identifiant enregistré :</strong> <span className="font-mono text-[10px] text-slate-600 font-bold">{currentUser.email}</span>
                </p>
                <p>
                  <strong>Rôle demandé :</strong> <span className="text-slate-800 font-extrabold">{currentUser.requestedRole === 'ADMIN' ? 'Administration' : currentUser.requestedRole === 'MAGASINIER' ? 'Magasinier' : 'Lecture Seule'}</span>
                </p>
                {currentUser.assignedSite && (
                  <p>
                    <strong>Chantier principal :</strong> <span className="text-slate-800 font-extrabold">{currentUser.assignedSite}</span>
                  </p>
                )}
                <div className="h-[1px] bg-slate-200/60 my-2" />
                <p className="text-[11px] leading-normal font-semibold text-slate-600">
                  {currentUser.status === 'REJECTED' 
                    ? "Votre demande de profil a été déclinée par l'administrateur système. Veuillez contacter la direction logistique d'Hydromines pour régulariser votre situation." 
                    : currentUser.active === false && currentUser.status === 'APPROVED'
                    ? "Votre accès a été verrouillé par un administrateur système. Vos jetons de sécurité sont temporairement invalides."
                    : "Votre profil de connexion a été enregistré et mis en file d'attente d'approbation auprès de la direction logistique. Vous serez immédiatement redirigé une fois le profil approuvé."}
                </p>
              </div>
            </div>

            <button 
              onClick={() => signOut(auth)}
              className="w-full py-3 bg-slate-950 hover:bg-slate-850 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-slate-950"
            >
              Se déconnecter de ce profil
            </button>
          </motion.div>
        </div>
      );
    }
  }

  return (
    <BrowserRouter>
      <LayoutWrapper />
    </BrowserRouter>
  );
}

export default App;
