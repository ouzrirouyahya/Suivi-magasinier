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
import LoginPage from './components/LoginPage';
import { useStorage } from './hooks/useStorage';
import { Article, SiteCode } from './types';
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
    setEngins,
    setPerfos,
    setAgents,
    setCatalog
  } = useStorage();

  useEffect(() => {
    console.log('App: Setting up auth listener');
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('App: Auth state changed', currentUser?.email);
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
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Initialisation Sécurité...</p>
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
          <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initialisation Hydromines Suivi...</p>
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
            setCatalog={setCatalog}
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
            setEngins={setEngins}
            perfos={perfos}
            setPerfos={setPerfos}
            agents={agents}
            setAgents={setAgents}
          />
        );

      case 'REPORTS':
        return <ReportPage />;
        
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
      
      <main className="flex-1 ml-80 p-8 transition-all duration-300 relative min-h-screen">
        {/* Global Toolbar */}
        <div className="max-w-7xl mx-auto mb-8 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-3xl p-4 rounded-[2rem] border border-white shadow-2xl shadow-slate-200/50">
            <div className="relative flex-1 group">
               <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                 <Search className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
                 <div className="h-4 w-[1px] bg-slate-200" />
               </div>
               <input 
                 type="text" 
                 placeholder="Recherche Rapide (Réf, Désignation, ID Document...)"
                 className="w-full bg-white/80 h-14 pl-16 pr-8 rounded-2xl text-xs font-bold outline-none border border-slate-100 focus:border-sky-200 transition-all focus:ring-4 focus:ring-sky-500/5 placeholder:text-slate-300 placeholder:italic"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     // Simple jump to Search results or list
                     console.log("Search trigger");
                   }
                 }}
               />
               <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:block">
                  <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded-md tracking-widest border border-slate-200/50">⌘ K</span>
               </div>
            </div>
            
            <div className="flex items-center gap-3 px-2">
               <div className="h-10 w-[1px] bg-slate-200 mx-2 hidden md:block" />
               <div className="flex flex-col items-end">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Valeur {currentSite}</p>
                 <p className="text-sm font-black text-slate-900 mt-1">
                   {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(
                     articles.filter(a => a.site === currentSite).reduce((sum, a) => sum + (a.quantity * a.price), 0)
                   )}
                 </p>
               </div>
               <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-xs shadow-inner">
                 {articles.filter(a => a.site === currentSite).length}
               </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
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

