import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  History,
  Archive,
  ArrowRightLeft,
  Calendar,
  Filter,
  PackageCheck,
  Database,
  Truck,
  Drill,
  Droplets
} from 'lucide-react';
import { Article, SiteCode, Inventaire } from '../types';
import { cn, generateId, formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

interface InventairePageProps {
  currentSite: SiteCode;
  articles: Article[];
  inventaires: Inventaire[];
  onSaveInventaire: (i: Inventaire) => void;
  isAdmin?: boolean;
}

export function InventairePage({ currentSite, articles, inventaires, onSaveInventaire, isAdmin = false }: InventairePageProps) {
  const [activeSession, setActiveSession] = useState<Inventaire | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const siteArticles = articles.filter(a => a.site === currentSite && a.active);
  
  const filteredArticles = siteArticles.filter(a => {
    const matchesSearch = a.designation.toLowerCase().includes(search.toLowerCase()) || a.ref.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || a.type === filterType;
    return matchesSearch && matchesType;
  });

  const startInventory = (type: 'TOURNANT' | 'ANNUEL', category?: string) => {
    const listToAudit = category && category !== 'ALL' 
      ? siteArticles.filter(a => a.type === category)
      : siteArticles;

    const session: Inventaire = {
      id: generateId(),
      site: currentSite,
      date: new Date().toISOString(),
      type,
      status: 'OUVERT',
      items: listToAudit.map(a => ({
        articleId: a.id,
        theoricQuantity: a.quantity,
        countedQuantity: a.quantity, // Default to theoretical
        difference: 0
      }))
    };
    setActiveSession(session);
  };

  const updateCount = (articleId: string, count: number) => {
    if (!activeSession) return;
    setActiveSession({
      ...activeSession,
      items: activeSession.items.map(i => {
        if (i.articleId === articleId) {
          const validCount = isNaN(count) ? 0 : count;
          return {
            ...i,
            countedQuantity: validCount,
            difference: validCount - (i.theoricQuantity || 0)
          };
        }
        return i;
      })
    });
  };

  const updateJustification = (articleId: string, justification: string) => {
    if (!activeSession) return;
    setActiveSession({
      ...activeSession,
      items: activeSession.items.map(i => i.articleId === articleId ? { ...i, justification } : i)
    });
  };

  const handleValidate = () => {
    if (!activeSession) return;
    if (confirm('Voulez-vous valider cet inventaire ? Les stocks seront mis à jour définitivement.')) {
      onSaveInventaire({ ...activeSession, status: 'VALIDE' });
      setActiveSession(null);
    }
  };

  const handleSaveDraft = () => {
    if (!activeSession) return;
    onSaveInventaire({ ...activeSession });
    setActiveSession(null);
    toast.success('Inventaire sauvegardé en brouillon.');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24 mission-control-bg p-12 flex-1">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Contrôle Inventaire</h2>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-3 opacity-70">
            Audit du Stock Réel vs Système d'Information
          </p>
        </div>
        {!activeSession && (
          <div className="flex flex-wrap gap-6 justify-end items-center">
            <div className="flex bg-white p-3 rounded-2xl border border-slate-100 shadow-sm gap-3">
              {[
                { id: 'ENGINS', label: 'Engins', icon: Truck },
                { id: 'PERFORATEURS', label: 'Perforateurs', icon: Drill },
                { id: 'CONSOMMABLES', label: 'Conso', icon: Droplets },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => startInventory('TOURNANT', t.id)}
                  className="px-6 py-3 hover:bg-sky-50 text-sky-700 rounded-[1.25rem] transition-all flex items-center gap-4 group"
                >
                  <t.icon className="w-8 h-8 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-black uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => startInventory('ANNUEL')}
              className="btn btn-primary h-16 px-12 rounded-2xl gap-4 shadow-xl text-lg uppercase tracking-widest font-black"
            >
              <Archive className="w-7 h-7" /> Annuel
            </button>
          </div>
        )}
      </header>

      {activeSession ? (
        <div className="space-y-8">
          <div className="card glass p-10 sticky top-4 z-40 bg-white/95 backdrop-blur-2xl border-sky-100 flex flex-col xl:flex-row items-center justify-between gap-10 shadow-2xl shadow-sky-950/5">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 rounded-[2.5rem] bg-sky-600 text-white flex items-center justify-center shadow-2xl shadow-sky-600/30">
                <PackageCheck className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none text-slate-950">Session en cours</h3>
                <div className="flex items-center gap-6 mt-3">
                   <span className="text-xs font-black px-4 py-1.5 bg-sky-100 text-sky-700 rounded-xl uppercase tracking-widest">{activeSession.type}</span>
                   <span className="text-base font-bold text-slate-500 flex items-center gap-2.5"><Calendar className="w-5 h-5 text-sky-400" /> {new Date(activeSession.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-xl w-full relative group">
              <div className="absolute inset-0 bg-sky-500/5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-lg" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 relative z-10" />
              <input 
                type="text" 
                placeholder="RECHERCHER OU SCANNER UNE RÉFÉRENCE..."
                className="input-field h-10 pl-11 text-xs bg-white relative z-10 border-slate-200 focus:border-sky-500 font-black tracking-tight rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-2 shrink-0">
               <button onClick={handleSaveDraft} className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 h-10 rounded-xl text-[10px] tracking-widest font-black uppercase transition-all shadow-sm" title="Enregistrer le brouillon de comptage">Saisie Comptage (Suspendre)</button>
               {isAdmin ? (
                 <button onClick={handleValidate} className="btn btn-primary px-8 h-10 rounded-xl text-[10px] tracking-widest font-black uppercase shadow-xl shadow-sky-500/20">Valider & Ajuster le Stock [Admin]</button>
               ) : (
                 <button disabled className="btn bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 px-8 h-10 rounded-xl text-[10px] tracking-widest font-black uppercase" title="La validation finale et l'ajustement de stocks sont réservés aux administrateurs">Validation Réservée Admin</button>
               )}
            </div>
          </div>

          <div className="card glass overflow-hidden border-slate-100 shadow-xl">
            <div className="table-container border-0 rounded-none overflow-visible">
              <table className="data-table">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="py-4 pl-6 text-xs font-black uppercase tracking-widest text-slate-400">Référence & Désignation</th>
                    <th className="py-4 text-center w-24 text-xs font-black uppercase tracking-widest text-slate-400">Théorique</th>
                    <th className="py-4 text-center w-32 text-xs font-black uppercase tracking-widest text-slate-400">Compté Réel</th>
                    <th className="py-4 text-center w-24 text-xs font-black uppercase tracking-widest text-slate-400">Écart</th>
                    <th className="py-4 pr-6 text-xs font-black uppercase tracking-widest text-slate-400">Observations / Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Grouped Table Rows */}
                  {Array.from(new Set(filteredArticles.map(a => a.functionalCategory || a.category || 'SANS CATÉGORIE'))).map(catName => (
                    <React.Fragment key={catName}>
                      <tr className="bg-slate-50/80">
                        <td colSpan={5} className="px-6 py-4">
                           <div className="flex items-center gap-4">
                              <Database className="w-5 h-5 text-sky-600" />
                              <span className="text-sm font-black text-slate-900 uppercase tracking-widest">{catName}</span>
                              <div className="h-px bg-slate-200 flex-1"></div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">{filteredArticles.filter(a => (a.functionalCategory || a.category || 'SANS CATÉGORIE') === catName).length} Articles</span>
                           </div>
                        </td>
                      </tr>
                      {filteredArticles
                        .filter(a => (a.functionalCategory || a.category || 'SANS CATÉGORIE') === catName)
                        .map(article => {
                          const sessionItem = activeSession.items.find(i => i.articleId === article.id);
                          if (!sessionItem) return null;
                          const hasError = sessionItem.difference !== 0;

                          return (
                            <tr key={article.id} className={cn("transition-all duration-300 group", hasError ? "bg-amber-50/40" : "hover:bg-slate-50/70")}>
                               <td className="px-6 py-4 border-l-4 border-transparent group-hover:border-sky-500 transition-all">
                                 <p className="font-black text-slate-900 text-sm leading-tight mb-1">{article.designation}</p>
                                 <div className="flex items-center gap-3">
                                   <p className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">{article.ref}</p>
                                   <span className="w-1 h-3 bg-slate-200 rounded-full" />
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <Filter className="w-3.5 h-3.5" /> {article.location || 'BUREAU'}
                                   </p>
                                 </div>
                                 {article.component && (
                                   <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-1.5 opacity-70">{article.component}</p>
                                 )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                 <div className="flex flex-col items-center">
                                   <span className="px-3 py-1.5 bg-slate-100 rounded-lg font-mono font-black text-slate-600 text-sm border border-slate-50 shadow-sm min-w-[60px]">
                                     {isNaN(sessionItem.theoricQuantity) ? 0 : sessionItem.theoricQuantity}
                                   </span>
                                 </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                 <input 
                                    type="number"
                                    className={cn(
                                      "w-20 h-10 rounded-lg font-black text-sm text-center outline-none transition-all shadow-sm",
                                      hasError ? "bg-white text-rose-600 ring-2 ring-rose-500" : "bg-white border border-slate-200 text-slate-900 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                                    )}
                                    value={isNaN(sessionItem.countedQuantity) ? '' : sessionItem.countedQuantity}
                                    onChange={(e) => updateCount(article.id, Number(e.target.value))}
                                 />
                              </td>
                              <td className="px-4 py-4 text-center">
                                 <div className="flex flex-col items-center gap-1">
                                   <span className={cn(
                                     "text-xs font-black flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg",
                                     (sessionItem.difference || 0) > 0 ? "text-emerald-700 bg-emerald-50" : (sessionItem.difference || 0) < 0 ? "text-rose-700 bg-rose-50" : "text-slate-400"
                                   )}>
                                     {(sessionItem.difference || 0) > 0 ? '+' : ''}{isNaN(sessionItem.difference) ? 0 : sessionItem.difference}
                                   </span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 pr-6">
                                 <div className="relative group/input">
                                   <input 
                                      type="text"
                                      placeholder="Notez l'origine de l'écart ici..."
                                      className="w-full bg-white border-b-2 border-slate-100 py-2 text-sm font-bold text-slate-600 focus:border-sky-400 outline-none transition-all group-hover/input:border-slate-300 placeholder:opacity-50"
                                      value={sessionItem.justification || ''}
                                      onChange={(e) => updateJustification(article.id, e.target.value)}
                                   />
                                   <ArrowRightLeft className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-hover/input:text-sky-300 transition-colors" />
                                 </div>
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="card glass p-12 flex flex-col items-center justify-center text-center space-y-10 bg-white/40 shadow-xl border-slate-100">
             <div className="w-28 h-28 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 shadow-inner">
                <FileText className="w-14 h-14" />
             </div>
             <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-950">Historique des Inventaires</h3>
                <p className="text-base font-bold text-slate-400 mt-3 uppercase tracking-widest leading-relaxed">Consultez les audits passés et les ajustements de stock sur {currentSite}</p>
             </div>
             <div className="w-full space-y-4 pt-6">
                {inventaires.filter(i => i.site === currentSite).map(inv => (
                  <div key={inv.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:border-sky-400 hover:shadow-xl transition-all duration-300 cursor-pointer">
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500 group-hover:bg-sky-600 group-hover:text-white transition-all">
                          <ClipboardCheck className="w-7 h-7" />
                       </div>
                       <div className="text-left">
                         <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{inv.type} — {new Date(inv.date).toLocaleDateString()}</p>
                         <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                           <span className={cn(
                             "w-2 h-2 rounded-full ring-2 ring-white",
                             inv.status === 'VALIDE' ? "bg-emerald-500" : "bg-amber-500"
                           )} />
                           {inv.status}
                         </p>
                       </div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
                  </div>
                ))}
                {inventaires.filter(i => i.site === currentSite).length === 0 && (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <History className="w-12 h-12 text-slate-100" />
                    <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Aucun historique archivé</p>
                  </div>
                )}
             </div>
           </div>

           <div className="space-y-10">
              <div className="card glass p-12 bg-slate-950 text-white border-slate-800 shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 blur-[100px] -mr-32 -mt-32 group-hover:bg-sky-500/20 transition-all duration-700" />
                 <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 flex items-center gap-4 relative z-10">
                   <AlertCircle className="w-8 h-8 text-sky-400" /> Rappel Audit Stock
                 </h3>
                 <p className="text-slate-300 text-base font-medium leading-relaxed relative z-10">
                   Un inventaire tournant doit être effectué chaque semaine pour les articles à forte valeur stratégique. 
                   <br/><br/>
                   L'inventaire annuel est obligatoire avant toute clôture comptable pour garantir l'intégrité du bilan de {currentSite}.
                 </p>
                 <div className="mt-10 flex items-center gap-6 p-6 bg-white/5 rounded-[2rem] border border-white/10 relative z-10 hover:bg-white/10 transition-colors">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                       <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300 mb-1">Alerte de Retard</p>
                      <p className="text-sm font-black text-white uppercase tracking-widest">24 articles non audités depuis +30j</p>
                    </div>
                 </div>
              </div>

              <div className="card glass p-12 bg-white/70 backdrop-blur-3xl shadow-xl border-slate-100">
                 <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 flex items-center gap-4">
                   <ArrowRightLeft className="w-8 h-8 text-sky-600" /> Indicateur de Précision
                 </h3>
                 <div className="space-y-8">
                    <div className="flex justify-between items-end">
                       <div className="space-y-1">
                         <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Taux de fiabilité réel</p>
                         <p className="text-5xl font-black text-slate-950 tracking-tighter">98.4<span className="text-sky-600 text-3xl">%</span></p>
                       </div>
                       <span className="text-emerald-500 font-black text-sm flex items-center gap-1 mb-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">+0.5% (Mois)</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner ring-4 ring-slate-50">
                       <div className="h-full bg-sky-500 w-[98.4%] relative">
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                       </div>
                    </div>
                    <div className="pt-4 flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Objectif KPI : 99.5%
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function FileText(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14.5 2 14.5 7.5 20 7.5" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M10 9h4" />
    </svg>
  );
}
