import React, { useState } from 'react';
import { Search, Download, Calendar, ArrowDownLeft, ArrowUpRight, Clock, HardDrive, User, Printer, Eye, X, BookOpen, LayoutGrid } from 'lucide-react';
import { Mouvement, Article, SiteCode } from '../types';
import { cn, formatDate, formatCurrency } from '../lib/utils';

interface MouvementHistoryProps {
  site: SiteCode;
  mouvements: Mouvement[];
  articles: Article[];
}

export function MouvementHistory({ site, mouvements, articles }: MouvementHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ENTREE' | 'SORTIE' | 'TRANSFERT_IN' | 'TRANSFERT_OUT'>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedMouvement, setSelectedMouvement] = useState<Mouvement | null>(null);

  const filteredMouvements = mouvements.filter(m => {
    const matchesSite = m.site === site;
    const matchesSearch = m.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.vendeur?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (m.demandeur?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (m.reference?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
    
    const mDate = new Date(m.date).getTime();
    const matchesStart = !dateStart || mDate >= new Date(dateStart).getTime();
    const matchesEnd = !dateEnd || mDate <= new Date(dateEnd).getTime();
    
    return matchesSite && matchesSearch && matchesType && matchesStart && matchesEnd;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const exportCSV = () => {
    // Helper to escape CSV values correctly (handling commas and quotes)
    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const s = String(val).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };

    const headers = [
      'ID Document', 
      'Date', 
      'Type Flux', 
      'Référence Doc', 
      'Statut', 
      'Tiers (Vendeur/Demandeur)', 
      'Détail Articles (Désignation [Qté])', 
      'Service Affecté', 
      'Equipement (Engin/Perfo)', 
      'Personnel (Méc/Foreur)',
      'Motif/Justification'
    ];

    const rows = filteredMouvements.map(m => [
      escape(m.id),
      escape(new Date(m.date).toLocaleString('fr-FR')),
      escape(m.type),
      escape(m.reference || ''),
      escape(m.status || 'VALIDE'),
      escape(m.vendeur || m.demandeur || ''),
      escape(m.items.map(item => {
        const article = articles.find(a => a.id === item.articleId);
        return `${article?.designation || 'Art. Inconnu'} (${item.quantity})`;
      }).join(' | ')),
      escape(m.service || ''),
      escape(m.engin || m.perforateur || ''),
      escape(m.mecanicien || m.foreur || ''),
      escape(m.motif || m.notes || '')
    ]);

    // Use BOM \uFEFF for better Excel compatibility with UTF-8
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `archives_mouvements_${site}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-slate-950 flex items-center gap-4 tracking-tighter uppercase leading-none">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center">
              <Clock className="w-8 h-8 text-sky-500" />
            </div>
            Archives Stock
          </h2>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-4 opacity-70">Registre officiel immuable des flux du site {site}</p>
        </div>
        <button onClick={exportCSV} className="btn bg-slate-950 text-white hover:bg-sky-600 shadow-sm self-start md:self-auto h-10 px-4 rounded-xl transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
          <Download className="w-6 h-6 group-hover:-translate-y-1 transition-transform" /> Exporter Data (.CSV)
        </button>
      </header>

      <div className="card glass p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 no-print shadow-2xl border-slate-100/50">
        <div className="space-y-3 lg:col-span-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Filtre Rapide</label>
          <div className="relative group">
            <div className="absolute inset-0 bg-sky-500/5 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 relative z-10" />
            <input 
              type="text" 
              placeholder="Id, Tiers, Note..." 
              className="w-full bg-white h-14 pl-14 pr-6 rounded-2xl text-xl outline-none border-2 border-slate-100 focus:border-sky-400 transition-all font-black tracking-tight relative z-10 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Type de Flux</label>
          <div className="flex bg-slate-100 p-2 rounded-2xl border-2 border-slate-50 overflow-x-auto no-scrollbar">
            {(['ALL', 'ENTREE', 'SORTIE', 'TRANSFERT_IN', 'TRANSFERT_OUT'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "flex-1 min-w-[70px] py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  typeFilter === type ? "bg-white text-sky-600 shadow-lg shadow-sky-500/10" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {type === 'ALL' ? 'Tous' : 
                 type === 'ENTREE' ? 'Entrées' : 
                 type === 'SORTIE' ? 'Sorties' :
                 type === 'TRANSFERT_IN' ? 'Recu' : 'Exped.'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Du</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" />
            <input 
              type="date" 
              className="w-full bg-white h-14 pl-14 pr-6 rounded-2xl text-xl outline-none border-2 border-slate-100 focus:border-sky-400 font-black relative"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Au</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" />
            <input 
              type="date" 
              className="w-full bg-white h-14 pl-14 pr-6 rounded-2xl text-xl outline-none border-2 border-slate-100 focus:border-sky-400 font-black relative"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-container glass overflow-hidden border-0 shadow-2xl rounded-[2.5rem] no-print">
        <table className="data-table w-full">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-6 text-base font-black uppercase tracking-[0.2em] text-slate-400">Date & ID</th>
              <th className="px-8 py-6 text-base font-black uppercase tracking-[0.2em] text-slate-400">Flux</th>
              <th className="px-8 py-6 text-base font-black uppercase tracking-[0.2em] text-slate-400">Intervenant / Tiers</th>
              <th className="px-8 py-6 text-base font-black uppercase tracking-[0.2em] text-slate-400">Aperçu Items</th>
              <th className="px-8 py-6 text-base font-black uppercase tracking-[0.2em] text-slate-400 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMouvements.length > 0 ? (
              filteredMouvements.map(m => (
                <tr key={m.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                  <td className="px-8 py-10 whitespace-nowrap">
                    <p className="font-black text-slate-950 text-2xl tracking-tighter leading-none mb-1">{formatDate(m.date).split(' ')[0]}</p>
                    <p className="text-sm font-mono font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                       <HardDrive className="w-3.5 h-3.5" /> {m.id.substring(0, 12)}
                    </p>
                  </td>
                  <td className="px-8 py-10">
                    <div className="flex items-center gap-4">
                       <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                        m.type === 'ENTREE' ? "bg-emerald-500 text-white" : "bg-rose-800 text-white"
                      )}>
                        {m.type === 'ENTREE' ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
                      </div>
                      <div className="flex flex-col">
                        <p className="font-black text-slate-900 text-base tracking-widest uppercase">{m.type}</p>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-0.5">{m.status || 'VALIDE'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-10">
                    <p className="font-black text-slate-950 text-xl uppercase tracking-tight mb-1">{m.vendeur || m.demandeur}</p>
                    <div className="flex items-center gap-2">
                       <LayoutGrid className="w-3.5 h-3.5 text-slate-300" />
                       <p className="text-sm text-slate-400 font-black uppercase tracking-widest">{m.service || 'AUTRE'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-10">
                    <div className="flex flex-wrap gap-2 max-w-sm">
                      {m.items.slice(0, 3).map((item) => (
                        <span key={item.articleId} className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-500 uppercase tracking-tight">
                          {articles.find(a => a.id === item.articleId)?.designation || 'Art.'} <span className="text-sky-500 ml-1">x{item.quantity}</span>
                        </span>
                      ))}
                      {m.items.length > 3 && (
                        <span className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-xl text-xs font-black uppercase">
                          +{m.items.length - 3} PLUS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-10 text-center">
                    <div className="flex items-center justify-center">
                       <button 
                         onClick={() => setSelectedMouvement(m)}
                         className="w-14 h-14 flex items-center justify-center bg-white border border-slate-100 shadow-sm text-slate-400 hover:text-sky-600 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-500/10 rounded-2xl transition-all group/btn"
                         title="Visualiser et Imprimer"
                       >
                         <Eye className="w-7 h-7 group-hover/btn:scale-110 transition-transform" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-8 py-32 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-20">
                    <BookOpen className="w-20 h-20 text-slate-200" />
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-sm">Aucun mouvement archivé sur ce site</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Print View Modal */}
      {selectedMouvement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm no-print">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedMouvement(null)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
            
            <div id="printable-area" className="p-16">
              <div className="flex justify-between items-start mb-12 border-b-8 border-slate-900 pb-10">
                <div>
                  <h1 className="text-2xl font-black tracking-tighter mb-2 uppercase">HYDROMINES SUIVI MAGASINIER</h1>
                  <p className="text-lg font-bold text-slate-500 uppercase tracking-[0.3em]">Official Logistics Document</p>
                  <div className="mt-6 flex items-center gap-6">
                    <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-base font-black uppercase tracking-widest">{site}</div>
                    <div className="text-base font-bold text-slate-400 uppercase tracking-widest">Document ID: {selectedMouvement.id}</div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-4xl font-black uppercase tracking-tighter mb-3">
                    {selectedMouvement.type === 'ENTREE' ? "Bon d'Entrée Stock" : "Bon de Sortie Stock"}
                  </h2>
                  <p className="text-slate-500 font-mono text-xl">{formatDate(selectedMouvement.date)}</p>
                  <p className="text-sky-600 font-black text-lg uppercase mt-3">Réf: {selectedMouvement.reference || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-16 mb-16">
                <div className="space-y-6 text-lg">
                  <h3 className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Destinataire / Tiers</h3>
                  <p className="text-3xl font-black text-slate-900 uppercase">{selectedMouvement.vendeur || selectedMouvement.demandeur}</p>
                  <p className="font-black text-xl text-sky-600">SERVICE: {selectedMouvement.service || 'MAGASIN'}</p>
                </div>
                <div className="space-y-6 text-lg">
                  <h3 className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Équipement & Responsable</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-slate-400 font-black text-sm uppercase">Machine</p>
                      <p className="text-slate-900 font-black text-2xl">{selectedMouvement.engin || selectedMouvement.perforateur || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black text-sm uppercase">Personnel</p>
                      <p className="text-slate-900 font-black text-2xl">{selectedMouvement.mecanicien || selectedMouvement.foreur || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <table className="w-full mb-16">
                <thead>
                  <tr className="border-b-4 border-slate-900 text-sm font-black uppercase tracking-widest text-slate-400">
                    <th className="py-6 text-left">Article</th>
                    <th className="py-6 text-center">Qté</th>
                    <th className="py-6 text-right">P.U</th>
                    <th className="py-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100">
                  {selectedMouvement.items.map((item) => {
                    const article = articles.find(a => a.id === item.articleId);
                    return (
                      <tr key={item.articleId} className="text-xl">
                        <td className="py-6 font-bold">{article?.designation} <br/><span className="text-sm font-mono text-slate-400">{article?.ref}</span></td>
                        <td className="py-6 text-center font-black">{item.quantity}</td>
                        <td className="py-6 text-right">{formatCurrency(item.price)}</td>
                        <td className="py-6 text-right font-black">{formatCurrency(item.quantity * item.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-8 border-slate-900 text-3xl font-black">
                    <td colSpan={3} className="py-10 text-right uppercase text-xl">Total HT</td>
                    <td className="py-10 text-right">{formatCurrency(selectedMouvement.items.reduce((sum, i) => sum + (i.quantity * i.price), 0))}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-3 gap-12 mt-24 text-center">
                <div className="border-t-2 border-slate-200 pt-6"><p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-20">Magasinier</p></div>
                <div className="border-t-2 border-slate-200 pt-6"><p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-20">Bénéficiaire</p></div>
                <div className="border-t-2 border-slate-200 pt-6"><p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-20">Direction Site</p></div>
              </div>

              <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between no-print">
                <p className="text-base text-slate-300 font-bold italic">Généré le {new Date().toLocaleString()}</p>
                <button onClick={() => window.print()} className="btn btn-primary h-14 px-10 rounded-2xl flex items-center gap-3 text-lg font-black uppercase">
                  <Printer className="w-6 h-6" /> Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; background: white; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
}
