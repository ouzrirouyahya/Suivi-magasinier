import React, { useState } from 'react';
import { Search, Download, Calendar, ArrowDownLeft, ArrowUpRight, Clock, HardDrive, User, Printer, Eye, X, BookOpen, LayoutGrid, RotateCcw } from 'lucide-react';
import { Mouvement, Article, SiteCode } from '../types';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import hydrominesLogo from '../assets/images/hydromines_logo.png';

interface MouvementHistoryProps {
  site: SiteCode;
  mouvements: Mouvement[];
  articles: Article[];
}

export const MouvementHistory = React.memo(function MouvementHistory({ site, mouvements, articles }: MouvementHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ENTREE' | 'SORTIE' | 'RETOUR' | 'TRANSFERT_IN' | 'TRANSFERT_OUT'>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedMouvement, setSelectedMouvement] = useState<Mouvement | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [showMoreActive, setShowMoreActive] = useState(false);

  const itemsPerPage = 15;

  const handleFilterTypeChange = (type: 'ALL' | 'ENTREE' | 'SORTIE' | 'RETOUR' | 'TRANSFERT_IN' | 'TRANSFERT_OUT') => {
    setTypeFilter(type);
    setCurrentPage(1);
    setShowMoreActive(false);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
    setShowMoreActive(false);
  };

  const handleDateStartChange = (val: string) => {
    setDateStart(val);
    setCurrentPage(1);
    setShowMoreActive(false);
  };

  const handleDateEndChange = (val: string) => {
    setDateEnd(val);
    setCurrentPage(1);
    setShowMoreActive(false);
  };

  const filteredMouvements = mouvements.filter(m => {
    const matchesSite = site === 'ALL' ? true : m.site === site;
    const sTerm = searchTerm.toLowerCase();
    
    const safeContains = (field: any) => {
      if (typeof field !== 'string') return false;
      return field.toLowerCase().includes(sTerm);
    };

    const matchesItems = m.items?.some(it => {
      const art = articles.find(a => a.id === it.articleId);
      if (!art) return false;
      return (art.designation || '').toLowerCase().includes(sTerm) || 
             (art.ref || '').toLowerCase().includes(sTerm);
    }) || false;

    const matchesSearch = !searchTerm || 
                          (m.id && m.id.toLowerCase().includes(sTerm)) || 
                          safeContains(m.vendeur) ||
                          safeContains(m.demandeur) ||
                          safeContains(m.beneficiaire) ||
                          safeContains(m.reference) ||
                          matchesItems;
    
    const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
    
    const mDate = m.date ? new Date(m.date as any).getTime() : 0;
    const validMDate = isNaN(mDate) ? 0 : mDate;
    const matchesStart = !dateStart || validMDate >= new Date(dateStart).getTime();
    const matchesEnd = !dateEnd || validMDate <= new Date(dateEnd).getTime();
    
    return matchesSite && matchesSearch && matchesType && matchesStart && matchesEnd;
  }).sort((a, b) => {
    const timeA = a.date ? new Date(a.date as any).getTime() : 0;
    const timeB = b.date ? new Date(b.date as any).getTime() : 0;
    const validA = isNaN(timeA) ? 0 : timeA;
    const validB = isNaN(timeB) ? 0 : timeB;
    return validB - validA;
  });

  const exportCSV = () => {
    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const s = String(val).replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${s}"`;
    };

    const headers = [
      'ID Document', 
      'Date', 
      'Type Flux', 
      'Référence Doc', 
      'Statut', 
      'Vendeur/Fournisseur',
      'Demandeur/Affectation',
      'Bénéficiaire Final',
      'Détail Articles (Désignation [Qté])', 
      'Service Affecté', 
      'Equipement (Engin/Perfo)', 
      'Personnel (Méc/Foreur)',
      'Motif/Justification',
      'Saisie Par'
    ];

    const rows = filteredMouvements.map(m => [
      escape(m.id),
      escape(new Date(m.date as any).toLocaleString('fr-FR')),
      escape(m.type),
      escape(m.reference || ''),
      escape(m.status || 'VALIDE'),
      escape(m.vendeur || ''),
      escape(m.demandeur || ''),
      escape(m.beneficiaire || ''),
      escape(m.items.map(item => {
        const article = articles.find(a => a.id === item.articleId);
        return `${article?.designation || 'Art. Inconnu'} (${item.quantity})`;
      }).join(' | ')),
      escape(m.service || ''),
      escape(m.engin || m.perforateur || ''),
      escape(m.mecanicien || m.foreur || ''),
      escape(m.motif || m.notes || ''),
      escape(m.createdBy || 'Admin')
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
    
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

  const MOUVEMENT_TITLES: Record<string, string> = {
    ENTREE: "Bon de Réceptions — Entrée Stock",
    SORTIE: "Bon de Sortie Stock",
    RETOUR: "Bon de Retour Chantier",
    TRANSFERT_OUT: "Bon de Transfert Inter-Sites — Expédition",
    TRANSFERT_IN: "Bon de Transfert Inter-Sites — Réception",
  };

  const getSignatureLabels = (type: string) => {
    switch (type) {
      case 'ENTREE':
        return ["Magasinier Réceptionnaire", "Fournisseur", "Responsable Site"];
      case 'SORTIE':
        return ["Magasinier", "Bénéficiaire", "Chef de Service"];
      case 'RETOUR':
        return ["Magasinier", "Retourneur", "Responsable Site"];
      case 'TRANSFERT_OUT':
        return ["Magasinier Expéditeur", "Transporteur", "Responsable Site"];
      case 'TRANSFERT_IN':
        return ["Magasinier Réceptionnaire", "Livreur", "Responsable Site"];
      default:
        return ["Magasinier", "Bénéficiaire", "Direction Site"];
    }
  };

  // Pagination lists
  const totalPages = Math.ceil(filteredMouvements.length / itemsPerPage);
  const currentPageMouvements = filteredMouvements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const displayedMouvements = showMoreActive ? currentPageMouvements : currentPageMouvements.slice(0, 10);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Sub-Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <img src={hydrominesLogo} alt="Hydromines" className="w-10 h-10 object-contain" />
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" />
              Registre Historique des Flux
            </h3>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">
              Archives des bons de réception, de sortie, et de transferts inter-sites
            </p>
          </div>
        </div>
        <button 
          onClick={exportCSV} 
          className="btn bg-slate-950 text-white hover:bg-sky-600 shadow-xl shadow-slate-900/5 h-10 px-4 rounded-xl transition-all active:scale-95 group font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> 
          Exporter Data (.CSV)
        </button>
      </div>

      {/* Advanced Filters Section */}
      <div className="card-clean p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print shadow-sm border-slate-200/50">
        <div className="space-y-2 lg:col-span-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtre Rapide</label>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 relative z-10" />
            <input 
              type="text" 
              placeholder="Id, Tiers, Note de mouvement..." 
              className="w-full bg-slate-50 h-10 pl-10 pr-4 rounded-xl text-xs outline-none border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-bold tracking-tight relative z-10"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 lg:col-span-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de Flux</label>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 overflow-x-auto no-scrollbar gap-1">
            {([
              { type: 'ALL', label: 'Tous', colorClass: 'bg-slate-950 text-white shadow-sm ring-1 ring-slate-950' },
              { type: 'ENTREE', label: 'Entrée', colorClass: 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700' },
              { type: 'SORTIE', label: 'Sortie', colorClass: 'bg-rose-700 text-white shadow-sm ring-1 ring-rose-800' },
              { type: 'RETOUR', label: 'Retours', colorClass: 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-750' },
              { type: 'TRANSFERT_IN', label: 'Recu', colorClass: 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-600' },
              { type: 'TRANSFERT_OUT', label: 'Exped.', colorClass: 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-700' }
            ] as const).map(({ type, label, colorClass }) => (
              <button
                key={type}
                onClick={() => handleFilterTypeChange(type)}
                className={cn(
                  "flex-1 min-w-[50px] py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all text-center",
                  typeFilter === type 
                    ? colorClass
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Du</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              className="w-full bg-slate-50 h-10 pl-10 pr-4 rounded-xl text-xs outline-none border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 font-bold relative"
              value={dateStart}
              onChange={(e) => handleDateStartChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Au</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              className="w-full bg-slate-50 h-10 pl-10 pr-4 rounded-xl text-xs outline-none border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 font-bold relative"
              value={dateEnd}
              onChange={(e) => handleDateEndChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Registry Table */}
      <div className="table-container no-print border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-sm">
        <table className="data-table w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th className="px-6 py-3.5 text-left">Date & ID</th>
              <th className="px-6 py-3.5 text-left">Flux</th>
              <th className="px-6 py-3.5 text-left">Intervenant / Tiers</th>
              <th className="px-6 py-3.5 text-left">Aperçu Items</th>
              <th className="px-6 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedMouvements.length > 0 ? (
              displayedMouvements.map(m => (
                <tr key={m.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-black text-slate-950 text-xs tracking-tight leading-none mb-1">{formatDate(m.date as any).split(' ')[0]}</p>
                    <p className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                       <HardDrive className="w-3 h-3 text-slate-300" /> {m.id.substring(0, 12)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        m.type === 'RETOUR' 
                          ? "bg-teal-50 text-teal-700 border border-teal-100/60" 
                          : (m.type === 'ENTREE' || m.type === 'TRANSFERT_IN' ? "bg-emerald-500 text-white shadow-sm" : "bg-rose-800 text-white shadow-sm")
                      )}>
                        {m.type === 'RETOUR' ? <RotateCcw className="w-5 h-5 text-teal-700" /> : (m.type === 'ENTREE' || m.type === 'TRANSFERT_IN' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />)}
                      </div>
                      <div className="flex flex-col">
                        <p className="font-black text-slate-900 text-xs tracking-wider uppercase">
                          {m.type === 'RETOUR' ? "Retour Chantier" : m.type === 'TRANSFERT_IN' ? "Transfert Recu" : m.type === 'TRANSFERT_OUT' ? "Transfert Exp." : m.type}
                        </p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{m.status || 'VALIDE'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-950 text-xs uppercase tracking-tight mb-1">
                      {m.beneficiaire || m.vendeur || m.demandeur || '---'}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {m.beneficiaire && (m.demandeur || m.vendeur) && (
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Origine: {m.vendeur || m.demandeur}</p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase tracking-widest mr-2">
                          <LayoutGrid className="w-3 h-3 text-slate-300" />
                          <span>{m.service || 'AUTRE'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold">
                          <span className="text-[8px] uppercase tracking-wider font-black text-slate-400">Saisie:</span>
                          <span className="font-mono bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded text-[8px] font-black truncate max-w-[100px]" title={m.createdBy || 'Admin'}>
                            {m.createdBy ? m.createdBy.split('@')[0] : 'Admin'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-sm">
                      {m.items.slice(0, 3).map((item) => (
                        <span key={item.articleId} className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-tight">
                          {articles.find(a => a.id === item.articleId)?.designation || 'Art.'} <span className={cn("ml-1 font-black", (m.type === 'ENTREE' || m.type === 'TRANSFERT_IN' || m.type === 'RETOUR') ? "text-emerald-500" : "text-rose-500")}>{(m.type === 'ENTREE' || m.type === 'TRANSFERT_IN' || m.type === 'RETOUR') ? '+' : '-'}{item.quantity}</span>
                        </span>
                      ))}
                      {m.items.length > 3 && (
                        <span className="px-2 py-1 bg-sky-50 text-sky-600 rounded-lg text-[9px] font-black uppercase">
                          +{m.items.length - 3} PLUS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                       <button 
                         onClick={() => setSelectedMouvement(m)}
                         className="w-9 h-9 flex items-center justify-center bg-white border border-slate-150 text-slate-400 hover:text-sky-600 hover:border-sky-200 hover:shadow-lg rounded-xl transition-all group/btn"
                         title="Visualiser et Imprimer"
                       >
                         <Eye className="w-5 h-5 group-hover/btn:scale-105 transition-transform" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-35">
                    <BookOpen className="w-12 h-12 text-slate-300" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Aucun mouvement archivé sur ce site</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Dynamic Afficher Plus block inside the table card */}
        {currentPageMouvements.length > 10 && !showMoreActive && (
          <div className="flex justify-center py-4 bg-slate-50/50 border-t border-slate-100">
            <button 
              onClick={() => setShowMoreActive(true)}
              className="btn bg-white hover:bg-slate-100 border border-slate-200 text-sky-600 hover:text-sky-700 font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest shadow-sm transition-all focus:ring-4 focus:ring-sky-500/5 hover:-translate-y-0.5"
            >
              Afficher Plus (+{currentPageMouvements.length - 10} restants sur la page)
            </button>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-2 no-print">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {currentPage} sur {totalPages} ({filteredMouvements.length} mouvements)
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(currentPage - 1);
                  setShowMoreActive(false);
                }
              }}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-all cursor-pointer"
            >
              Précédent
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => {
                  setCurrentPage(pageNum);
                  setShowMoreActive(false);
                }}
                className={cn(
                  "w-7 h-7 rounded-lg text-[9px] font-black transition-all flex items-center justify-center border",
                  currentPage === pageNum 
                    ? "bg-slate-900 border-slate-950 text-white shadow-sm"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
                )}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => {
                if (currentPage < totalPages) {
                  setCurrentPage(currentPage + 1);
                  setShowMoreActive(false);
                }
              }}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-all cursor-pointer"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
                {/* Printable Area / High Polish Detail Modal */}
      {selectedMouvement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm no-print animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[2rem] shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Action buttons on top of modal */}
            <div className="absolute top-6 right-6 flex items-center gap-2 z-15">
              <button 
                onClick={() => setSelectedMouvement(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors bg-white/80 backdrop-blur-md shadow-sm border border-slate-200 cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            <div id="printable-area" className="p-12 md:p-16 text-slate-900 bg-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 border-b-4 border-slate-950 pb-10">
                <div className="flex items-center gap-6">
                  {/* Doubled the logo size from h-16 to h-32 to be perfectly visible */}
                  <img src={hydrominesLogo} alt="Logo" className="h-32 w-auto object-contain" />
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-950 leading-none">HYDROMINES</h1>
                    <p className="text-[11px] font-black text-slate-400 tracking-[0.25em] uppercase mt-2">Exploitation Minière & Logistique</p>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-slate-900 text-white px-4 py-1.5 rounded-lg inline-block mb-3 shadow-sm">
                    {MOUVEMENT_TITLES[selectedMouvement.type] || "Bon de Mouvement"}
                  </span>
                  <p className="text-slate-500 font-mono text-sm leading-none mt-1">Émis le : {formatDate(selectedMouvement.date as any)}</p>
                  <p className="text-slate-805 font-black text-xs uppercase mt-2.5">ID : <span className="font-mono text-slate-500 tracking-tight">{selectedMouvement.id}</span></p>
                  {selectedMouvement.reference && (
                    <p className="text-sky-650 font-black text-sm uppercase mt-1">Réf : {selectedMouvement.reference}</p>
                  )}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 bg-slate-50/50 border border-slate-150 p-6 rounded-2xl">
                {/* Section 1: Tiers & Bénéficiaire */}
                <div className="space-y-3.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">Tiers & Entités</p>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Bénéficiaire / Demandeur</p>
                    <p className="text-base font-black text-slate-900 uppercase leading-tight">{selectedMouvement.beneficiaire || selectedMouvement.demandeur || '---'}</p>
                  </div>
                  {selectedMouvement.vendeur && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Fournisseur / Origine</p>
                      <p className="text-sm font-black text-slate-700 uppercase leading-tight">{selectedMouvement.vendeur}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Service Habilité</p>
                    <span className="text-[10px] font-black text-sky-600 uppercase bg-sky-50 px-2.5 py-1 rounded border border-sky-100 inline-block font-mono">
                      {selectedMouvement.service || 'MAGASIN GENERAL'}
                    </span>
                  </div>
                </div>

                {/* Section 2: Machine & Personnel */}
                <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-slate-155 md:pl-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">Chantier / Affectation</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Engin / Machine</p>
                      <p className="text-sm font-black text-slate-900 uppercase leading-none">{selectedMouvement.engin || selectedMouvement.perforateur || '---'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Opérateur / Méc.</p>
                      <p className="text-sm font-black text-slate-900 uppercase leading-none">{selectedMouvement.mecanicien || selectedMouvement.foreur || '---'}</p>
                    </div>
                  </div>
                  {selectedMouvement.notes && (
                    <div className="space-y-1 pt-1.5 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Spécifications / Note</p>
                      <p className="text-xs text-slate-650 italic leading-snug">{selectedMouvement.notes}</p>
                    </div>
                  )}
                </div>

                {/* Section 3: Agent Logistique Responsable */}
                <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-slate-155 md:pl-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">Opérateur Système / Saisie</p>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Saisie enregistrée par</p>
                      <p className="text-sm font-black text-slate-950 uppercase leading-tight font-sans">
                        {selectedMouvement.createdBy ? selectedMouvement.createdBy.split('@')[0] : 'Magasinier Registré'}
                      </p>
                    </div>
                    {selectedMouvement.createdBy && (
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Adresse E-mail</p>
                        <p className="text-xs font-mono font-bold text-slate-600 truncate max-w-[210px]">{selectedMouvement.createdBy}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Site de l'Opération</p>
                      <span className="text-[10px] font-black text-slate-800 uppercase bg-slate-100 px-2.5 py-0.5 rounded-md inline-block">
                        {selectedMouvement.site}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table of articles */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-12">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-4 px-6 text-left">Désignation de l'Article</th>
                      <th className="py-4 px-6 text-center">Quantité</th>
                      <th className="py-4 px-6 text-right">Prix Unitaire (HT)</th>
                      <th className="py-4 px-6 text-right">Montant Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {selectedMouvement.items.map((item) => {
                      const article = articles.find(a => a.id === item.articleId);
                      return (
                        <tr key={item.articleId} className="text-xs text-slate-800">
                          <td className="py-4 px-6 font-bold">
                            <span className="text-slate-950 block font-extrabold">{article?.designation || 'Article Inconnu'}</span>
                            <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">{article?.ref || 'N/A'}</span>
                          </td>
                          <td className="py-4 px-6 text-center font-black text-slate-950 text-sm">
                            {item.quantity}
                          </td>
                          <td className="py-4 px-6 text-right font-semibold text-slate-600">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="py-4 px-6 text-right font-black text-slate-950 text-sm">
                            {formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/80 border-t border-slate-200 text-sm font-black">
                      <td colSpan={3} className="py-5 px-6 text-right uppercase text-xs text-slate-450 tracking-wider">Total Général (HT) :</td>
                      <td className="py-5 px-6 text-right text-base text-slate-950 font-black">
                        {formatCurrency(selectedMouvement.items.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.price) || 0)), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures Area */}
              <div className="grid grid-cols-3 gap-8 mt-16 text-center">
                <div className="border-t-2 border-slate-200 pt-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-16">
                    {getSignatureLabels(selectedMouvement.type)[0]}
                  </p>
                  <p className="text-[10px] text-slate-300 italic font-medium">Signature & cachet</p>
                </div>
                <div className="border-t-2 border-slate-200 pt-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-16">
                    {getSignatureLabels(selectedMouvement.type)[1]}
                  </p>
                  <p className="text-[10px] text-slate-300 italic font-medium">Signature & cachet</p>
                </div>
                <div className="border-t-2 border-slate-200 pt-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-16">
                    {getSignatureLabels(selectedMouvement.type)[2]}
                  </p>
                  <p className="text-[10px] text-slate-300 italic font-medium">Signature d'approbation</p>
                </div>
              </div>

              {/* Print layout actions */}
              <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center no-print">
                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
                  <span>Imprimé le :</span>
                  <span>{new Date().toLocaleString('fr-FR')}</span>
                </div>
                <button 
                  onClick={() => window.print()} 
                  className="btn bg-slate-950 text-white hover:bg-sky-600 transition-all hover:shadow-xl hover:shadow-sky-500/10 h-11 px-6 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimer le document
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
});
