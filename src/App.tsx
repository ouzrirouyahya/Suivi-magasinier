/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar, Page } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';

// Lazy loaded components
const StockTable = lazy(() => import('./components/StockTable').then(m => ({ default: m.StockTable })));
const MouvementForm = lazy(() => import('./components/MouvementForm').then(m => ({ default: m.MouvementForm })));
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
const MagasinierIAHydro = lazy(() => import('./components/MagasinierIAHydro').then(m => ({ default: m.MagasinierIAHydro })));
const AuditIntelligenceMagasin = lazy(() => import('./components/AuditIntelligenceMagasin'));
const AutomationOrchestrator = lazy(() => import('./components/AutomationOrchestrator'));
const FieldOperatorWorkspace = lazy(() => import('./components/FieldOperatorWorkspace'));
const VisionIA = lazy(() => import('./components/VisionIA').then(m => ({ default: m.VisionIA })));
const UserAdmin = lazy(() => import('./components/UserAdmin').then(m => ({ default: m.UserAdmin })));

// Tracking
import { ViewerTracker } from './components/ViewerTracker';

// Shared Components
import LoginPage from './components/LoginPage';
import { PageLoading } from './components/common/PageLoading';
import { HydrominesSecurityAlert } from './components/common/HydrominesSecurityAlert';
import { Toolbar } from './components/layout/Toolbar';

