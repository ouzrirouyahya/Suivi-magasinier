import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  FileBox, 
  Database, 
  ArrowRightLeft, 
  History, 
  SlidersHorizontal,
  Info,
  ChevronDown
} from 'lucide-react';
import { 
  exportToExcel, 
  exportToCSV, 
  formatArticlesForExport, 
  formatMovementsForExport, 
  formatMovementsConsolidated,
  formatTransfersForExport, 
  formatPriceHistoryForExport,
  formatArticlesSummaryDashboard,
  formatMovementsSummaryDashboard,
  SheetConfig
} from '../utils/exportUtils';
import { useArticlesStore } from '../stores/article.store';
import { useMovementsStore } from '../stores/movement.store';
import { useTransfersStore } from '../stores/transfer.store';
import { getPriceHistory } from '../services/priceHistory.service';
import { PriceChangeRecord } from '../types/priceHistory';
import { SiteCode } from '../types';
import { SITE_CODES } from '../lib/constants';
import { toast } from 'sonner';

interface ExportDataModalProps {
  open: boolean;
  onClose: () => void;
}

type DateFilterType = 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'CURRENT_MONTH' | 'PREVIOUS_MONTH' | 'SPECIFIC_MONTH' | 'CUSTOM_RANGE';

export function ExportDataModal({ open, onClose }: ExportDataModalProps) {
  const [exportingType, setExportingType] = useState<string | null>(null);
  
  // Date Filters
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('ALL');
  const [selectedSpecificMonth, setSelectedSpecificMonth] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Options
  const [includeSummary, setIncludeSummary] = useState<boolean>(true);
  const [dailyGrouped, setDailyGrouped] = useState<boolean>(true);
  const [movementTypeFilter, setMovementTypeFilter] = useState<'ALL' | 'ENTREE' | 'SORTIE' | 'RETOUR' | 'AJUSTEMENT'>('ALL');
  const [siteFilter, setSiteFilter] = useState<SiteCode | 'ALL'>('ALL');

  // States for fetching dynamic data
  const [priceHistory, setPriceHistory] = useState<PriceChangeRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const articles = useArticlesStore(state => state.articles);
  const movements = useMovementsStore(state => state.mouvements);
  const transfers = useTransfersStore(state => state.transferts);

  // Generate last 12 months for dropdown
  const monthsList = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value
      });
    }
    // Set default specific month to current month
    if (list.length > 0 && !selectedSpecificMonth) {
      setSelectedSpecificMonth(list[0].value);
    }
    return list;
  }, []);

  // Fetch price history on open
  useEffect(() => {
    if (open) {
      setLoadingHistory(true);
      getPriceHistory(undefined, undefined, 2000)
        .then(data => {
          setPriceHistory(data);
        })
        .catch(err => {
          console.error('[ExportDataModal] Error loading price history:', err);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [open]);

  // Unified filtering function based on the selected date configurations
  const filterBySelectedPeriod = <T extends any>(items: T[], dateField: string): T[] => {
    return items.filter(item => {
      let rawDate = (item as any)[dateField];
      if (!rawDate) return false;

      // Firestore Timestamp or date string
      const itemDate = new Date(typeof rawDate.toDate === 'function' ? rawDate.toDate() : rawDate);
      if (isNaN(itemDate.getTime())) return false;

      const today = new Date();
      const startOfDay = (d: Date) => { d.setHours(0,0,0,0); return d; };
      const endOfDay = (d: Date) => { d.setHours(23,59,59,999); return d; };

      switch (dateFilterType) {
        case 'ALL':
          return true;

        case 'TODAY': {
          const start = startOfDay(new Date());
          const end = endOfDay(new Date());
          return itemDate >= start && itemDate <= end;
        }

        case 'LAST_7_DAYS': {
          const start = startOfDay(new Date());
          start.setDate(start.getDate() - 7);
          const end = endOfDay(new Date());
          return itemDate >= start && itemDate <= end;
        }

        case 'CURRENT_MONTH': {
          const start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          return itemDate >= start && itemDate <= end;
        }

        case 'PREVIOUS_MONTH': {
          const start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0);
          const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
          return itemDate >= start && itemDate <= end;
        }

        case 'SPECIFIC_MONTH': {
          if (!selectedSpecificMonth) return true;
          const [year, month] = selectedSpecificMonth.split('-').map(Number);
          const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
          const end = new Date(year, month, 0, 23, 59, 59, 999);
          return itemDate >= start && itemDate <= end;
        }

        case 'CUSTOM_RANGE': {
          if (!customStartDate) return true;
          const start = startOfDay(new Date(customStartDate));
          const end = customEndDate ? endOfDay(new Date(customEndDate)) : endOfDay(new Date());
          return itemDate >= start && itemDate <= end;
        }

        default:
          return true;
      }
    });
  };

  // Live filtered subsets
  const filteredArticles = useMemo(() => {
    let list = articles;
    if (siteFilter !== 'ALL') {
      list = list.filter(a => a.site === siteFilter);
    }
    return list;
  }, [articles, siteFilter]);

  const physicalArticlesCount = useMemo(() => {
    return filteredArticles.filter(a => (a.quantity || 0) > 0).length;
  }, [filteredArticles]);

  const filteredMovements = useMemo(() => {
    let list = filterBySelectedPeriod(movements, 'date');
    if (movementTypeFilter !== 'ALL') {
      list = list.filter(m => m.type === movementTypeFilter);
    }
    if (siteFilter !== 'ALL') {
      list = list.filter(m => m.site === siteFilter || m.targetSite === siteFilter);
    }
    return list;
  }, [movements, dateFilterType, selectedSpecificMonth, customStartDate, customEndDate, movementTypeFilter, siteFilter]);

  const filteredTransfers = useMemo(() => {
    let list = filterBySelectedPeriod(transfers, 'dateEnvoi');
    if (siteFilter !== 'ALL') {
      list = list.filter(t => t.sourceSite === siteFilter || t.targetSite === siteFilter);
    }
    return list;
  }, [transfers, dateFilterType, selectedSpecificMonth, customStartDate, customEndDate, siteFilter]);

  const filteredPriceHistory = useMemo(() => {
    let list = filterBySelectedPeriod<PriceChangeRecord>(priceHistory, 'changedAt');
    if (siteFilter !== 'ALL') {
      const siteArticlesIds = new Set(articles.filter(a => a.site === siteFilter).map(a => a.id));
      list = list.filter(p => siteArticlesIds.has(p.itemId));
    }
    return list;
  }, [priceHistory, dateFilterType, selectedSpecificMonth, customStartDate, customEndDate, siteFilter, articles]);

  // Execute export action
  const handleExport = async (
    type: 'articles' | 'movements' | 'transfers' | 'priceHistory', 
    format: 'excel' | 'csv'
  ) => {
    const key = `${type}-${format}`;
    setExportingType(key);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Smooth UI transition

      let sheets: SheetConfig[] = [];
      let filename = '';

      switch (type) {
        case 'articles': {
          if (siteFilter === 'ALL' && format === 'excel') {
            const summaryData = formatArticlesSummaryDashboard(articles, movements);
            sheets.push({
              name: '📊 Synthèse Générale',
              data: summaryData,
              title: "Tableau de Bord d'Inventaire Consolidé (Tous les Sites)"
            });

            const sitesList = SITE_CODES;
            sitesList.forEach(siteName => {
              const siteArts = articles.filter(a => a.site === siteName);
              const data = formatArticlesForExport(siteArts);
              sheets.push({
                name: siteName,
                data: data.length > 0 ? data : [{ 'Référence': 'Aucun article', 'Désignation': `Aucun enregistrement d'inventaire sur le site ${siteName}` }],
                title: `Inventaire des Articles - Site ${siteName}`
              });
            });

            filename = 'articles_inventaire_consolide';
          } else {
            const data = formatArticlesForExport(filteredArticles);
            sheets.push({
              name: siteFilter === 'ALL' ? 'Inventaire' : siteFilter,
              data: data.length > 0 ? data : [{ 'Référence': 'Aucun article', 'Désignation': `Aucun enregistrement d'inventaire` }],
              title: siteFilter === 'ALL' 
                ? "Inventaire complet du Stock d'Articles" 
                : `Inventaire des Stock d'Articles - Site ${siteFilter}`
            });
            filename = siteFilter === 'ALL' ? 'articles_inventaire' : `articles_inventaire_${siteFilter.toLowerCase()}`;
          }
          break;
        }
          
        case 'movements': {
          if (siteFilter === 'ALL' && format === 'excel') {
            const summaryData = formatMovementsSummaryDashboard(filteredMovements, articles);
            sheets.push({
              name: '📊 Synthèse Générale',
              data: summaryData,
              title: `Tableau de Bord des Mouvements de Stock (${getFilterLabel()})`
            });

            if (includeSummary) {
              const consolidatedData = formatMovementsConsolidated(filteredMovements, articles);
              sheets.push({
                name: 'Synthèse Articles',
                data: consolidatedData,
                title: `Synthèse des flux par article (${getFilterLabel()})`
              });
            }

            const sitesList = SITE_CODES;
            sitesList.forEach(siteName => {
              const siteMovs = filteredMovements.filter(m => m.site === siteName || m.targetSite === siteName);
              const data = formatMovementsForExport(siteMovs, articles, dailyGrouped);
              sheets.push({
                name: siteName,
                data: data.length > 0 ? data : [{ '🩵 Date Mouvement': 'Aucun mouvement', '🩵 Désignation Article': `Aucun mouvement enregistré pour le site ${siteName}` }],
                title: `Registre des Mouvements de Stock - Site ${siteName} (${getFilterLabel()})`
              });
            });

            filename = 'mouvements_stock_consolide';
          } else {
            const detailedData = formatMovementsForExport(filteredMovements, articles, dailyGrouped);
            sheets.push({
              name: siteFilter === 'ALL' ? 'Mouvements' : siteFilter,
              data: detailedData.length > 0 ? detailedData : [{ '🩵 Date Mouvement': 'Aucun mouvement', '🩵 Désignation Article': 'Aucun mouvement enregistré' }],
              title: siteFilter === 'ALL'
                ? `Registre des Mouvements de Stock (${getFilterLabel()})`
                : `Registre des Mouvements de Stock - Site ${siteFilter} (${getFilterLabel()})`
            });

            if (includeSummary && format === 'excel') {
              const consolidatedData = formatMovementsConsolidated(filteredMovements, articles);
              sheets.push({
                name: 'Synthèse Articles',
                data: consolidatedData,
                title: siteFilter === 'ALL'
                  ? `Synthèse mensuelle des flux par article (${getFilterLabel()})`
                  : `Synthèse mensuelle par article - Site ${siteFilter} (${getFilterLabel()})`
              });
            }
            
            filename = siteFilter === 'ALL' ? 'mouvements_stock' : `mouvements_stock_${siteFilter.toLowerCase()}`;
          }
          break;
        }
          
        case 'transfers': {
          const detailedData = formatTransfersForExport(filteredTransfers, articles);
          sheets.push({
            name: siteFilter === 'ALL' ? 'Transferts' : siteFilter,
            data: detailedData.length > 0 ? detailedData : [{ 'Date Envoi': 'Aucun transfert', 'Référence Transfert': 'Aucun transfert enregistré' }],
            title: siteFilter === 'ALL'
              ? `Registre des Transferts Inter-Chantiers (${getFilterLabel()})`
              : `Registre des Transferts - Site ${siteFilter} (${getFilterLabel()})`
          });
          filename = siteFilter === 'ALL' ? 'transferts_inter_chantiers' : `transferts_inter_chantiers_${siteFilter.toLowerCase()}`;
          break;
        }
          
        case 'priceHistory': {
          const detailedData = formatPriceHistoryForExport(filteredPriceHistory, dailyGrouped);
          sheets.push({
            name: 'Historique Prix',
            data: detailedData.length > 0 ? detailedData : [{ 'Date Changement': 'Aucune modification', 'Référence Article': 'Aucun historique de modification' }],
            title: siteFilter === 'ALL'
              ? `Historique des modifications de prix de vente (${getFilterLabel()})`
              : `Historique des prix - Site ${siteFilter} (${getFilterLabel()})`
          });
          filename = siteFilter === 'ALL' ? 'historique_prix' : `historique_prix_${siteFilter.toLowerCase()}`;
          break;
        }
        
        default:
          throw new Error('Type d\'export non pris en charge');
      }

      const firstSheetData = sheets[0]?.data || [];

      if (format === 'excel') {
        exportToExcel(sheets, filename);
      } else {
        exportToCSV(firstSheetData, filename);
      }

      toast.success(`Export ${format.toUpperCase()} de "${sheets[0].name}" généré avec succès !`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Une erreur est survenue lors de la compilation du rapport.');
    } finally {
      setExportingType(null);
    }
  };

  // Get localized label for the title depending on filter
  const getFilterLabel = () => {
    switch (dateFilterType) {
      case 'ALL': return 'Toutes les dates';
      case 'TODAY': return 'Aujourd\'hui';
      case 'LAST_7_DAYS': return '7 derniers jours';
      case 'CURRENT_MONTH': return 'Mois en cours';
      case 'PREVIOUS_MONTH': return 'Mois dernier';
      case 'SPECIFIC_MONTH': {
        const found = monthsList.find(m => m.value === selectedSpecificMonth);
        return found ? found.label : 'Mois spécifique';
      }
      case 'CUSTOM_RANGE': return `Du ${customStartDate || '?'} au ${customEndDate || 'aujourd\'hui'}`;
      default: return 'Filtre appliqué';
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          {/* Backdrop with elegant blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Elegant Header with Hydromines Touches */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100/70 flex items-center justify-center text-sky-600 shadow-inner">
                  <Download className="w-5 h-5 text-[#b8860b]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    Rapports et Exportations Excel
                  </h3>
                  <p className="text-[10px] font-bold text-[#b8860b] uppercase tracking-wider mt-0.5">
                    Extractions personnalisées aux couleurs de Hydromines
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Panel */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* DATE FILTERING PANEL */}
              <div className="p-5 border border-slate-150 rounded-2xl bg-slate-50/20 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <SlidersHorizontal className="w-4 h-4 text-[#b8860b]" />
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                    Période d'exportation
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Dropdown to choose site */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Chantier / Site</label>
                    <div className="relative">
                      <select
                        value={siteFilter}
                        onChange={(e) => setSiteFilter(e.target.value as any)}
                        className="w-full h-10 pl-3 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#b8860b] focus:ring-1 focus:ring-[#b8860b] transition-all cursor-pointer appearance-none animate-pulse-once"
                      >
                        <option value="ALL">🏢 Tous les sites (Consolidé)</option>
                        <option value="SMI">SMI</option>
                        <option value="OUMEJRANE">OUMEJRANE</option>
                        <option value="BOU-AZZER">BOU-AZZER</option>
                        <option value="OUANSIMI">OUANSIMI</option>
                        <option value="KOUDIA">KOUDIA</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Dropdown to choose preset */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Période</label>
                    <div className="relative">
                      <select
                        value={dateFilterType}
                        onChange={(e) => setDateFilterType(e.target.value as DateFilterType)}
                        className="w-full h-10 pl-3 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#b8860b] focus:ring-1 focus:ring-[#b8860b] transition-all cursor-pointer appearance-none"
                      >
                        <option value="ALL">Tout l'historique disponible</option>
                        <option value="TODAY">Aujourd'hui</option>
                        <option value="LAST_7_DAYS">7 derniers jours</option>
                        <option value="CURRENT_MONTH">Mois en cours (M)</option>
                        <option value="PREVIOUS_MONTH">Mois précédent (M-1)</option>
                        <option value="SPECIFIC_MONTH">Sélectionner un mois spécifique</option>
                        <option value="CUSTOM_RANGE">Plage de dates personnalisée</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Dropdown to choose movement type */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Filtrer par type</label>
                    <div className="relative">
                      <select
                        value={movementTypeFilter}
                        onChange={(e) => setMovementTypeFilter(e.target.value as any)}
                        className="w-full h-10 pl-3 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#b8860b] focus:ring-1 focus:ring-[#b8860b] transition-all cursor-pointer appearance-none"
                      >
                        <option value="ALL">Tous les mouvements</option>
                        <option value="ENTREE">Entrées uniquement (🩵)</option>
                        <option value="SORTIE">Sorties uniquement (🟥)</option>
                        <option value="RETOUR">Retours uniquement (🔹)</option>
                        <option value="AJUSTEMENT">Ajustements uniquement (🛑)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Dynamic fields dependent on the preset chosen */}
                  {dateFilterType === 'SPECIFIC_MONTH' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mois de l'année</label>
                      <div className="relative">
                        <select
                          value={selectedSpecificMonth}
                          onChange={(e) => setSelectedSpecificMonth(e.target.value)}
                          className="w-full h-10 pl-3 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#b8860b] focus:ring-1 focus:ring-[#b8860b] transition-all cursor-pointer appearance-none"
                        >
                          {monthsList.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {dateFilterType === 'CUSTOM_RANGE' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Début</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#b8860b] transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fin</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#b8860b] transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STYLING & OPTIONS PANEL */}
              <div className="p-4 border border-slate-150 rounded-2xl bg-[#00bfff]/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2.5 items-start">
                  <Info className="w-4 h-4 text-[#b8860b] mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-wide">
                      Options d'Optimisation Excel
                    </h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                      Nos fichiers sont optimisés avec alignement automatique des colonnes, lignes de grille visibles et marges d'impression libres.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                  {/* Summary Sheet Option */}
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSummary}
                      onChange={(e) => setIncludeSummary(e.target.checked)}
                      className="rounded border-slate-300 text-[#b8860b] focus:ring-[#b8860b] h-4 w-4"
                    />
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                      Feuille de Synthèse Consolidée
                    </span>
                  </label>

                  {/* Daily Separation Option */}
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dailyGrouped}
                      onChange={(e) => setDailyGrouped(e.target.checked)}
                      className="rounded border-slate-300 text-[#b8860b] focus:ring-[#b8860b] h-4 w-4"
                    />
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                      Séparation & Totaux Quotidiens
                    </span>
                  </label>
                </div>
              </div>

              {/* DETAILED DATA EXPORT CARDS */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">
                  Sélectionner les registres à télécharger
                </h4>

                {/* Card 1: Registre des Mouvements */}
                <ExportDataCard
                  title="Registre des Mouvements"
                  description="Historique des entrées, sorties, ajustements, retours, demandeurs et motifs."
                  icon={Database}
                  count={filteredMovements.length}
                  unit="mouvements filtrés"
                  onExportExcel={() => handleExport('movements', 'excel')}
                  onExportCSV={() => handleExport('movements', 'csv')}
                  isLoadingExcel={exportingType === 'movements-excel'}
                  isLoadingCsv={exportingType === 'movements-csv'}
                  isAnyLoading={exportingType !== null}
                  metaText={getFilterLabel()}
                />

                {/* Card 2: Inventaire Général (Articles) */}
                <ExportDataCard
                  title="Inventaire Général (Articles)"
                  description="État actuel de tous les stocks, références, PMP, emplacements et seuils d'alertes."
                  icon={FileBox}
                  count={physicalArticlesCount}
                  unit={siteFilter === 'ALL' ? "articles physiques en stock" : `articles physiques en stock (${siteFilter})`}
                  onExportExcel={() => handleExport('articles', 'excel')}
                  onExportCSV={() => handleExport('articles', 'csv')}
                  isLoadingExcel={exportingType === 'articles-excel'}
                  isLoadingCsv={exportingType === 'articles-csv'}
                  isAnyLoading={exportingType !== null}
                  metaText="Snapshot d'inventaire"
                />

                {/* Card 3: Transfers */}
                <ExportDataCard
                  title="Transferts Inter-Chantiers"
                  description="Traçabilité des expéditions de matériel entre les sites sources et les chantiers cibles."
                  icon={ArrowRightLeft}
                  count={filteredTransfers.length}
                  unit="transferts filtrés"
                  onExportExcel={() => handleExport('transfers', 'excel')}
                  onExportCSV={() => handleExport('transfers', 'csv')}
                  isLoadingExcel={exportingType === 'transfers-excel'}
                  isLoadingCsv={exportingType === 'transfers-csv'}
                  isAnyLoading={exportingType !== null}
                  metaText={getFilterLabel()}
                />

                {/* Card 4: Price History */}
                <ExportDataCard
                  title="Modifications des Prix"
                  description="Registre d'audit de toutes les réévaluations de prix unitaire (PMP) de vente."
                  icon={History}
                  count={loadingHistory ? 0 : filteredPriceHistory.length}
                  unit={loadingHistory ? 'chargement...' : 'modifications filtrées'}
                  onExportExcel={() => handleExport('priceHistory', 'excel')}
                  onExportCSV={() => handleExport('priceHistory', 'csv')}
                  isLoadingExcel={exportingType === 'priceHistory-excel'}
                  isLoadingCsv={exportingType === 'priceHistory-csv'}
                  isAnyLoading={exportingType !== null}
                  metaText={getFilterLabel()}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Service Exportation Hydromines opérationnel
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-slate-900/10 active:scale-95"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ExportDataCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  count: number;
  unit: string;
  onExportExcel: () => void;
  onExportCSV: () => void;
  isLoadingExcel: boolean;
  isLoadingCsv: boolean;
  isAnyLoading: boolean;
  metaText: string;
}

function ExportDataCard({
  title,
  description,
  icon: Icon,
  count,
  unit,
  onExportExcel,
  onExportCSV,
  isLoadingExcel,
  isLoadingCsv,
  isAnyLoading,
  metaText
}: ExportDataCardProps) {
  return (
    <div className="p-4 border border-slate-150 rounded-2xl bg-white hover:border-[#b8860b]/30 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Information Column */}
      <div className="flex gap-3 items-start sm:items-center max-w-sm">
        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#b8860b] shadow-inner shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              {title}
            </h4>
            <span className="text-[9px] px-2 py-0.5 bg-slate-100 border border-slate-150 rounded-full font-black text-slate-500 font-mono">
              {count} {unit}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            {description}
          </p>
          <div className="text-[9px] font-extrabold text-[#b8860b] uppercase tracking-wider mt-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-sky-500" />
            Période : {metaText}
          </div>
        </div>
      </div>

      {/* Button controls */}
      <div className="flex items-center gap-2 shrink-0 sm:self-center">
        {/* Excel button */}
        <button
          onClick={onExportExcel}
          disabled={isAnyLoading}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
            isLoadingExcel 
              ? 'bg-[#b8860b]/10 border-[#b8860b] text-[#b8860b]'
              : 'bg-[#b8860b]/5 border-[#b8860b]/20 hover:border-[#b8860b]/50 hover:bg-[#b8860b]/10 text-slate-800 disabled:opacity-40'
          }`}
        >
          {isLoadingExcel ? (
            <div className="w-3 h-3 rounded-full border border-b-0 border-[#b8860b] animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          )}
          Excel (.xlsx)
        </button>

        {/* CSV button */}
        <button
          onClick={onExportCSV}
          disabled={isAnyLoading}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
            isLoadingCsv 
              ? 'bg-sky-50 border-sky-400 text-sky-700'
              : 'bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-slate-700 disabled:opacity-40'
          }`}
        >
          {isLoadingCsv ? (
            <div className="w-3 h-3 rounded-full border border-b-0 border-sky-600 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 text-blue-500" />
          )}
          CSV
        </button>
      </div>
    </div>
  );
}
