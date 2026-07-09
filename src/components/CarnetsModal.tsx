import React, { useState, useMemo } from 'react';
import { X, ArrowLeft, ArrowRight, Printer, Package, Drill, Wrench, Calendar, ClipboardList, AlertTriangle } from 'lucide-react';
import { SiteCode, Mouvement, Article, EnginMaster, PerfoMaster } from '../types';
import { cn } from '../lib/utils';
import { useInventory } from '../context/InventoryContext';

interface CarnetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: SiteCode;
  articles: Article[];
}

export function CarnetsModal({ isOpen, onClose, site, articles }: CarnetsModalProps) {
  const { mouvements, engins, perfos } = useInventory();
  
  const [currentTab, setCurrentTab] = useState<'PERFORATEURS' | 'ENGINS'>('PERFORATEURS');
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'CE_MOIS' | 'CE_TRIMESTRE' | 'CETTE_ANNEE' | 'TOUT'>('CE_MOIS');

  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  // Filter list of machines for the active site
  const sitePerfos = useMemo(() => perfos.filter(p => p.site === site), [perfos, site]);
  const siteEngins = useMemo(() => engins.filter(e => e.site === site), [engins, site]);

  // Map machine codes to their movements count for month KPI on cards
  const perfosWithQty = useMemo(() => {
    return sitePerfos.map(p => {
      const perfoMovementsThisMonth = mouvements.filter(m => {
        if (m.type !== 'SORTIE' || m.site !== site || m.perforateur !== p.code) return false;
        try {
          const rawDate = m.date;
          const dateStr = (typeof rawDate === 'string') 
            ? rawDate 
            : (rawDate && typeof rawDate.toDate === 'function') 
              ? rawDate.toDate().toISOString() 
              : new Date(rawDate).toISOString();
          return dateStr.slice(0, 7) === currentMonthStr;
        } catch {
          return false;
        }
      });
      const monthQty = perfoMovementsThisMonth.reduce((sum, m) => 
        sum + m.items.reduce((acc, it) => acc + (it.quantity || 0), 0), 0
      );
      return { ...p, monthQty };
    });
  }, [sitePerfos, mouvements, site, currentMonthStr]);

  const enginsWithQty = useMemo(() => {
    return siteEngins.map(e => {
      const enginMovementsThisMonth = mouvements.filter(m => {
        if (m.type !== 'SORTIE' || m.site !== site || m.engin !== e.code) return false;
        try {
          const rawDate = m.date;
          const dateStr = (typeof rawDate === 'string') 
            ? rawDate 
            : (rawDate && typeof rawDate.toDate === 'function') 
              ? rawDate.toDate().toISOString() 
              : new Date(rawDate).toISOString();
          return dateStr.slice(0, 7) === currentMonthStr;
        } catch {
          return false;
        }
      });
      const monthQty = enginMovementsThisMonth.reduce((sum, m) => 
        sum + m.items.reduce((acc, it) => acc + (it.quantity || 0), 0), 0
      );
      return { ...e, monthQty };
    });
  }, [siteEngins, mouvements, site, currentMonthStr]);

  // Retrieve Date helper
  const getMovementDate = (dateVal: any): Date => {
    if (!dateVal) return new Date(0);
    if (typeof dateVal === 'string') return new Date(dateVal);
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    return new Date(dateVal);
  };

  const formatDateSafe = (dateVal: any): string => {
    const d = getMovementDate(dateVal);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Extract all movements for the selected machine
  const allMachineMovements = useMemo(() => {
    if (!selectedMachine) return [];
    return mouvements.filter(m => 
      m.type === 'SORTIE' && 
      m.site === site && 
      (currentTab === 'PERFORATEURS' ? m.perforateur === selectedMachine : m.engin === selectedMachine)
    );
  }, [selectedMachine, mouvements, site, currentTab]);

  // Compute 3 top-level KPIs for selected machine based on unfiltered outcomes
  const kpis = useMemo(() => {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();

    // 1. Month sorties (sum of quantities)
    const mMovements = allMachineMovements.filter(m => {
      const d = getMovementDate(m.date);
      return d.getFullYear() === currYear && d.getMonth() === currMonth;
    });
    const monthQty = mMovements.reduce((sum, m) => 
      sum + m.items.reduce((acc, it) => acc + (it.quantity || 0), 0), 0
    );

    // 2. Year sorties (sum of quantities)
    const yMovements = allMachineMovements.filter(m => {
      const d = getMovementDate(m.date);
      return d.getFullYear() === currYear;
    });
    const yearQty = yMovements.reduce((sum, m) => 
      sum + m.items.reduce((acc, it) => acc + (it.quantity || 0), 0), 0
    );

    // 3. Last checkout date
    const sorted = [...allMachineMovements].sort((a, b) => 
      getMovementDate(b.date).getTime() - getMovementDate(a.date).getTime()
    );
    const lastDate = sorted.length > 0 ? formatDateSafe(sorted[0].date) : 'AUCUNE';

    return { monthQty, yearQty, lastDate };
  }, [allMachineMovements]);

  // Period filtered movements list
  const periodFilteredMovements = useMemo(() => {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    const currQuarter = Math.floor(currMonth / 3);

    return allMachineMovements.filter(m => {
      const mDate = getMovementDate(m.date);
      if (periodFilter === 'CE_MOIS') {
        return mDate.getFullYear() === currYear && mDate.getMonth() === currMonth;
      }
      if (periodFilter === 'CE_TRIMESTRE') {
        const mQuarter = Math.floor(mDate.getMonth() / 3);
        return mDate.getFullYear() === currYear && mQuarter === currQuarter;
      }
      if (periodFilter === 'CETTE_ANNEE') {
        return mDate.getFullYear() === currYear;
      }
      return true; // TOUT
    });
  }, [allMachineMovements, periodFilter]);

  // Classify products based on standard taxonomy
  const getCategoryKey = (articleType?: string): 'PERFORATEURS' | 'CONSOMMABLES' | 'EPI' | 'ENGINS' | 'AUTRES' => {
    if (articleType === 'PERFORATEURS') return 'PERFORATEURS';
    if (articleType === 'CONSOMMABLES') return 'CONSOMMABLES';
    if (articleType === 'EPI') return 'EPI';
    if (articleType === 'ENGINS') return 'ENGINS';
    return 'AUTRES';
  };

  // Group outputs by categories
  const groupedCategories = useMemo(() => {
    const listMap: Record<'PERFORATEURS' | 'CONSOMMABLES' | 'EPI' | 'ENGINS' | 'AUTRES', Array<{
      date: any;
      ref: string;
      designation: string;
      quantity: number;
      demandeur: string;
      articleId: string;
    }>> = {
      PERFORATEURS: [],
      CONSOMMABLES: [],
      EPI: [],
      ENGINS: [],
      AUTRES: []
    };

    periodFilteredMovements.forEach(m => {
      m.items.forEach(item => {
        const art = articles.find(a => a.id === item.articleId);
        const catKey = getCategoryKey(art?.type);
        const nameOfDem = m.demandeur || m.beneficiaire || m.effectiveDemandeur || 'NON SPÉCIFIÉ';
        
        listMap[catKey].push({
          date: m.date,
          ref: art?.ref || 'INCONNU',
          designation: art?.designation || 'Article Inconnu',
          quantity: item.quantity,
          demandeur: nameOfDem,
          articleId: item.articleId
        });
      });
    });

    return listMap;
  }, [periodFilteredMovements, articles]);

  const CATEGORY_ORDER = [
    { key: 'PERFORATEURS' as const, label: 'PIÈCES PERFORATEURS' },
    { key: 'CONSOMMABLES' as const, label: 'CONSOMMABLES & TAILLANTS' },
    { key: 'EPI' as const, label: 'EPI' },
    { key: 'ENGINS' as const, label: 'PIÈCES ENGINS' },
    { key: 'AUTRES' as const, label: 'AUTRES' }
  ];

  const totalFilteredCount = useMemo(() => {
    return (
      groupedCategories.PERFORATEURS.length +
      groupedCategories.CONSOMMABLES.length +
      groupedCategories.EPI.length +
      groupedCategories.ENGINS.length +
      groupedCategories.AUTRES.length
    );
  }, [groupedCategories]);

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'CE_MOIS': return 'Ce mois-ci';
      case 'CE_TRIMESTRE': return 'Ce trimestre';
      case 'CETTE_ANNEE': return 'Cette année';
      default: return 'Tout historique';
    }
  };

  const isOutOfWindow = useMemo(() => {
    if (periodFilter === 'CE_MOIS' || periodFilter === 'CE_TRIMESTRE') return false;
    if (periodFilter === 'CETTE_ANNEE') {
      const janThisYear = new Date(new Date().getFullYear(), 0, 1);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return janThisYear < ninetyDaysAgo;
    }
    return periodFilter === 'TOUT'; // TOUT est toujours hors fenêtre potentiellement
  }, [periodFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end no-print-scroll font-sans" id="carnets-root-container">
      {/* BACKDROP */}
      <div 
        id="carnets-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 no-print"
      />

      {/* SLIDE-OVER SIDE PANEL */}
      <div 
        id="carnets-panel"
        className="relative w-full md:w-[70%] bg-slate-100 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-right duration-300 print:absolute print:inset-0 print:w-full print:bg-white print:shadow-none print:transform-none"
      >
        {/* HEADER BAR */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-5 flex items-center justify-between no-print shadow-sm flex-shrink-0 z-20">
          <div className="flex items-center gap-4">
            <ClipboardList className="w-8 h-8 text-sky-600" />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Carnets de Bord des Machines</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Hydromines Underground Database • Site : <span className="text-sky-600">{site}</span></p>
            </div>
          </div>

          <button 
            id="carnets-close-btn"
            onClick={onClose}
            className="p-3 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-800 transition-all cursor-pointer shadow-sm flex items-center justify-center z-30"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

      {/* CORE DISPLAY */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 print:bg-white print:p-0 print:overflow-visible no-print-scroll bg-slate-100/50">
        
        {/* PRINT EN-TÊTE DIRECTIVE */}
        <div className="hidden print:block border-b-4 border-slate-950 pb-6 mb-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">HYDROMINES</h1>
              <p className="text-xs uppercase tracking-[0.25em] font-extrabold text-slate-400 mt-2">Fiche Historique de Consommation Machine</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-slate-950 uppercase leading-none">{currentTab === 'PERFORATEURS' ? 'PERFORATEUR' : 'ENGIN'} : {selectedMachine}</h2>
              <p className="text-[10px] font-black uppercase text-slate-500 mt-2 bg-slate-100 px-3 py-1.5 rounded-md">Site : {site} | Période : {getPeriodLabel(periodFilter)} | Généré le : {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>

        {/* MACHINE LIST OR DETAILED LOG */}
        {!selectedMachine ? (
          <div className="space-y-6 no-print">
            {/* TABS SELECTOR */}
            <div className="flex border-b border-slate-200 bg-slate-100/60 p-1 rounded-2xl gap-2/5 max-w-fit self-start">
              <button
                id="tab-select-perfos"
                onClick={() => setCurrentTab('PERFORATEURS')}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-xl font-black text-xs tracking-widest uppercase transition-all duration-300 cursor-pointer",
                  currentTab === 'PERFORATEURS'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                )}
              >
                <div className={cn("flex gap-0.5 h-5 transition-all duration-300", currentTab === 'PERFORATEURS' ? "opacity-100" : "opacity-30")}>
                  <div className="w-1 h-full bg-sky-500 rounded-full" />
                  <div className="w-1 h-full bg-rose-800 rounded-full" />
                </div>
                <span>PERFORATEURS</span>
              </button>

              <button
                id="tab-select-engins"
                onClick={() => setCurrentTab('ENGINS')}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-xl font-black text-xs tracking-widest uppercase transition-all duration-300 cursor-pointer",
                  currentTab === 'ENGINS'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                )}
              >
                <div className={cn("flex gap-0.5 h-5 transition-all duration-300", currentTab === 'ENGINS' ? "opacity-100" : "opacity-30")}>
                  <div className="w-1 h-full bg-sky-500 rounded-full" />
                  <div className="w-1 h-full bg-rose-800 rounded-full" />
                </div>
                <span>ENGINS</span>
              </button>
            </div>

            {/* CARDS CONTAINER */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentTab === 'PERFORATEURS' ? (
                perfosWithQty.length > 0 ? (
                  perfosWithQty.map(p => (
                    <div
                      key={p.id}
                      className="relative bg-white border border-slate-200/50 p-6 rounded-3xl cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex items-center justify-between overflow-hidden shadow-sm"
                      onClick={() => setSelectedMachine(p.code)}
                    >
                      {/* Hydromines Signature Lines (Left Margin Accent) */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 flex flex-col gap-0 shadow-inner group-hover:w-1.5 transition-all duration-300">
                        <div className="w-full h-1/2 bg-sky-500" />
                        <div className="w-full h-1/2 bg-rose-800" />
                      </div>

                      <div className="pl-4 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{p.code}</span>
                          <span className="text-[10px] font-black bg-sky-50 text-sky-600 border border-sky-100 rounded-full px-2.5 py-0.5 uppercase tracking-wider">{site}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tight mt-2 flex items-center gap-1.5">
                          Sorties ce mois-ci : <span className="font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">{p.monthQty} item{p.monthQty > 1 ? 's' : ''}</span>
                        </p>
                      </div>

                      <div className="text-slate-300 group-hover:text-slate-800 group-hover:translate-x-1.5 transition-all duration-300">
                        <ArrowRight className="w-6 h-6" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-16 text-center bg-white border border-slate-200/60 rounded-3xl p-12">
                    <Drill className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-black text-lg uppercase tracking-wider">Aucun perforateur recensé sur le site {site}</p>
                  </div>
                )
              ) : (
                enginsWithQty.length > 0 ? (
                  enginsWithQty.map(e => (
                    <div
                      key={e.id}
                      className="relative bg-white border border-slate-200/50 p-6 rounded-3xl cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex items-center justify-between overflow-hidden shadow-sm"
                      onClick={() => setSelectedMachine(e.code)}
                    >
                      {/* Hydromines Signature Lines (Left Margin Accent) */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 flex flex-col gap-0 shadow-inner group-hover:w-1.5 transition-all duration-300">
                        <div className="w-full h-1/2 bg-sky-500" />
                        <div className="w-full h-1/2 bg-rose-800" />
                      </div>

                      <div className="pl-4 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{e.code}</span>
                          <span className="text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5 uppercase tracking-wider">{e.type}</span>
                          <span className="text-[10px] font-black bg-sky-50 text-sky-600 border border-sky-100 rounded-full px-2.5 py-0.5 uppercase tracking-wider">{site}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tight mt-2 flex items-center gap-1.5">
                          Sorties ce mois-ci : <span className="font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">{e.monthQty} item{e.monthQty > 1 ? 's' : ''}</span>
                        </p>
                      </div>

                      <div className="text-slate-300 group-hover:text-slate-800 group-hover:translate-x-1.5 transition-all duration-300">
                        <ArrowRight className="w-6 h-6" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-16 text-center bg-white border border-slate-200/60 rounded-3xl p-12">
                    <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-black text-lg uppercase tracking-wider">Aucun engin recensé sur le site {site}</p>
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          /* DETAILED VIEW INSIDE BOOK */
          <div className="space-y-8">
            {/* BACK BAR & PERIOD SELECTION & PRINT */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-slate-200/80 no-print">
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setSelectedMachine(null)}
                  className="w-fit text-xs font-black uppercase text-slate-400 hover:text-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Tous les {currentTab === 'PERFORATEURS' ? 'perforateurs' : 'engins'}
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">CARNET — {selectedMachine}</h2>
                  <span className="text-xs font-black bg-sky-50 text-sky-600 border border-sky-100 rounded-full px-3 py-1 uppercase tracking-widest">{site}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* PERIOD SWITCHERS */}
                <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-300/40 gap-1.5">
                  {(['CE_MOIS', 'CE_TRIMESTRE', 'CETTE_ANNEE', 'TOUT'] as const).map(pKey => (
                    <button
                      key={pKey}
                      onClick={() => setPeriodFilter(pKey)}
                      className={cn(
                        "px-4.5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer",
                        periodFilter === pKey
                          ? "bg-slate-900 text-white shadow-md"
                          : "text-slate-500 hover:text-slate-850 hover:bg-white/40"
                      )}
                    >
                      {pKey === 'CE_MOIS' ? 'CE MOIS' : pKey === 'CE_TRIMESTRE' ? 'CE TRIMESTRE' : pKey === 'CETTE_ANNEE' ? 'CETTE ANNÉE' : 'TOUT'}
                    </button>
                  ))}
                </div>

                {isOutOfWindow && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs no-print">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      Données limitées aux 90 derniers jours. 
                      Les périodes plus anciennes peuvent être incomplètes.
                    </span>
                  </div>
                )}

                {/* PRINTER TRIGGER */}
                <button
                  onClick={() => window.print()}
                  className="btn bg-sky-600 hover:bg-sky-700 text-white shadow-md border border-sky-600/30 font-black uppercase tracking-widest h-12 px-6 rounded-xl flex items-center gap-2 justify-center cursor-pointer duration-300 transition-all text-sm shadow-sky-600/10"
                >
                  <Printer className="w-5 h-5" />
                  Imprimer
                </button>
              </div>
            </div>

            {/* CURRENT STATUS GRID KPIS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
              <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Sorties ce mois</p>
                <h3 className="text-4xl font-extrabold text-neutral-850 tracking-tight leading-none">
                  {kpis.monthQty} <span className="text-sm font-black text-slate-450 ml-1 uppercase">pièces</span>
                </h3>
              </div>

              <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Sorties cette année</p>
                <h3 className="text-4xl font-extrabold text-neutral-850 tracking-tight leading-none">
                  {kpis.yearQty} <span className="text-sm font-black text-slate-450 ml-1 uppercase">pièces</span>
                </h3>
              </div>

              <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Dernière Sortie d'article</p>
                <h3 className="text-2xl font-black text-rose-650 tracking-tight leading-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-rose-500/80" />
                  {kpis.lastDate}
                </h3>
              </div>
            </div>

            {/* DETAILED HISTORY GROUPED BY TAXONOMY */}
            <div className="space-y-10">
              {totalFilteredCount > 0 ? (
                CATEGORY_ORDER.map(({ key, label }) => {
                  const catItems = groupedCategories[key];
                  if (catItems.length === 0) return null;

                  const totalQty = catItems.reduce((acc, row) => acc + row.quantity, 0);
                  const uniqueArtCount = new Set(catItems.map(r => r.articleId)).size;

                  return (
                    <div key={key} className="space-y-5 print:break-inside-avoid">
                      {/* GROUP OVERHEAD HEADER ACCENT */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 print:pb-3 print:border-b-2 print:border-slate-300">
                        <div className="flex items-center gap-3">
                          {/* Hydromines Signature Lines */}
                          <div className="flex gap-0.5 h-6">
                            <div className="w-1 h-full bg-sky-500 rounded-full" />
                            <div className="w-1 h-full bg-rose-800 rounded-full" />
                          </div>
                          <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">{label}</h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 uppercase tracking-wider border border-slate-200/50">
                            {uniqueArtCount} Réferences
                          </span>
                          <span className="text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-100/50 rounded-full px-2.5 py-1 uppercase tracking-wider">
                            Total : {totalQty} sorti{totalQty > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* DATA TABLE CONTAINER */}
                      <div className="table-container shadow-sm bg-white overflow-hidden border border-slate-200/80 rounded-2xl print:border-none print:shadow-none print:rounded-none">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50/50 print:bg-white print:border-b print:border-slate-300">
                              <th className="px-6 py-4.5 text-xs font-black uppercase tracking-wider text-slate-400">Date Log</th>
                              <th className="px-6 py-4.5 text-xs font-black uppercase tracking-wider text-slate-400">Référence</th>
                              <th className="px-6 py-4.5 text-xs font-black uppercase tracking-wider text-slate-400">Désignation</th>
                              <th className="px-6 py-4.5 text-right text-xs font-black uppercase tracking-wider text-slate-400">Qté</th>
                              <th className="px-6 py-4.5 text-xs font-black uppercase tracking-wider text-slate-400 pl-8">Demandeur / Commis</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 print:divide-y print:divide-slate-200">
                            {catItems.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-6 py-4 text-slate-400 font-bold text-sm">
                                  {formatDateSafe(row.date)}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="bg-slate-100/80 text-slate-600 px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-tight border border-slate-200 flex-shrink-0">
                                    {row.ref}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-slate-800 font-extrabold uppercase text-sm select-none break-words">
                                    {row.designation}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className="text-rose-600 font-black text-base tabular-nums">
                                    {row.quantity}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-bold text-xs uppercase pl-8 truncate max-w-[200px]" title={row.demandeur}>
                                  {row.demandeur}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl p-12 max-w-xl mx-auto shadow-sm">
                  <Package className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                  <p className="text-slate-800 font-black text-lg uppercase tracking-wider mb-2">
                    Aucune sortie enregistrée pour cette machine.
                  </p>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider leading-relaxed">
                    Créez un bon de sortie en sélectionnant cette machine dans le formulaire.
                  </p>
                </div>
              )}
            </div>
            
            {/* PRINT SIGNATURE FOOTER AREA */}
            <div className="hidden print:block pt-16 border-t-2 border-slate-200 mt-20">
              <div className="grid grid-cols-2 gap-12 text-xs font-black tracking-wider uppercase text-slate-600">
                <div>
                  <p className="border-b-2 border-slate-200 pb-3 mb-16 font-extrabold text-slate-800">VISA CHEF DE SITE MAGASIN</p>
                  <p className="italic text-[10px] text-slate-400">Date et signature approuvées</p>
                </div>
                <div>
                  <p className="border-b-2 border-slate-200 pb-3 mb-16 font-extrabold text-slate-800">VISA RESPONSABLE MAINTENANCE</p>
                  <p className="italic text-[10px] text-slate-400">Date et signature approuvées</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