// Context & Types
import { useInventory } from './context/InventoryContext';
import { Article, SiteCode, PurchaseRequest } from './types';
import { Loader2, ShieldAlert, Lock } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { toast } from 'sonner';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('COCKPIT');
  const [showAdminAlert, setShowAdminAlert] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSite, setCurrentSite] = useState<SiteCode>('SMI');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [aiTab, setAiTab] = useState<'DASHBOARD' | 'ANOMALIES' | 'PREDICTIONS' | 'FINANCIAL' | 'COMPLIANCE' | 'PROCUREMENT' | 'MECHANIC' | 'VISION' | 'FRAUD' | 'REPORT_CENTER'>('DASHBOARD');
  
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
    localStorage.removeItem('hydromines_viewer_mode');
    setUser(null);
    if (isViewer) {
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
                if (typeof page === 'object' && page.page === 'AI_ANALYTICS') {
                  if (!isAdmin) {
                    toast.error("Accès réservé aux administrateurs");
                    return;
                  }
                  setAiTab(page.tab);
                  setCurrentPage('COCKPIT');
                } else {
                  setCurrentPage(page);
                }
              }} 
            />
            {isAdmin && (
              <div className="border-t border-slate-100 pt-12">
                 <AIAnalytics 
                   site={currentSite} 
                   articles={articles} 
                   mouvements={mouvements} 
                   agents={agents} 
                   initialTab={aiTab} 
                 />
              </div>
            )}
          </div>
        );
      
      case 'FIELD_WORKSPACE':
        return <FieldOperatorWorkspace />;
      
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
            onSubmit={(m) => {
              addMouvement(m);
              setSelectedArticleId(null);
              setCurrentPage('TRACEABILITY');
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

      case 'MAGASINIER_IA':
        if (!isAdmin) {
          setShowAdminAlert(true);
          setCurrentPage('COCKPIT');
          return null;
        }
        return <MagasinierIAHydro />;

      case 'AUDIT_INTELLIGENCE':
        if (!isAdmin) {
          setShowAdminAlert(true);
          setCurrentPage('COCKPIT');
          return null;
        }
        return <AuditIntelligenceMagasin />;

      case 'AUTOMATION_WORKFLOWS':
        if (!isAdmin) {
          setShowAdminAlert(true);
          setCurrentPage('COCKPIT');
          return null;
        }
        return (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <AutomationOrchestrator />
          </motion.div>
        );

      case 'IA_CHECKLIST':
        if (!isAdmin) {
          setShowAdminAlert(true);
          setCurrentPage('COCKPIT');
          return null;
        }
        return <ProductionChecklist />;

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
              onAddTransfert={addTransfert}
              onCompleteTransfert={completeTransfert}
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

      case 'FORENSIC':
        if (!isAdmin) {
          setShowAdminAlert(true);
          setCurrentPage('COCKPIT');
          return null;
        }
        return (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <ForensicDashboard />
          </motion.div>
        );

      case 'VISION_IA':
        if (!isAdmin) {
          setShowAdminAlert(true);
          setCurrentPage('COCKPIT');
          return null;
        }
        return (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <VisionIA currentSite={currentSite} />
          </motion.div>
        );

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
    <div className="min-h-screen bg-slate-50 flex relative overflow-hidden">
      {showAdminAlert && <HydrominesSecurityAlert onClose={() => setShowAdminAlert(false)} />}
      
      <ViewerTracker currentPage={currentPage} />
      
      <Sidebar 
        currentPage={currentPage} 
        setPage={(page) => {
          if ((page === 'MAGASINIER_IA' || page === 'AUDIT_INTELLIGENCE' || page === 'IA_CHECKLIST' || page === 'FORENSIC' || page === 'VISION_IA' || page === 'USER_MGMT') && !isAdmin) {
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
      />
      
      <main className="flex-grow p-8 transition-all duration-300 relative min-h-screen">
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

          {isSafeMode && isAdmin ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 mb-8 flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-red-500/15 text-red-600 rounded-lg animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-red-650 text-white rounded">
                    SUPERVISION : ALERTE CRITIQUE
                  </span>
                  <span className="text-xs text-red-700 font-extrabold uppercase tracking-wide">
                    MOTEUR DE COHÉRENCE
                  </span>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                    📌 DÉSYNCHRONISATION DES DONNÉES DÉTECTÉE
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-2 text-slate-700">
                    <div className="bg-red-500/5 p-3 rounded-lg border border-red-550/10">
                      <strong className="text-red-900 uppercase text-[10px] block mb-1">📊 IMPACT MÉTIER :</strong>
                      <p>Risque d'incohérence de stock temporaire sur l'enregistrement des nouveaux mouvements physiques.</p>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <strong className="text-slate-800 uppercase text-[10px] block mb-1">🔧 ACTION RECOMMANDÉE :</strong>
                      <p>Lancer une resynchronisation manuelle des données depuis le cockpit ou vérifier et rapprocher les derniers mouvements.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-red-500/10 pt-3 flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                  <span className="text-red-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                    Restauration active accessible
                  </span>
                  <div className="text-slate-500">
                    ⚙️ ÉTAT SYSTÈME — STATUT : <span className="font-bold text-red-700">CRITICAL</span> | CONFIANCE : <span className="font-bold text-red-700">{(rcglResult.confidenceScore * 100).toFixed(0)}%</span> | DÉRIVE : <span className="text-red-700 font-bold">{rcglResult.skewDescription || "Incohérence des stocks détectée"}</span>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-450 italic">
                  💡 Note de supervision terrain : Le cockpit d'analyse, la recherche et les fonctionnalités de re-lecture restent entièrement ouverts pour la continuité d'exploitation de la mine.
                </p>
              </div>
            </div>
          ) : rcglResult.mode !== 'NORMAL' ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-8 flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-amber-500/15 text-amber-600 rounded-lg">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500 text-slate-950 rounded">
                    SUPERVISION : MODE DÉGRADÉ
                  </span>
                  <span className="text-xs text-amber-700 font-extrabold uppercase tracking-wide">
                    LATENCE RÉSEAU COMMUNE
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                    📌 RETARD DE SYNCHRONISATION DU RÉSEAU
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-2 text-slate-700">
                    <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-550/10">
                      <strong className="text-amber-900 uppercase text-[10px] block mb-1">📊 IMPACT MÉTIER :</strong>
                      <p>Mise à jour d'inventaire différée sous communication intermittente.</p>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <strong className="text-slate-800 uppercase text-[10px] block mb-1">🔧 ACTION RECOMMANDÉE :</strong>
                      <p>Continuer la saisie normalement en mode de saisie locale, la réconciliation automatique s'effectuera de manière fluide dès rétablissement de la liaison.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-amber-500/10 pt-3 flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    Saisie locale résiliente active
                  </span>
                  <div className="text-slate-500">
                    ⚙️ ÉTAT SYSTÈME — STATUT : <span className="font-bold text-amber-700">DEGRADED</span> | CONFIANCE : <span className="font-bold text-amber-700">{(rcglResult.confidenceScore * 100).toFixed(0)}%</span> | LATENCE : <span className="text-amber-700 font-bold">{Math.round(rcglResult.freshnessGapMs / 1000)}s</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-450 italic">
                  💡 Note de supervision terrain : Vos actions d'inventaire et d'exploitation restent pleinement actives et seront préservées en local en attendant la liaison.
                </p>
              </div>
            </div>
          ) : null}

          <div className="max-w-[1600px] mx-auto">
            {renderPage()}
          </div>
        </Suspense>
      </main>

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
