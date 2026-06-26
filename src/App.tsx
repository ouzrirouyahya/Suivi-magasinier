import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useInventory } from './context/InventoryContext';
import { cn } from './lib/utils';
import { toast } from 'sonner';
import { 
  WifiOff, RefreshCw, Lock, LayoutDashboard, 
  ArrowDownLeft, ArrowUpRight, ShoppingCart, Menu
} from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { PageLoading } from './components/common/PageLoading';
import { Toolbar } from './components/layout/Toolbar';
import { ArticleDetail } from './components/ArticleDetail';
import { AppRoutes } from './app/routes';

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
};

function AuthenticatedLayout() {
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

  const {
    currentSite, setCurrentSite, currentUser, networkQuality, retryQueue = [],
    maintenanceMode, maintenanceReason, articles, selectedArticle, setSelectedArticle,
    notifications, globalSearch, setGlobalSearch, movements: movementsList
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

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN' || isSuperAdmin;

  const isAuthPage = ['/login', '/pending', '/rejected', '/disabled'].includes(location.pathname) || !currentUser;

  if (isAuthPage) {
    return <AppRoutes />;
  }

  return (
    <div className="min-h-screen bg-white flex relative overflow-hidden" data-density={density}>
      <Sidebar 
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
              if (val.length >= 2 && location.pathname !== '/stock/engins') {
                navigate('/stock/engins');
              }
            }}
            articles={articles}
            currentSite={currentSite}
            onSearchFocus={() => { if (location.pathname !== '/stock/engins') navigate('/stock/engins'); }}
            onOpenMenu={() => setSidebarOpen(true)}
            onNavigateToForensic={() => {
              if (isAdmin) navigate('/traceability');
              else toast.error("Le cockpit de télémétrie et de forensic système est réservé aux administrateurs.");
            }}
            onNavigateTo={(page) => { const r = pageRouteMap[page]; if (r) navigate(r); }}
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
            <AppRoutes />
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
            onClick={() => navigate('/movement/entree')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all flex-1 min-h-[44px]",
              location.pathname === '/movement/entree' ? "text-emerald-600 bg-emerald-50 font-black" : "text-slate-400"
            )}
          >
            <ArrowDownLeft className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-tight scale-90">Entrées</span>
          </button>

          <button
            onClick={() => navigate('/movement/sortie')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all flex-1 min-h-[44px]",
              location.pathname === '/movement/sortie' ? "text-rose-600 bg-rose-50 font-black" : "text-slate-400"
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
  return (
    <BrowserRouter>
      <AuthenticatedLayout />
    </BrowserRouter>
  );
}

export default App;
