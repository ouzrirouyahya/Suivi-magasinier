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
import { cn, generateId } from '../lib/utils';

interface InventairePageProps {
  currentSite: SiteCode;
  articles: Article[];
  inventaires: Inventaire[];
  onSaveInventaire: (i: Inventaire) => void;
}

export function InventairePage({ currentSite, articles, inventaires, onSaveInventaire }: InventairePageProps) {
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
    alert('Inventaire sauvegardé en brouillon.');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20 mission-control-bg min-h-screen p-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tighter uppercase leading-none">Contrôle Inventaire</h2>
          <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest italic flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-sky-500" /> Audit du Stock Réel vs Système
          </p>
        </div>
        {!activeSession && (
          <div className="flex flex-wrap gap-4 justify-end">
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-2">
              {[
                { id: 'ENGINS', label: 'Engins', icon: Truck },
                { id: 'PERFORATEURS', label: 'Foreuses', icon: Drill },
                { id: 'CONSOMMABLES', label: 'Conso', icon: Droplets },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => startInventory('TOURNANT', t.id)}
                  className="px-4 py-2 hover:bg-sky-50 text-sky-700 rounded-xl transition-all flex items-center gap-2 group"
                >
                  <t.icon className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => startInventory('ANNUEL')}
              className="btn btn-primary h-14 px-8 rounded-2xl gap-2 shadow-sky-200"
            >
              <Archive className="w-5 h-5" /> Grand Inventaire Annuel
            </button>
          </div>
        )}
      </header>

      {activeSession ? (
        <div className="space-y-8">
          <div className="card glass p-8 sticky top-8 z-40 bg-white/90 backdrop-blur-xl border-sky-100 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-3xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-200">
                <PackageCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter leading-none">Session en cours</h3>
                <div className="flex items-center gap-4 mt-2">
                   <span className="text-[10px] font-black px-2 py-0.5 bg-sky-100 text-sky-700 rounded-lg uppercase tracking-widest">{activeSession.type}</span>
                   <span className="text-xs font-bold text-slate-400 flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> {new Date(activeSession.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-md w-full relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text" 
                placeholder="Scanner une référence ou filtrer..."
                className="input-field pl-12 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-4 shrink-0">
               <button onClick={handleSaveDraft} className="btn btn-secondary px-8 h-12 rounded-xl text-[10px] tracking-widest">Suspendre (Brouillon)</button>
               <button onClick={handleValidate} className="btn btn-primary px-10 h-12 rounded-xl text-[10px] tracking-widest shadow-sky-200">Valider l'Inventaire</button>
            </div>
          </div>

          <div className="card glass overflow-hidden">
            <div className="table-container border-0 rounded-none overflow-visible">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Référence & Désignation</th>
                    <th className="text-center w-32">Théorique</th>
                    <th className="text-center w-40">Compté Réel</th>
                    <th className="text-center w-32">Écart</th>
                    <th>Observations / Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Grouped Table Rows */}
                  {Array.from(new Set(filteredArticles.map(a => a.functionalCategory || a.category || 'SANS CATÉGORIE'))).map(catName => (
                    <React.Fragment key={catName}>
                      <tr className="bg-slate-50 shadow-inner">
                        <td colSpan={5} className="px-8 py-3">
                           <div className="flex items-center gap-3">
                              <Database className="w-4 h-4 text-sky-600" />
                              <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{catName}</span>
                              <div className="h-px bg-slate-200 flex-1"></div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredArticles.filter(a => (a.functionalCategory || a.category || 'SANS CATÉGORIE') === catName).length} Articles</span>
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
                            <tr key={article.id} className={cn("transition-colors group", hasError ? "bg-amber-50/30" : "hover:bg-slate-50/50")}>
                              <td className="px-8 py-6 pl-12 border-l-4 border-transparent group-hover:border-sky-400 transition-all">
                                 <p className="font-black text-slate-900 leading-none">{article.designation}</p>
                                 <p className="text-[10px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-widest">{article.ref} • {article.location || 'NON LOCALISÉ'}</p>
                                 {article.component && (
                                   <p className="text-[9px] font-black text-sky-500 uppercase tracking-tighter mt-1">{article.component} {article.subComponent ? `/ ${article.subComponent}` : ''}</p>
                                 )}
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <span className="px-3 py-1 bg-slate-100 rounded-lg font-mono font-black text-slate-600 text-sm">
                                   {isNaN(sessionItem.theoricQuantity) ? 0 : sessionItem.theoricQuantity}
                                 </span>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <input 
                                    type="number"
                                    className={cn(
                                      "w-24 px-4 py-2 rounded-xl font-black text-lg text-center outline-none transition-all",
                                      hasError ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400" : "bg-slate-100 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                                    )}
                                    value={isNaN(sessionItem.countedQuantity) ? '' : sessionItem.countedQuantity}
                                    onChange={(e) => updateCount(article.id, Number(e.target.value))}
                                 />
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <span className={cn(
                                   "text-sm font-black flex items-center justify-center gap-1.5",
                                   (sessionItem.difference || 0) > 0 ? "text-emerald-600" : (sessionItem.difference || 0) < 0 ? "text-rose-600" : "text-slate-400"
                                 )}>
                                   {(sessionItem.difference || 0) > 0 ? '+' : ''}{isNaN(sessionItem.difference) ? 0 : sessionItem.difference}
                                   {hasError && <AlertCircle className="w-3.5 h-3.5" />}
                                 </span>
                              </td>
                              <td className="px-8 py-6">
                                 <input 
                                    type="text"
                                    placeholder="Raison de l'écart..."
                                    className="w-full bg-transparent border-b border-slate-200 py-1 text-xs font-semibold focus:border-sky-500 outline-none"
                                    value={sessionItem.justification || ''}
                                    onChange={(e) => updateJustification(article.id, e.target.value)}
                                 />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="card glass p-8 flex flex-col items-center justify-center text-center space-y-6 bg-white/40">
             <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                <FileText className="w-10 h-10" />
             </div>
             <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Historique des Inventaires</h3>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Consultez les audits passés et les ajustements de stock</p>
             </div>
             <div className="w-full space-y-3">
                {inventaires.filter(i => i.site === currentSite).map(inv => (
                  <div key={inv.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-sky-200 transition-all">
                    <div className="flex items-center gap-3">
                       <ClipboardCheck className="w-5 h-5 text-sky-500" />
                       <div className="text-left">
                         <p className="text-xs font-black text-slate-900 uppercase">{inv.type} — {new Date(inv.date).toLocaleDateString()}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{inv.status}</p>
                       </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
                {inventaires.length === 0 && <p className="py-10 text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucun historique disponible</p>}
             </div>
           </div>

           <div className="space-y-6">
              <div className="card glass p-8 bg-sky-950 text-white border-sky-800 shadow-2xl shadow-sky-900/20">
                 <h3 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-3">
                   <Filter className="w-5 h-5" /> Rappel Médecine Stock
                 </h3>
                 <p className="text-slate-300 text-xs font-medium leading-relaxed">
                   Un inventaire tournant doit être effectué chaque semaine pour les articles à forte valeur (Pareto A). 
                   L'inventaire annuel est obligatoire avant la clôture de l'exercice fiscal.
                 </p>
                 <div className="mt-6 flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <AlertCircle className="w-6 h-6 text-sky-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-200">24 articles n'ont pas été comptés depuis +30 jours</p>
                 </div>
              </div>

              <div className="card glass p-8 bg-white/40">
                 <h3 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-3">
                   <ArrowRightLeft className="w-5 h-5 text-sky-600" /> Flux de Réglage
                 </h3>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-slate-500">Précision Stock Actuelle</span>
                       <span className="font-black text-sky-600">98.4%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-sky-500 w-[98.4%]"></div>
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
