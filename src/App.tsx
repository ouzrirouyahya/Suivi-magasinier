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
const FieldOperatorWorkspace = lazy(() => import('./components/FieldOperatorWorkspace'));

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
    deleteArticle, setEngin, setPerfo, setAgent, saveCatalogItem, 
    deleteCatalogItem, addPurchaseRequest, updatePRStatus,
    isSafeMode, rcglResult,
    maintenanceMode, maintenanceReason
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

  const isAdmin = accounts.find(a => a.email === user?.email)?.role === 'ADMIN';

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

      case 'AI_CHAT_EXPERT':
        if (!isAdmin) {
          setShowAdminAlert(true);
          setCurrentPage('COCKPIT');
          return null;
        }
        return <AIChatExpert site={currentSite} articles={articles} mouvements={mouvements} agents={agents} />;

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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <ForensicDashboard />
          </motion.div>
        );

      case 'INTELLIGENCE':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <IndustrialIntelligenceDashboard />
          </motion.div>
        );

      case 'ALERTES_STOCK':
        return <StockAlertView site={currentSite} articles={articles} onAction={navigateToMouvement} />;
        
      default:
        return <Dashboard site={currentSite} articles={articles} mouvements={mouvements} onAction={setCurrentPage} isAdmin={isAdmin} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex relative overflow-hidden">
      {showAdminAlert && <HydrominesSecurityAlert onClose={() => setShowAdminAlert(false)} />}
      
      <Sidebar 
        currentPage={currentPage} 
        setPage={(page) => {
          if ((page === 'AI_CHAT_EXPERT' || page === 'IA_CHECKLIST' || page === 'FORENSIC') && !isAdmin) {
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

          {isSafeMode ? (
            <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-5 mb-8 flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-red-500/20 text-red-600 rounded-lg animate-bounce">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-red-600 text-white rounded flex items-center gap-1">
                    <Lock className="w-3 h-3" /> VERROU DE SÉCURITÉ MAXIMUM (PCV v2.0)
                  </span>
                  <span className="text-xs text-red-700 font-extrabold uppercase tracking-wide">
                    INCOHÉRENCE CRITIQUE DES DONNÉES DÉTECTÉE
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">OPÉRATIONS BLOQUÉES — ALIGNEMENT INCORRECT DU STOCK</h3>
                <p className="text-xs text-slate-600">
                  Le validateur de cohérence d'état business (BSV) a interrompu préventivement les écritures car l'intégrité ou l'alignement référentiel de votre snapshot local est compromis. Raison : <span className="text-red-800 font-mono font-bold">{rcglResult.skewDescription || "Erreur de synchronisation inter-collections relative aux mouvements."}</span>.
                </p>
                <div className="flex items-center gap-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest pt-3">
                  <div className="flex items-center gap-1.5 text-red-600 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    Alerte Résolution Active...
                  </div>
                  <div className="text-slate-500 font-bold">
                    Score de Confiance : {(rcglResult.confidenceScore * 100).toFixed(1)}% | Dérive : {Math.round(rcglResult.freshnessGapMs / 1000)}s
                  </div>
                </div>
              </div>
            </div>
          ) : rcglResult.mode !== 'NORMAL' ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-8 flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-amber-500/15 text-amber-600 rounded-lg">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500 text-slate-900 rounded">
                    DEGRADED DATA MODE
                  </span>
                  <span className="text-xs text-amber-700 font-extrabold uppercase tracking-wide">
                    CONTINUITÉ OPÉRATIONNELLE ESTIMÉE SÛRE
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">DÉRIVE RÉSEAU PASSIVE — ÉCRITURES RETENUES PAR LE VALIDATEUR INVARIANT</h3>
                <p className="text-xs text-slate-600">
                  La connexion au serveur est ralentie ou instable, mais l'intégrité logique des stocks est préservée. Le mode <span className="font-bold text-amber-700">"Soft Read"</span> est activé : vous pouvez continuer à travailler. Vos modifications seront validées en temps réel par notre moteur de règles invariant (BSV) avant transmission au serveur Firestore.
                </p>
                <div className="flex items-center gap-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest pt-3">
                  <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Fonctionnement autonome opérationnel sous conditions
                  </div>
                  <div className="text-slate-500 font-bold">
                    Confiance : {(rcglResult.confidenceScore * 100).toFixed(1)}% | Latence : {Math.round(rcglResult.freshnessGapMs / 1000)}s
                  </div>
                </div>
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
