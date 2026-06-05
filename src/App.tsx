/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar, Page } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';

import { MouvementForm } from './components/MouvementForm';
// Lazy loaded components
const StockTable = lazy(() => import('./components/StockTable').then(m => ({ default: m.StockTable })));
const ArticleManagement = lazy(() => import('./components/ArticleManagement').then(m => ({ default: m.ArticleManagement })));
const EpiTracking = lazy(() => import('./components/EpiTracking').then(m => ({ default: m.EpiTracking })));
const TransfertPage = lazy(() => import('./components/TransfertPage').then(m => ({ default: m.TransfertPage })));
const InventairePage = lazy(() => import('./components/InventairePage').then(m => ({ default: m.InventairePage })));
const StockAlertView = lazy(() => import('./components/StockAlertView').then(m => ({ default: m.StockAlertView })));
const ReportPage = lazy(() => import('./components/ReportPage').then(m => ({ default: m.ReportPage })));
const RestockModule = lazy(() => import('./components/RestockModule').then(m => ({ default: m.RestockModule })));
const AIAnalytics = lazy(() => import('./components/AIAnalytics').then(m => ({ default: m.AIAnalytics })));
const AIChatExpert = lazy(() => import('./components/AIChatExpert').then(m => ({ default: m.AIChatExpert })));
const ProductionChecklist = lazy(() => import('./components/ProductionChecklist').then(m => ({ default: m.ProductionChecklist })));
const TraceabilityCenter = lazy(() => import('./components/TraceabilityCenter').then(m => ({ default: m.TraceabilityCenter })));
const ArticleDetail = lazy(() => import('./components/ArticleDetail').then(m => ({ default: m.ArticleDetail })));
const MaintenanceModule = lazy(() => import('./components/MaintenanceModule').then(m => ({ default: m.MaintenanceModule })));
const ReturnsManagement = lazy(() => import('./components/ReturnsManagement').then(m => ({ default: m.ReturnsManagement })));
const FinancialDashboard = lazy(() => import('./components/FinancialDashboard').then(m => ({ default: m.FinancialDashboard })));
const ForensicDashboard = lazy(() => import('./components/ForensicDashboard'));
const IndustrialIntelligenceDashboard = lazy(() => import('./components/IndustrialIntelligenceDashboard'));
const FieldOperatorWorkspace = lazy(() => import('./components/FieldOperatorWorkspace'));
const UserAdmin = lazy(() => import('./components/UserAdmin').then(m => ({ default: m.UserAdmin })));
const IntelligenceCenter = lazy(() => import('./components/IntelligenceCenter').then(m => ({ default: m.IntelligenceCenter })));

// Tracking
import { ViewerTracker } from './components/ViewerTracker';
import { ViewerNotificationModal } from './components/common/ViewerNotificationModal';

// Shared Components
import LoginPage from './components/LoginPage';
import { PageLoading } from './components/common/PageLoading';
import { HydrominesSecurityAlert } from './components/common/HydrominesSecurityAlert';
import { Toolbar } from './components/layout/Toolbar';

// Context & Types
import { useInventory } from './context/InventoryContext';
import { Article, SiteCode, PurchaseRequest } from './types';
import { Loader2, ShieldAlert, Lock, LayoutDashboard, ArrowDownLeft, ArrowUpRight, ShoppingCart, Menu, Database } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { toast } from 'sonner';
import { cn } from './lib/utils';

