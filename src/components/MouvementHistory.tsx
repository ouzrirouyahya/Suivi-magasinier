import React, { useState } from 'react';
import { Search, Download, Calendar, ArrowDownLeft, ArrowUpRight, Clock, HardDrive, User, Printer, Eye, X, BookOpen } from 'lucide-react';
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-950 flex items-center gap-3 lowercase">
            <Clock className="w-8 h-8 text-sky-500" /> Archives <span className="text-slate-300 font-medium">/ Mouvements</span>
          </h2>
          <p className="text-slate-500 font-medium mt-1">Registre officiel immuable du site {site}</p>
        </div>
        <button onClick={exportCSV} className="btn bg-white border-2 border-slate-100 hover:border-sky-500 hover:text-sky-600 shadow-xl self-start md:self-auto h-14 px-8 rounded-2xl transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-3">
          <Download className="w-4 h-4 group-hover:-translate-y-1 transition-transform" /> Exporter Data
        </button>
      </header>

      <div className="card glass p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print ring-1 ring-slate-900/5">
        <div className="space-y-2 lg:col-span-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtre Rapide</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300" />
            <input 
              type="text" 
              placeholder="Id, Tiers, Note..." 
              className="input-field pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de Flux</label>
          <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
            {(['ALL', 'ENTREE', 'SORTIE', 'TRANSFERT_IN', 'TRANSFERT_OUT'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "flex-1 min-w-[70px] py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all",
                  typeFilter === type ? "bg-white text-sky-600 shadow-sm ring-1 ring-slate-900/5" : "text-slate-400 hover:text-slate-600"
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

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Période du</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="date" 
              className="input-field pl-12"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">au</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="date" 
              className="input-field pl-12"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-container glass overflow-hidden border-0 shadow-2xl ring-1 ring-slate-900/5 no-print">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="px-8 py-6">Date & ID</th>
              <th className="px-8 py-6">Flux</th>
              <th className="px-8 py-6">Tiers</th>
              <th className="px-8 py-6">Items</th>
              <th className="px-8 py-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMouvements.length > 0 ? (
              filteredMouvements.map(m => (
                <tr key={m.id} className="group hover:bg-white/40 transition-all">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <p className="font-black text-slate-900">{formatDate(m.date).split(' ')[0]}</p>
                    <p className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest">{m.id.substring(0, 12)}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                       <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg",
                        m.type === 'ENTREE' ? "bg-emerald-500 text-white" : "bg-rose-800 text-white"
                      )}>
                        {m.type === 'ENTREE' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <p className="font-black text-slate-900 text-xs">{m.type}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-extrabold text-slate-800 uppercase text-xs">{m.vendeur || m.demandeur}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{m.service || 'AUTRE'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1">
                      {m.items.slice(0, 2).map((item, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-[9px] font-black text-slate-500">
                          {articles.find(a => a.id === item.articleId)?.designation || 'Art.'} (x{item.quantity})
                        </span>
                      ))}
                      {m.items.length > 2 && <span className="text-[9px] font-black text-slate-300">+{m.items.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <button 
                         onClick={() => setSelectedMouvement(m)}
                         className="p-3 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-2xl transition-all"
                         title="Visualiser et Imprimer"
                       >
                         <Eye className="w-5 h-5" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-8 py-32 text-center text-slate-300 font-bold uppercase tracking-widest opacity-20">Aucun historique</td>
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
            
            <div id="printable-area" className="p-12">
              <div className="flex justify-between items-start mb-12 border-b-4 border-slate-900 pb-8">
                <div>
                  <h1 className="text-base font-black tracking-tighter mb-1 uppercase">HYDROMINES SUIVI MAGASINIER</h1>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em]">Official Logistics Document</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest">{site}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document ID: {selectedMouvement.id}</div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">
                    {selectedMouvement.type === 'ENTREE' ? "Bon d'Entrée Stock" : "Bon de Sortie Stock"}
                  </h2>
                  <p className="text-slate-500 font-mono text-sm">{formatDate(selectedMouvement.date)}</p>
                  <p className="text-sky-600 font-black text-xs uppercase mt-2">Réf: {selectedMouvement.reference || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="space-y-4 text-xs">
                  <h3 className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Destinataire / Tiers</h3>
                  <p className="text-xl font-black text-slate-900 uppercase">{selectedMouvement.vendeur || selectedMouvement.demandeur}</p>
                  <p className="font-bold text-sky-600">SERVICE: {selectedMouvement.service || 'MAGASIN'}</p>
                </div>
                <div className="space-y-4 text-xs">
                  <h3 className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Équipement & Responsable</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 font-black text-[9px] uppercase">Machine</p>
                      <p className="text-slate-900 font-black">{selectedMouvement.engin || selectedMouvement.perforateur || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black text-[9px] uppercase">Personnel</p>
                      <p className="text-slate-900 font-black">{selectedMouvement.mecanicien || selectedMouvement.foreur || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <table className="w-full mb-12">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-4 text-left">Article</th>
                    <th className="py-4 text-center">Qté</th>
                    <th className="py-4 text-right">P.U</th>
                    <th className="py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedMouvement.items.map((item, idx) => {
                    const article = articles.find(a => a.id === item.articleId);
                    return (
                      <tr key={idx} className="text-sm">
                        <td className="py-4 font-bold">{article?.designation} <br/><span className="text-[10px] font-mono text-slate-400">{article?.ref}</span></td>
                        <td className="py-4 text-center font-black">{item.quantity}</td>
                        <td className="py-4 text-right">{formatCurrency(item.price)}</td>
                        <td className="py-4 text-right font-black">{formatCurrency(item.quantity * item.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-4 border-slate-900 text-xl font-black">
                    <td colSpan={3} className="py-6 text-right uppercase text-xs">Total HT</td>
                    <td className="py-6 text-right">{formatCurrency(selectedMouvement.items.reduce((sum, i) => sum + (i.quantity * i.price), 0))}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-3 gap-8 mt-24 text-center">
                <div className="border-t border-slate-200 pt-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-12">Magasinier</p></div>
                <div className="border-t border-slate-200 pt-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-12">Bénéficiaire</p></div>
                <div className="border-t border-slate-200 pt-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-12">Direction Site</p></div>
              </div>

              <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between no-print">
                <p className="text-[9px] text-slate-300 font-bold italic">Généré le {new Date().toLocaleString()}</p>
                <button onClick={() => window.print()} className="btn btn-primary h-12 px-8 rounded-2xl flex items-center gap-2 text-xs">
                  <Printer className="w-4 h-4" /> Imprimer
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
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; surface: bg-white; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
}
