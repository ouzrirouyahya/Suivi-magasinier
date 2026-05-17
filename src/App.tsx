/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, Page } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { StockTable } from './components/StockTable';
import { MouvementForm } from './components/MouvementForm';
import { MouvementHistory } from './components/MouvementHistory';
import { ArticleManagement } from './components/ArticleManagement';
import { ArticleDetail } from './components/ArticleDetail';
import { EpiTracking } from './components/EpiTracking';
import { TransfertPage } from './components/TransfertPage';
import { InventairePage } from './components/InventairePage';
import { AuditLogView } from './components/AuditLogView';
import { UserAdmin } from './components/UserAdmin';
import { StockAlertView } from './components/StockAlertView';
import { ReportPage } from './components/ReportPage';
import { RestockModule } from './components/RestockModule';
import { AIAnalytics } from './components/AIAnalytics';
import { AIChatExpert } from './components/AIChatExpert';
import LoginPage from './components/LoginPage';
import { useStorage } from './hooks/useStorage';
import { Article, SiteCode, PurchaseRequest } from './types';
import { Loader2, Search } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Toaster } from 'sonner';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('DASHBOARD');
  const [currentSite, setCurrentSite] = useState<SiteCode>('SMI');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  
  const { 
    articles, 
    mouvements, 
    distributions, 
    addMouvement, 
    addTransfert,
    completeTransfert,
    saveInventaire,
    saveArticle, 
    deleteArticle,
    auditLogs,
    accounts,
    toggleUser,
    isLoaded,
    transferts,
    inventaires,
    engins,
    perfos,
    agents,
    catalog,
    saveCatalogItem,
    deleteCatalogItem,
    setEngin,
    setPerfo,
    setAgent,
    purchaseRequests,
    addPurchaseRequest,
    updatePRStatus
  } = useStorage();

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

  const renderPage = () => {
    switch (currentPage) {
      case 'DASHBOARD':
        return <Dashboard site={currentSite} articles={articles} mouvements={mouvements} onAction={setCurrentPage} />;
      
      case 'STOCK_ENGINS':
        return (
          <StockTable 
            type="ENGINS" 
            site={currentSite} 
            articles={articles} 
            initialSearch={globalSearch}
            onAction={(id, action) => {
              setSelectedArticleId(id);
              setCurrentPage(action === 'IN' ? 'BON_ENTREE' : 'BON_SORTIE');
            }}
            onManageCatalog={() => setCurrentPage('GESTION_ARTICLES')}
          />
        );
      
      case 'STOCK_PERFORATEURS':
        return (
          <StockTable 
            type="PERFORATEURS" 
            site={currentSite} 
            articles={articles} 
            initialSearch={globalSearch}
            onAction={(id, action) => {
              setSelectedArticleId(id);
              setCurrentPage(action === 'IN' ? 'BON_ENTREE' : 'BON_SORTIE');
            }}
            onManageCatalog={() => setCurrentPage('GESTION_ARTICLES')}
          />
        );
      
      case 'STOCK_CONSOMMABLES':
        return (
          <StockTable 
            type="CONSOMMABLES" 
            site={currentSite} 
            articles={articles} 
            initialSearch={globalSearch}
            onAction={(id, action) => {
              setSelectedArticleId(id);
              setCurrentPage(action === 'IN' ? 'BON_ENTREE' : 'BON_SORTIE');
            }}
            onManageCatalog={() => setCurrentPage('GESTION_ARTICLES')}
          />
        );
      
      case 'STOCK_EPI':
        return <EpiTracking site={currentSite} articles={articles} distributions={distributions} />;
      
      case 'BON_ENTREE':
        return (
          <MouvementForm 
            type="ENTREE" 
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
              setCurrentPage('HISTORIQUE');
            }} 
          />
        );
      
      case 'BON_SORTIE':
        return (
          <MouvementForm 
            type="SORTIE" 
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
              setCurrentPage('HISTORIQUE');
            }} 
          />
        );
      
      case 'TRANSFERT':
        return (
          <TransfertPage 
            currentSite={currentSite}
            articles={articles}
            transferts={transferts}
            onAddTransfert={addTransfert}
            onCompleteTransfert={completeTransfert}
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

      case 'HISTORIQUE':
        return <MouvementHistory site={currentSite} mouvements={mouvements} articles={articles} />;
      
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

      case 'AUDIT_LOG':
        return <AuditLogView logs={auditLogs} />;

      case 'ALERTES_STOCK':
        return (
          <StockAlertView 
            articles={articles} 
            currentSite={currentSite}
            onAction={(id, action) => {
              setSelectedArticleId(id);
              setCurrentPage(action === 'IN' ? 'BON_ENTREE' : 'BON_SORTIE');
            }}
          />
        );

      case 'USER_MGMT':
        return (
          <UserAdmin 
            accounts={accounts} 
            onToggleStatus={toggleUser} 
            engins={engins}
            onSetEngin={setEngin}
            perfos={perfos}
            onSetPerfo={setPerfo}
            agents={agents}
            onSetAgent={setAgent}
          />
        );

      case 'REPORTS':
        return <ReportPage />;
        
      case 'RESTOCK_MGMT':
        return (
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
        );

      case 'AI_ANALYTICS':
        return <AIAnalytics site={currentSite} articles={articles} mouvements={mouvements} />;

      case 'AI_CHAT_EXPERT':
        return <AIChatExpert site={currentSite} articles={articles} />;

      case 'SEARCH_RESULTS':
        return (
          <StockTable 
            type="ALL"
            site={currentSite}
            articles={articles}
            initialSearch={globalSearch}
            onAction={(id, action) => {
              setSelectedArticleId(id);
              setCurrentPage(action === 'IN' ? 'BON_ENTREE' : 'BON_SORTIE');
            }}
            onManageCatalog={() => setCurrentPage('GESTION_ARTICLES')}
          />
        );
        
      default:
        return <Dashboard site={currentSite} articles={articles} mouvements={mouvements} onAction={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex relative overflow-hidden">
      <Sidebar 
        currentPage={currentPage} 
        setPage={setCurrentPage} 
        currentSite={currentSite}
        setSite={setCurrentSite}
        user={user}
        onSignOut={handleSignOut}
      />
      
      <main className="flex-grow p-8 transition-all duration-300 relative min-h-screen">
        {/* Global Toolbar */}
        <div className="max-w-[1600px] mx-auto mb-3 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white/40 backdrop-blur-3xl p-1.5 rounded-xl border border-white shadow-xl shadow-slate-200/30">
            <div className="relative flex-1 group">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                 <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                 <div className="h-3 w-[1px] bg-slate-200" />
               </div>
               <input 
                 type="text" 
                 placeholder="Recherche Rapide..."
                 className="w-full bg-white/80 h-10 pl-14 pr-8 rounded-xl text-sm font-bold outline-none border border-slate-100 focus:border-sky-200 transition-all focus:ring-4 focus:ring-sky-500/5 placeholder:text-slate-300"
                 value={globalSearch}
                 onChange={(e) => {
                   setGlobalSearch(e.target.value);
                   if (e.target.value.length >= 2) {
                     if (currentPage !== 'SEARCH_RESULTS') {
                        setCurrentPage('SEARCH_RESULTS');
                     }
                   }
                 }}
               />
            </div>
            
            <div className="flex items-center gap-2 px-1">
               <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block" />
               <div className="flex flex-col items-end">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none opacity-70">Valeur Stock</p>
                 <p className="text-sm font-black text-slate-900 mt-0.5">
                   {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(
                     articles.filter(a => a.site === currentSite).reduce((sum, a) => sum + (a.quantity * a.price), 0)
                   )}
                 </p>
               </div>
               <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-black text-xs shadow-inner">
                 {articles.filter(a => a.site === currentSite).length}
               </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto">
          {renderPage()}
        </div>
      </main>

      {selectedArticle && (
        <ArticleDetail 
          article={selectedArticle} 
          mouvements={mouvements} 
          onClose={() => setSelectedArticle(null)} 
        />
      )}
      <Toaster position="top-right" expand={true} richColors closeButton />
    </div>
  );
}

