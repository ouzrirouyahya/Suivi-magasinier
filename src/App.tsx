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
const HydrominesCatalog = lazy(() => import('./components/HydrominesCatalog').then(m => ({ default: m.HydrominesCatalog })));
const TransfertPage = lazy(() => import('./components/TransfertPage').then(m => ({ default: m.TransfertPage })));
const InventairePage = lazy(() => import('./components/InventairePage').then(m => ({ default: m.InventairePage })));
const StockAlertView = lazy(() => import('./components/StockAlertView').then(m => ({ default: m.StockAlertView })));
const ReportPage = lazy(() => import('./components/ReportPage').then(m => ({ default: m.ReportPage })));
const RestockModule = lazy(() => import('./components/RestockModule').then(m => ({ default: m.RestockModule })));
const TraceabilityCenter = lazy(() => import('./components/TraceabilityCenter').then(m => ({ default: m.TraceabilityCenter })));
const ArticleDetail = lazy(() => import('./components/ArticleDetail').then(m => ({ default: m.ArticleDetail })));
const MaintenanceModule = lazy(() => import('./components/MaintenanceModule').then(m => ({ default: m.MaintenanceModule })));
const ReturnsManagement = lazy(() => import('./components/ReturnsManagement').then(m => ({ default: m.ReturnsManagement })));
const FinancialDashboard = lazy(() => import('./components/FinancialDashboard').then(m => ({ default: m.FinancialDashboard })));
const UserAdmin = lazy(() => import('./components/UserAdmin').then(m => ({ default: m.UserAdmin })));
const EquipmentAnalysis = lazy(() => import('./components/EquipmentAnalysis').then(m => ({ default: m.EquipmentAnalysis })));