export default function App() {
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() => {
    const saved = localStorage.getItem('hydromines_viewport_mode');
    // Forcer le mode ordinateur (true) par défaut sur tous les téléphones
    return saved === null || saved === 'desktop';
  });

  const [isMobile, setIsMobile] = useState(false);
  const [density, setDensity] = useState<'compact' | 'standard' | 'large'>(() => {
    return (localStorage.getItem('hydromines_layout_density') as 'compact' | 'standard' | 'large') || 'compact';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('hydromines_dark_mode') === 'true';
  });

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('hydromines_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Synchronisation dynamique du viewport de l'appareil
  useEffect(() => {
    try {
      const vp = document.getElementById('viewport-meta');
      if (vp) {
        if (isDesktopViewport) {
          const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobileDevice) {
            vp.setAttribute('content', 'width=1280, initial-scale=0.27, minimum-scale=0.1, maximum-scale=5.0');
          } else {
            vp.setAttribute('content', 'width=device-width, initial-scale=1.0');
          }
        } else {
          vp.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }
      }
      localStorage.setItem('hydromines_viewport_mode', isDesktopViewport ? 'desktop' : 'mobile');
      
      // Dispatch resize event to let component recalculate layout states
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    } catch (e) {
      console.error('[Viewport Sync UI Error]', e);
    }
  }, [isDesktopViewport]);

  const handleDensityChange = (d: 'compact' | 'standard' | 'large') => {
    setDensity(d);
    localStorage.setItem('hydromines_layout_density', d);
  };

  useEffect(() => {
    const handleResize = () => {
      // Si "isDesktopViewport" est actif, on traite l'environnement comme un desktop (isMobile = false)
      const mobileActive = window.innerWidth < 1024 && !isDesktopViewport;
      setIsMobile(mobileActive);
      if (mobileActive) {
        setDensity('compact');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDesktopViewport]);

  const [currentPageRaw, setCurrentPageRaw] = useState<Page>('COCKPIT');
  const [showAdminAlert, setShowAdminAlert] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSite, setCurrentSite] = useState<SiteCode>('SMI');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [aiTab, setAiTab] = useState<'DASHBOARD' | 'ANOMALIES' | 'PREDICTIONS' | 'FINANCIAL' | 'COMPLIANCE' | 'PROCUREMENT' | 'MECHANIC' | 'VISION' | 'FRAUD' | 'REPORT_CENTER'>('DASHBOARD');
  const [radarTab, setRadarTab] = useState<'ASSISTANT' | 'VISION' | 'AUDIT' | 'WORKFLOWS' | 'FORENSIC' | 'CHECKLIST'>('ASSISTANT');

  const currentPage = currentPageRaw;
  const setCurrentPage = (page: any) => {
    // SRE CHANGE CONTROL: Redirect ALERTES_STOCK navigation to RESTOCK_MGMT (Action 2)
    let targetPage = page;
    if (page === 'ALERTES_STOCK') {
      targetPage = 'RESTOCK_MGMT';
    } else if (page === 'MAGASINIER_IA') {
      targetPage = 'HYDROMINES_RADAR';
      setRadarTab('ASSISTANT');
    } else if (page === 'VISION_IA') {
      targetPage = 'HYDROMINES_RADAR';
      setRadarTab('VISION');
    } else if (page === 'AUDIT_INTELLIGENCE') {
      targetPage = 'HYDROMINES_RADAR';
      setRadarTab('AUDIT');
    } else if (page === 'AUTOMATION_WORKFLOWS') {
      targetPage = 'HYDROMINES_RADAR';
      setRadarTab('WORKFLOWS');
    } else if (page === 'FORENSIC') {
      targetPage = 'HYDROMINES_RADAR';
      setRadarTab('FORENSIC');
    } else if (page === 'IA_CHECKLIST') {
      targetPage = 'HYDROMINES_RADAR';
      setRadarTab('CHECKLIST');
    } else if (page && typeof page === 'object' && 'page' in page && page.page === 'ALERTES_STOCK') {
      targetPage = { ...page, page: 'RESTOCK_MGMT' };
    }

    if (targetPage && typeof targetPage === 'object') {
      if ('tab' in targetPage) {
        setAiTab(targetPage.tab);
      }
      if ('page' in targetPage) {
        setCurrentPageRaw(targetPage.page);
      } else {
        setCurrentPageRaw('COCKPIT');
      }
    } else {
      setCurrentPageRaw(targetPage);
    }
  };
  
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  
  const { 
    articles, mouvements, distributions, auditLogs, transferts, inventaires,
    engins, perfos, agents, catalog, accounts, purchaseRequests, notifications, isLoaded,
    addMouvement, addTransfert, completeTransfert, saveInventaire, saveArticle, 
    deleteArticle, toggleUser, setEngin, setPerfo, setAgent, saveCatalogItem, 
    deleteCatalogItem, addPurchaseRequest, updatePRStatus,
    isSafeMode, rcglResult,
    maintenanceMode, maintenanceReason
  } = useInventory();

  useEffect(() => {
    const bypassEmail = localStorage.getItem('hydromines_bypass_email');
    if (bypassEmail) {
      const isSuper = bypassEmail.toLowerCase() === 'ouzrirouyahya@gmail.com';
      setUser({
        uid: isSuper ? 'bypass_super_uid' : 'bypass_magasinier_uid',
        email: bypassEmail,
        displayName: isSuper ? 'Yahya O. (SUPER_ADMIN)' : 'Magasinier Hydro',
        emailVerified: true
      } as any);
      setIsAuthLoading(false);
      return;
    }

    if (localStorage.getItem('hydromines_viewer_mode') === 'true') {
      setUser({
        uid: 'viewer_mode_uid',
        email: 'viewer@hydromines.local',
        displayName: 'Démonstrateur',
        emailVerified: true
      } as any);
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    const isViewer = localStorage.getItem('hydromines_viewer_mode') === 'true';
    const isBypass = !!localStorage.getItem('hydromines_bypass_email');
    localStorage.removeItem('hydromines_viewer_mode');
    localStorage.removeItem('hydromines_bypass_email');
    sessionStorage.removeItem('hydromines_viewer_notice_dismissed');
    setUser(null);
    if (isViewer || isBypass) {
      window.location.reload();
    } else {
      signOut(auth);
    }
  };

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
    return (
      <>
        <ViewerTracker currentPage="LOGIN" />
        <LoginPage />
      </>
    );
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

  const isSuperAdmin = user?.email?.toLowerCase() === 'ouzrirouyahya@gmail.com' || accounts.find(a => a.email?.toLowerCase() === user?.email?.toLowerCase())?.role === 'SUPER_ADMIN';
  const isAdmin = accounts.find(a => a.email?.toLowerCase() === user?.email?.toLowerCase())?.role === 'ADMIN' || isSuperAdmin;

  const navigateToMouvement = (id: string, type: 'IN' | 'OUT') => {
    setSelectedArticleId(id);
    setCurrentPage(type === 'IN' ? 'BON_ENTREE' : 'BON_SORTIE');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'COCKPIT':
        return (
          <div className="space-y-12">
            <Dashboard 
              site={currentSite} 
              articles={articles} 
              mouvements={mouvements} 
              isAdmin={isAdmin}
              onArticleClick={setSelectedArticle}
              onAction={(page) => {
                if (typeof page === 'object' && page !== null) {
                  if (!isAdmin) {
                    toast.error("Accès réservé aux administrateurs");
                    return;
                  }
                  if ('tab' in page) {
                    setAiTab(page.tab);
                  }
                  setCurrentPage('COCKPIT');
                } else {
                  setCurrentPage(page);
                }
              }} 
            />
          </div>
        );
      
      case 'STOCK_ENGINS':
      case 'STOCK_PERFORATEURS':
      case 'STOCK_CONSOMMABLES':
      case 'SEARCH_RESULTS':
        const stockType = currentPage === 'STOCK_ENGINS' ? 'ENGINS' : 
                          currentPage === 'STOCK_PERFORATEURS' ? 'PERFORATEURS' : 
                          currentPage === 'STOCK_CONSOMMABLES' ? 'CONSOMMABLES' : 'ALL';
        return (
          <StockTable 
            type={stockType} 
            site={currentSite} 
            articles={articles} 
            initialSearch={globalSearch}
            onAction={navigateToMouvement}
            onViewDetail={setSelectedArticle}
            onManageCatalog={() => setCurrentPage('GESTION_ARTICLES')}
          />
        );
      
      case 'STOCK_EPI':
        return <EpiTracking site={currentSite} articles={articles} distributions={distributions} />;
      
      case 'BON_ENTREE':
      case 'BON_SORTIE':
        return (
          <MouvementForm 
            type={currentPage === 'BON_ENTREE' ? 'ENTREE' : 'SORTIE'} 
            site={currentSite}
            articles={articles}
            catalog={catalog}
            engins={engins}
            perfos={perfos}
            agents={agents}
            initialArticleId={selectedArticleId || undefined}
            onArticleCreate={saveArticle}
            onSubmit={async (m) => {
              try {
                await toast.promise(addMouvement(m), {
                  loading: "Enregistrement du bon et mise à jour du stock...",
                  success: "Mouvement enregistré et stock mis à jour !",
                  error: (err: any) => `Échec : ${err.message || err}`
                });
                setSelectedArticleId(null);
                setCurrentPage('TRACEABILITY');
              } catch (e) {
                console.error("Mouvement submission failed:", e);
              }
            }} 
          />
        );
      
      case 'INVENTAIRE':
        return (
          <InventairePage 
            currentSite={currentSite}
            articles={articles}
            inventaires={inventaires}
            onSaveInventaire={saveInventaire}
            isAdmin={isAdmin}
          />
        );

      case 'TRACEABILITY':
        return (
          <TraceabilityCenter 
            site={currentSite} 
            logs={auditLogs} 
            mouvements={mouvements} 
            articles={articles} 
          />
        );
      
      case 'GESTION_ARTICLES':
        return (
          <ArticleManagement 
            site={currentSite}
            articles={articles} 
            catalog={catalog}
            saveCatalogItem={saveCatalogItem}
            deleteCatalogItem={deleteCatalogItem}
            onSave={saveArticle} 
            onDelete={deleteArticle} 
          />
        );

      case 'REPORTS':
        return <ReportPage />;
        
      case 'RESTOCK_MGMT':
        return (
          <div className="space-y-12">
            <StockAlertView site={currentSite} articles={articles} onAction={navigateToMouvement} />
            <div className="border-t border-slate-100 pt-12">
              <RestockModule 
                site={currentSite}
                articles={articles}
                purchaseRequests={purchaseRequests}
                onCreatePR={(items) => {
                  const pr: PurchaseRequest = {
                    id: '', // Hook will generate
                    site: currentSite,
                    date: new Date().toISOString(),
                    status: 'BROUILLON',
                    items,
                    createdBy: user?.email || '',
                  };
                  addPurchaseRequest(pr);
                }}
                onUpdatePRStatus={updatePRStatus}
              />
            </div>
          </div>
        );

      case 'HYDROMINES_RADAR':
      case 'MAGASINIER_IA':
      case 'AUDIT_INTELLIGENCE':
      case 'AUTOMATION_WORKFLOWS':
      case 'IA_CHECKLIST':
      case 'FORENSIC':
      case 'VISION_IA':
        if (!isAdmin) {
          setShowAdminAlert(true);
          setCurrentPage('COCKPIT');
          return null;
        }
        return (
          <IntelligenceCenter 
            currentSite={currentSite} 
            activeTab={radarTab} 
            onTabChange={(tab) => setRadarTab(tab)} 
          />
        );

      case 'TRANSFERS':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <TransfertPage 
              currentSite={currentSite}
              articles={articles}
              transferts={transferts}
              onAddTransfert={async (t) => {
                try {
                  await toast.promise(addTransfert(t), {
                    loading: "Initialisation de l'expédition et lancement du convoi...",
                    success: "Transfert initié et convoi parti !",
                    error: (err: any) => `Échoué: ${err.message || err}`
                  });
                } catch (e) {
                  console.error("Transfer dispatch failed:", e);
                }
              }}
              onCompleteTransfert={async (id, recepteur) => {
                try {
                  await toast.promise(completeTransfert(id, recepteur), {
                    loading: "Vérification et déchargement dans le sas...",
                    success: "Transfert réceptionné avec succès et stock ajusté !",
                    error: (err: any) => `Échoué: ${err.message || err}`
                  });
                } catch (e) {
                  console.error("Transfer completion failed:", e);
                }
              }}
            />
          </motion.div>
        );

      case 'RETURNS':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <ReturnsManagement />
          </motion.div>
        );

      case 'TRANSFERS_RETURNS':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <TransfertPage 
              currentSite={currentSite}
              articles={articles}
              transferts={transferts}
              onAddTransfert={async (t) => {
                try {
                  await toast.promise(addTransfert(t), {
                    loading: "Initialisation de l'expédition et lancement du convoi...",
                    success: "Transfert initié et convoi parti !",
                    error: (err: any) => `Échoué: ${err.message || err}`
                  });
                } catch (e) {
                  console.error("Transfer dispatch failed:", e);
                }
              }}
              onCompleteTransfert={async (id, recepteur) => {
                try {
                  await toast.promise(completeTransfert(id, recepteur), {
                    loading: "Vérification et déchargement dans le sas...",
                    success: "Transfert réceptionné avec succès et stock ajusté !",
                    error: (err: any) => `Échoué: ${err.message || err}`
                  });
                } catch (e) {
                  console.error("Transfer completion failed:", e);
                }
              }}
            />
            <div className="border-t border-slate-100 pt-12">
              <ReturnsManagement />
            </div>
          </motion.div>
        );

      case 'MAINTENANCE':
        if (!isAdmin) {
          setShowAdminAlert(true);
          setCurrentPage('COCKPIT');
          return null;
        }
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <MaintenanceModule />
          </motion.div>
        );

      case 'FINANCE':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <FinancialDashboard />
          </motion.div>
        );

      // Handled in HYDROMINES_RADAR block above

      case 'ALERTES_STOCK':
        return <StockAlertView site={currentSite} articles={articles} onAction={navigateToMouvement} />;

      case 'USER_MGMT':
        if (!isAdmin) {
          setShowAdminAlert(true);
          setCurrentPage('COCKPIT');
          return null;
        }
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <UserAdmin 
              accounts={accounts}
              onToggleStatus={toggleUser}
              engins={engins}
              onSetEngin={setEngin}
              perfos={perfos}
              onSetPerfo={setPerfo}
              agents={agents}
              onSetAgent={setAgent}
              isSuperAdmin={isSuperAdmin}
            />
          </motion.div>
        );
        
      default:
        return <Dashboard site={currentSite} articles={articles} mouvements={mouvements} onAction={setCurrentPage} isAdmin={isAdmin} />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0c101d] flex relative overflow-hidden transition-colors duration-300" data-density={density}>
      {showAdminAlert && <HydrominesSecurityAlert onClose={() => setShowAdminAlert(false)} />}
      
      <ViewerTracker currentPage={currentPage} user={user} isAdmin={isAdmin} />
      
      {/* Professional HYDROMINES Visitor Notice Modal */}
      <ViewerNotificationModal />
      
      <Sidebar 
        currentPage={currentPage} 
        setPage={(page) => {
          if ((page === 'HYDROMINES_RADAR' || page === 'MAGASINIER_IA' || page === 'AUDIT_INTELLIGENCE' || page === 'IA_CHECKLIST' || page === 'FORENSIC' || page === 'VISION_IA' || page === 'USER_MGMT') && !isAdmin) {
            setShowAdminAlert(true);
            return;
          }
          setCurrentPage(page);
        }} 
        currentSite={currentSite}
        setSite={setCurrentSite}
        user={user}
        isAdmin={isAdmin}
        notifications={notifications}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />
      
      <main className={`flex-grow transition-all duration-350 relative min-h-screen ${
        isMobile ? 'pb-24' : 'pb-8'
      } ${
        density === 'compact' ? 'p-2.5 sm:p-4 md:p-5' : 
        density === 'large' ? 'p-6 sm:p-8 md:p-10' : 'p-4 sm:p-6 md:p-8'
      }`}>
        <Suspense fallback={<PageLoading />}>
          <Toolbar 
            globalSearch={globalSearch}
            setGlobalSearch={(val) => {
              setGlobalSearch(val);
              if (val.length >= 2 && currentPage !== 'SEARCH_RESULTS') {
                setCurrentPage('SEARCH_RESULTS');
              }
            }}
            articles={articles}
            currentSite={currentSite}
            onSearchFocus={() => {
               if (currentPage !== 'SEARCH_RESULTS') setCurrentPage('SEARCH_RESULTS');
            }}
            onOpenMenu={() => setSidebarOpen(true)}
            onNavigateToForensic={() => {
              if (isAdmin) {
                setCurrentPage('FORENSIC');
              } else {
                toast.error("Le cockpit de télémétrie et de forensic système est réservé aux administrateurs.");
              }
            }}
            onNavigateTo={(page) => {
              setCurrentPage(page as any);
            }}
            density={density}
            onChangeDensity={handleDensityChange}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            isDesktopViewport={isDesktopViewport}
            onToggleViewportMode={() => setIsDesktopViewport(p => !p)}
          />

          {maintenanceMode && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-8 flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-amber-500/15 text-amber-600 rounded-lg animate-pulse">
                <Lock className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500 text-amber-950 rounded flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> VERROU DE MAINTENANCE PROTÉGÉ
                  </span>
                  {isAdmin ? (
                    <span className="text-xs text-emerald-600 font-extrabold uppercase tracking-wide">
                      AUTHENTIFIÉ ADMIN — CONDUITE ET ÉCRITURES CLOUD PERMISES SANS RESTRICTION
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700 font-extrabold uppercase tracking-wide">
                      MUTATIONS ET ÉCRITURES CENTRALES BLOQUÉES
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  SYSTÈME EN ACCÈS RESTREINT (MAINTENANCE DE SÉCURITÉ)
                </h3>
                <p className="text-xs text-slate-600">
                  L'administrateur système a activé les règles de maintenance d'état de niveau enterprise. Raison : <span className="text-amber-800 font-mono font-bold">{maintenanceReason || "Maintenance de routine / Alignements invariants."}</span>
                </p>
                {isAdmin && (
                  <p className="text-[10px] text-emerald-600 font-bold font-mono uppercase tracking-wider mt-2">
                    En tant qu'administrateur, vos écritures et corrections contournent ce verrouillage et sont transmises directement à Firestore.
                  </p>
                )}
              </div>
            </div>
          )}

          {localStorage.getItem('hydromines_viewer_mode') === 'true' && (
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-5 mb-8 flex items-start gap-4 shadow-sm animate-in fade-in duration-300">
              <div className="p-3 bg-sky-500/15 text-sky-600 rounded-lg font-bold">
                <Database className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-sky-500 text-white rounded flex items-center gap-1">
                    <Database className="w-3 h-3" /> MODE DÉMONSTRATEUR (LECTURE SEULE)
                  </span>
                  <span className="text-xs text-sky-700 font-extrabold uppercase tracking-wide">
                    CONSULTATION SEULE SÉCURISÉE
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  Espace de Démonstration Hydromines
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  Vous êtes connecté en tant que <strong className="text-slate-800">Démonstrateur</strong>. Vos données précédemment créées ou importées sont <strong className="text-emerald-700 font-bold">précieusement conservées</strong> et restent consultables. Cependant, tout ajout ou modification est désormais désactivé dans ce mode. Loguez-vous comme Super Admin pour bénéficier des accès en écriture complète !
                </p>
                <div className="flex items-center gap-2.5 mt-2.5 pt-1">
                  <button
                    onClick={() => {
                      if (confirm("Voulez-vous réinitialiser toutes vos fiches d'articles et mouvements locaux pour restaurer la démo d'origine ?")) {
                        localStorage.removeItem('hydromines_simulated_articles');
                        localStorage.removeItem('hydromines_simulated_mouvements');
                        toast.success("Données de démo réinitialisées !");
                        setTimeout(() => window.location.reload(), 600);
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border border-rose-100 cursor-pointer"
                  >
                    Réinitialiser les données de démo
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-[1600px] mx-auto">
            {renderPage()}
          </div>
        </Suspense>
      </main>

      {/* Floating Bottom Dock Navigation Menu for Mobile Devices */}
      {isMobile && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-[40] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-2xl p-2 flex justify-around items-center animate-in slide-in-from-bottom-5 duration-500 max-w-[500px] mx-auto select-none gap-0.5">
          <button
            onClick={() => setCurrentPage('COCKPIT')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all flex-1 min-h-[44px]",
              currentPage === 'COCKPIT' ? "text-sky-600 bg-sky-50 font-black" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-tight scale-90">Cockpit</span>
          </button>

          <button
            onClick={() => setCurrentPage('BON_ENTREE')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all flex-1 min-h-[44px]",
              currentPage === 'BON_ENTREE' ? "text-emerald-600 bg-emerald-50 font-black" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <ArrowDownLeft className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-tight scale-90">Entrées</span>
          </button>

          <button
            onClick={() => setCurrentPage('BON_SORTIE')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all flex-1 min-h-[44px]",
              currentPage === 'BON_SORTIE' ? "text-rose-600 bg-rose-50 font-black" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <ArrowUpRight className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-tight scale-90">Sorties</span>
          </button>

          <button
            onClick={() => setCurrentPage('RESTOCK_MGMT')}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all relative flex-1 min-h-[44px]",
              currentPage === 'RESTOCK_MGMT' ? "text-amber-600 bg-amber-50 font-black" : "text-slate-400 hover:text-slate-600"
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
            className="flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 flex-1 min-h-[44px]"
          >
            <Menu className="w-5 h-5 flex-shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-tight scale-90">Plus</span>
          </button>
        </div>
      )}

      {selectedArticle && (
        <ArticleDetail 
          article={selectedArticle} 
          mouvements={mouvements} 
          onClose={() => setSelectedArticle(null)} 
        />
      )}
    </div>
  );
}