// Shared Components
import LoginPage from './components/LoginPage';
import { PageLoading } from './components/common/PageLoading';
import { HydrominesSecurityAlert } from './components/common/HydrominesSecurityAlert';
import { Toolbar } from './components/layout/Toolbar';
import hydrominesLogo from './assets/images/hydromines_logo.png';

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
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [aiTab, setAiTab] = useState<'DASHBOARD' | 'ANOMALIES' | 'PREDICTIONS' | 'FINANCIAL' | 'COMPLIANCE' | 'PROCUREMENT' | 'MECHANIC' | 'VISION' | 'FRAUD' | 'REPORT_CENTER'>('DASHBOARD');
  const [radarTab, setRadarTab] = useState<'ASSISTANT' | 'VISION' | 'AUDIT' | 'WORKFLOWS' | 'FORENSIC' | 'CHECKLIST'>('ASSISTANT');
  const [analyseSubTab, setAnalyseSubTab] = useState<'REPORTS' | 'CONSUMMATION'>('REPORTS');

  const currentPage = currentPageRaw;
  const setCurrentPage = (page: any) => {
    // SRE CHANGE CONTROL: Redirect ALERTES_STOCK navigation to RESTOCK_MGMT (Action 2)
    let targetPage = page;
    if (page === 'ALERTES_STOCK') {
      targetPage = 'RESTOCK_MGMT';
    } else if (page === 'REPORTS') {
      targetPage = 'ANALYSE_EQUIPEMENTS';
      setAnalyseSubTab('REPORTS');
    } else if (page === 'ANALYSE_EQUIPEMENTS') {
      targetPage = 'ANALYSE_EQUIPEMENTS';
      setAnalyseSubTab('CONSUMMATION');
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
    maintenanceMode, maintenanceReason,
    currentSite, setCurrentSite,
    currentUser
  } = useInventory();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    signOut(auth);
    setUser(null);
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
      <LoginPage />
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

  // PARTIE 4 — ACCÈS BLOQUÉ EN ATTENTE DE VALIDATION
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
            {/* Visual Header */}
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

            {/* Typography Content */}
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

            {/* Actions */}
            <button 
              onClick={handleSignOut}
              className="w-full py-3 bg-slate-950 hover:bg-slate-850 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-slate-950"
            >
              Se déconnecter de ce profil
            </button>
          </motion.div>
        </div>
      );
    }
  }

  const isSuperAdmin = user?.email?.toLowerCase() === 'ouzrirouyahya@gmail.com' || accounts.find(a => a.email?.toLowerCase() === user?.email?.toLowerCase())?.role === 'SUPER_ADMIN';
  const isAdmin = accounts.find(a => a.email?.toLowerCase() === user?.email?.toLowerCase())?.role === 'ADMIN' || isSuperAdmin;

  const navigateToMouvement = (id: string, type: 'IN' | 'OUT') => {
    setSelectedArticleId(id);
    setCurrentPage(type === 'IN' ? 'BON_ENTREE' : 'BON_SORTIE');
  };

  const canAccessPage = (page: string, role: string): boolean => {
    const SUPER_ADMIN_ONLY = ['FINANCE'];
    const ADMIN_AND_ABOVE = ['REPORTS', 'USER_MGMT'];
    const MAGASINIER_AND_ABOVE = [
      'COCKPIT', 'BON_ENTREE', 'BON_SORTIE', 'TRANSFERS', 
      'RETURNS', 'STOCK_ENGINS', 'STOCK_PERFORATEURS', 'STOCK_CONSOMMABLES',
      'STOCK_EPI', 'SEARCH_RESULTS', 'INVENTAIRE',
      'RESTOCK_MGMT', 'TRACEABILITY', 'GESTION_ARTICLES', 'CATALOGUE_HYDROMINES',
      'ALERTES_STOCK', 'ANALYSE_EQUIPEMENTS'
    ];
    
    if (SUPER_ADMIN_ONLY.includes(page)) {
      return role === 'SUPER_ADMIN';
    }
    if (ADMIN_AND_ABOVE.includes(page)) {
      return role === 'ADMIN' || role === 'SUPER_ADMIN';
    }
    if (MAGASINIER_AND_ABOVE.includes(page)) {
      return ['MAGASINIER', 'ADMIN', 'SUPER_ADMIN'].includes(role);
    }
    return false;
  };

  const renderPage = () => {
    const userRole = currentUser?.role || 'ADMIN';
    const isReadOnlyUser = currentUser?.role === 'ADMIN' && !currentUser?.canWrite;
    
    if (!canAccessPage(currentPage, userRole)) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6 text-slate-400 p-8">
          <ShieldAlert className="w-16 h-16 opacity-30 text-rose-500" />
          <p className="font-black uppercase tracking-[0.2em] text-sm text-slate-700">
            Accès non autorisé
          </p>
          <p className="text-xs text-slate-400 text-center max-w-xs -mt-3">
            Votre profil ({userRole}) ne dispose pas des permissions requises pour accéder à cette rubrique.
          </p>
          <button 
            onClick={() => setCurrentPage('COCKPIT')}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-slate-500/10 transition-all border border-slate-900"
          >
            Retour au tableau de bord
          </button>
        </div>
      );
    }

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
      case 'STOCK_EPI':
      case 'SEARCH_RESULTS':
        const stockType = currentPage === 'STOCK_ENGINS' ? 'ENGINS' : 
                          currentPage === 'STOCK_PERFORATEURS' ? 'PERFORATEURS' : 
                          currentPage === 'STOCK_CONSOMMABLES' ? 'CONSOMMABLES' : 
                          currentPage === 'STOCK_EPI' ? 'EPI' : 'ALL';
        return (
          <StockTable 
            type={stockType} 
            site={currentSite} 
            articles={articles} 
            mouvements={mouvements}
            initialSearch={globalSearch}
            onAction={navigateToMouvement}
            onViewDetail={setSelectedArticle}
            onManageCatalog={() => setCurrentPage('GESTION_ARTICLES')}
          />
        );
      
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
            isReadOnly={isReadOnlyUser}
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

      case 'CATALOGUE_HYDROMINES':
        return (
          <HydrominesCatalog />
        );
        
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
              currentUser={currentUser}
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
              currentSite={currentSite}
            />
          </motion.div>
        );

      case 'ANALYSE_EQUIPEMENTS':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-sm border border-slate-200 shadow-inner">
              <button 
                onClick={() => setAnalyseSubTab('REPORTS')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                  analyseSubTab === 'REPORTS' 
                    ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                📊 Rapports Annuels
              </button>
              <button 
                onClick={() => setAnalyseSubTab('CONSUMMATION')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                  analyseSubTab === 'CONSUMMATION' 
                    ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                ⛏️ Consommations
              </button>
            </div>
            
            {analyseSubTab === 'REPORTS' ? <ReportPage /> : <EquipmentAnalysis />}
          </motion.div>
        );
        
      default:
        return <Dashboard site={currentSite} articles={articles} mouvements={mouvements} onAction={setCurrentPage} isAdmin={isAdmin} />;
    }
  };

  return (
    <div className="min-h-screen bg-white flex relative overflow-hidden" data-density={density}>
      {showAdminAlert && <HydrominesSecurityAlert onClose={() => setShowAdminAlert(false)} />}
      
      <Sidebar 
        currentPage={currentPage} 
        setPage={(page) => {
          setCurrentPage(page);
        }} 
        currentSite={currentSite}
        setSite={(site) => {
          if (isAdmin) {
            setCurrentSite(site);
          }
        }} 
        user={user}
        isAdmin={isAdmin}
        notifications={notifications}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />
      
      <main className={`flex-grow bg-white transition-all duration-350 relative z-10 min-h-screen ${
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
