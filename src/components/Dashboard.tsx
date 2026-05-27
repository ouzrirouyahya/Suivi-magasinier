import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  DollarSign, 
  AlertCircle, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Package,
  Activity,
  Truck,
  Zap,
  ArrowRight,
  CheckCircle2,
  ShieldCheck as ShieldIcon,
  BarChart3,
  PieChart as PieIcon,
  ArrowRightLeft,
  Brain,
  CheckCircle,
  Camera,
  Fingerprint,
  FileText,
  Calendar,
  Search,
  Trash2,
  Plus,
  Flame,
  User,
  Cpu,
  CornerDownLeft,
  BookOpen
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Article, Mouvement, SiteCode, MouvementItem } from '../types';
import { cn, formatCurrency, generateId } from '../lib/utils';
import { useInventory } from '../context/InventoryContext';
import { toast } from 'sonner';

interface DashboardProps {
  site: SiteCode;
  articles: Article[];
  mouvements: Mouvement[];
  isAdmin: boolean;
  onAction: (page: any) => void;
  onArticleClick?: (article: Article) => void;
}

interface GridRow {
  id: string;
  reference: string;
  designation: string;
  quantity: string;
  destination: string;
  observation: string;
  error?: string;
  isValid?: boolean;
  matchedArticleId?: string;
  price?: number;
}


const COLORS = ['#0ea5e9', '#991b1b', '#10b981', '#f59e0b', '#6366f1'];

export function Dashboard({ site, articles, mouvements, isAdmin, onAction, onArticleClick }: DashboardProps) {
  const { 
    catalog, 
    engins, 
    perfos, 
    agents,
    addMouvement 
  } = useInventory();

  // Mode Selection State
  const [activePane, setActivePane] = useState<'DASHBOARD' | 'SAISIE'>('DASHBOARD');

  // Instant Search Section States
  const [instantSearchQuery, setInstantSearchQuery] = useState('');
  const [searchHighlightIdx, setSearchHighlightIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Bulk Saisie Excel States
  const [gridType, setGridType] = useState<'ENTREE' | 'SORTIE'>('SORTIE');
  const [metaBeneficiaire, setMetaBeneficiaire] = useState('');
  const [metaFournisseur, setMetaFournisseur] = useState('');
  const [metaBLCode, setMetaBLCode] = useState('');
  const [metaMecanicien, setMetaMecanicien] = useState('');
  const [metaMachine, setMetaMachine] = useState('');
  const [metaService, setMetaService] = useState('');
  const [metaGlobalNotes, setMetaGlobalNotes] = useState('');

  const [gridRows, setGridRows] = useState<GridRow[]>(() => 
    Array.from({ length: 5 }, () => ({
      id: generateId(),
      reference: '',
      designation: '',
      quantity: '',
      destination: '',
      observation: '',
    }))
  );

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // 1. Instantly focus the search input on CTRL+K or /
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || e.key === '/') {
        if (
          document.activeElement?.tagName !== 'INPUT' && 
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // 2. Resolve cells and validate in real-time
  const handleCellChange = (rIdx: number, field: keyof GridRow, val: string) => {
    const updated = [...gridRows];
    updated[rIdx] = { ...updated[rIdx], [field]: val };
    
    // Auto resolution for Reference column
    if (field === 'reference') {
      const cleanRef = val.trim().toUpperCase();
      const matched = articles.find(a => a.ref.toUpperCase() === cleanRef && a.site === site);
      if (cleanRef === '') {
        updated[rIdx].designation = '';
        updated[rIdx].matchedArticleId = undefined;
        updated[rIdx].error = undefined;
        updated[rIdx].isValid = false;
      } else if (matched) {
        updated[rIdx].designation = matched.designation;
        updated[rIdx].matchedArticleId = matched.id;
        updated[rIdx].price = matched.price ?? 0;
        updated[rIdx].error = undefined;
        updated[rIdx].isValid = true;
      } else {
        const cat = catalog.find(c => c.ref.toUpperCase() === cleanRef);
        if (cat) {
          updated[rIdx].designation = cat.designation;
          updated[rIdx].matchedArticleId = undefined;
          updated[rIdx].price = 0;
          updated[rIdx].error = gridType === 'SORTIE' ? "Pas de stock sur site" : undefined;
          updated[rIdx].isValid = gridType === 'ENTREE';
        } else {
          updated[rIdx].designation = '';
          updated[rIdx].matchedArticleId = undefined;
          updated[rIdx].isValid = false;
          updated[rIdx].error = "Référence inconnue";
        }
      }
    }
    
    // Quantity validation parameters
    if (field === 'quantity') {
      const row = updated[rIdx];
      const qNum = Number(val);
      const matched = articles.find(a => a.ref.toUpperCase() === row.reference.toUpperCase() && a.site === site);
      
      if (val === '') {
        row.error = "Quantité requise";
        row.isValid = false;
      } else if (isNaN(qNum) || qNum <= 0) {
        row.error = "Quantité incorrecte";
        row.isValid = false;
      } else if (gridType === 'SORTIE' && matched && qNum > matched.quantity) {
        row.error = `Insuffisant (Max: ${matched.quantity})`;
        row.isValid = false;
      } else {
        row.error = undefined;
        row.isValid = !!row.reference;
      }
    }
    
    setGridRows(updated);
  };

  const focusCell = (rowIdx: number, colName: string) => {
    const refKey = `${rowIdx}-${colName}`;
    const element = inputRefs.current[refKey];
    if (element) {
      element.focus();
      element.select();
    }
  };

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rIdx: number, col: keyof GridRow) => {
    if (e.key === 'Tab') {
      if (col === 'observation' && !e.shiftKey) {
        e.preventDefault();
        if (rIdx === gridRows.length - 1) {
          const newRow: GridRow = {
            id: generateId(),
            reference: '',
            designation: '',
            quantity: '',
            destination: '',
            observation: '',
          };
          setGridRows(prev => [...prev, newRow]);
          setTimeout(() => focusCell(rIdx + 1, 'reference'), 60);
        } else {
          focusCell(rIdx + 1, 'reference');
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rIdx === gridRows.length - 1) {
        const newRow: GridRow = {
          id: generateId(),
          reference: '',
          designation: '',
          quantity: '',
          destination: '',
          observation: '',
        };
        setGridRows(prev => [...prev, newRow]);
        setTimeout(() => focusCell(rIdx + 1, 'reference'), 60);
      } else {
        focusCell(rIdx + 1, 'reference');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rIdx < gridRows.length - 1) {
        focusCell(rIdx + 1, col as string);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rIdx > 0) {
        focusCell(rIdx - 1, col as string);
      }
    }
  };

  // Support pasting tabbed content directly from raw Excel selection
  const handleGridPaste = (e: React.ClipboardEvent, rowIndex: number, field: keyof GridRow) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;
    
    if (pasteData.includes('\t') || pasteData.includes('\n')) {
      e.preventDefault();
      const rows = pasteData.split(/\r?\n/).filter(r => r.trim() !== '').map(r => r.split('\t'));
      const newGridRows = [...gridRows];
      
      rows.forEach((rowCells, rIdx) => {
        const targetRowIdx = rowIndex + rIdx;
        
        while (newGridRows.length <= targetRowIdx) {
          newGridRows.push({
            id: generateId(),
            reference: '',
            designation: '',
            quantity: '',
            destination: '',
            observation: '',
          });
        }
        
        const row = { ...newGridRows[targetRowIdx] };
        
        if (rowCells[0] !== undefined) row.reference = rowCells[0].trim();
        if (rowCells[1] !== undefined) row.designation = rowCells[1].trim();
        if (rowCells[2] !== undefined) row.quantity = rowCells[2].trim();
        if (rowCells[3] !== undefined) row.destination = rowCells[3].trim();
        if (rowCells[4] !== undefined) row.observation = rowCells[4].trim();
        
        // Resolve references inline
        const cleanRef = row.reference.toUpperCase();
        const matched = articles.find(a => a.ref.toUpperCase() === cleanRef && a.site === site);
        if (cleanRef && matched) {
          row.designation = matched.designation;
          row.matchedArticleId = matched.id;
          row.price = matched.price ?? 0;
          row.error = undefined;
          row.isValid = true;
        } else if (cleanRef) {
          const cat = catalog.find(c => c.ref.toUpperCase() === cleanRef);
          if (cat) {
            row.designation = cat.designation;
            row.error = gridType === 'SORTIE' ? "Pas de stock sur site" : undefined;
            row.isValid = gridType === 'ENTREE';
          } else {
            row.designation = '';
            row.isValid = false;
            row.error = "Référence inconnue";
          }
        }
        
        // Quantity check for paste
        if (row.quantity) {
          const qNum = Number(row.quantity);
          if (isNaN(qNum) || qNum <= 0) {
            row.error = "Quantité incorrecte";
            row.isValid = false;
          } else if (gridType === 'SORTIE' && matched && qNum > matched.quantity) {
            row.error = `Insuffisant (Max: ${matched.quantity})`;
            row.isValid = false;
          }
        }
        
        newGridRows[targetRowIdx] = row;
      });
      
      setGridRows(newGridRows);
      toast.success(`${rows.length} lignes chargées depuis Excel.`);
    }
  };

  const handleAddBlankRow = () => {
    setGridRows(prev => [...prev, {
      id: generateId(),
      reference: '',
      designation: '',
      quantity: '',
      destination: '',
      observation: '',
    }]);
  };

  const handleRemoveRow = (id: string) => {
    if (gridRows.length > 1) {
      setGridRows(gridRows.filter(r => r.id !== id));
    } else {
      setGridRows([{
        id: generateId(),
        reference: '',
        designation: '',
        quantity: '',
        destination: '',
        observation: '',
      }]);
    }
  };

  // Submit and save multi-item bulk record
  const handleGlobalValidation = async () => {
    if (gridType === 'SORTIE') {
      if (!metaBeneficiaire.trim()) {
        toast.error("Le bénéficiaire est obligatoire pour une sortie.");
        return;
      }
    } else {
      if (!metaFournisseur.trim()) {
        toast.error("Le fournisseur est obligatoire pour une réception.");
        return;
      }
      if (!metaBLCode.trim()) {
        toast.error("La référence document (BL No) est requise.");
        return;
      }
    }

    const activeRows = gridRows.filter(r => r.reference.trim() !== '');
    if (activeRows.length === 0) {
      toast.error("Veuillez saisir au moins un article avec référence.");
      return;
    }

    const invalidRows = activeRows.filter(r => r.error);
    if (invalidRows.length > 0) {
      toast.error(`Erreur à la ligne avec référence "${invalidRows[0].reference}" : ${invalidRows[0].error}`);
      return;
    }

    const itemsList: MouvementItem[] = activeRows.map(row => {
      return {
        articleId: row.matchedArticleId || '',
        quantity: Number(row.quantity),
        price: row.price || 0
      };
    });

    const detailNotes = activeRows.map((r, idx) => 
      `${idx + 1}. Réf: ${r.reference} (Qty: ${r.quantity}) | Dest: ${r.destination || 'MAGASIN'} | Obs: ${r.observation || 'Rien'}`
    ).join('\n');

    const globalNotes = `${metaGlobalNotes}\n\nDÉTAIL DU BATCH DE SAISIE MASSIVE:\n${detailNotes}`;

    const firstRowDest = activeRows.find(r => r.destination)?.destination || '';
    const resolvedEngin = engins.find(e => e.id === metaMachine || e.code === firstRowDest);
    const resolvedPerfo = perfos.find(p => p.id === metaMachine || p.code === firstRowDest);

    const prefix = gridType === 'ENTREE' ? 'BE' : 'BS';
    const autoDocId = `${prefix}/${site}/${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const newMouvement: Mouvement = {
      id: generateId(),
      site,
      date: new Date().toISOString(),
      type: gridType,
      reference: gridType === 'ENTREE' ? metaBLCode : autoDocId,
      vendeur: gridType === 'ENTREE' ? metaFournisseur : undefined,
      demandeur: gridType === 'SORTIE' ? metaBeneficiaire : undefined,
      beneficiaire: gridType === 'SORTIE' ? metaBeneficiaire : undefined,
      mecanicien: metaMecanicien || 'OPÉRATEUR MASSIVE GRID',
      engin: resolvedEngin?.code || firstRowDest,
      perforateur: resolvedPerfo?.code || '',
      category: 'FAST_GRID',
      service: metaService || 'TERRAIN_MAGASIN',
      motif: `SAISIE MASSIVE EXCEL GRID: ${metaGlobalNotes || 'Usage standard'}`,
      notes: globalNotes,
      status: 'VALIDE',
      items: itemsList
    };

    try {
      await addMouvement(newMouvement);
      toast.success("VALIDATION GLOBALE RÉUSSIE ! Mouvements enregistrés avec succès.");
      
      // Reset Saisie table
      setGridRows(Array.from({ length: 5 }, () => ({
        id: generateId(),
        reference: '',
        designation: '',
        quantity: '',
        destination: '',
        observation: '',
      })));
      setMetaBeneficiaire('');
      setMetaFournisseur('');
      setMetaBLCode('');
      setMetaMecanicien('');
      setMetaMachine('');
      setMetaService('');
      setMetaGlobalNotes('');
      setActivePane('DASHBOARD');
    } catch (err) {
      console.error(err);
      toast.error("Une erreur s'est produite pendant l'enregistrement.");
    }
  };

  const { 
    totalArticles, 
    stockValue, 
    lowStockCount, 
    valueAtRisk, 
    spendToday,
    chartData,
    abcChartData,
    machineChartData,
    consumedArticlesData,
    currentMonthStats,
    compareData
  } = useMemo(() => {
    const siteArticles = articles.filter(a => a.site === site);
    const siteMouvements = mouvements.filter(m => m.site === site);

    // KPIs
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    const totalArticles = siteArticles.length;
    const stockValue = siteArticles.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.price || 0)), 0);
    const lowStockCount = siteArticles.filter(a => (a.quantity || 0) <= (a.minStock || 0)).length;
    
    const valueAtRisk = siteArticles
      .filter(a => (a.quantity || 0) <= (a.minStock || 0))
      .reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.price || 0)), 0);

    const today = new Date().toISOString().split('T')[0];
    const spendToday = siteMouvements
      .filter(m => m.date.startsWith(today) && m.type === 'SORTIE')
      .reduce((acc, m) => acc + m.items.reduce((sum, item) => sum + (item.quantity * item.price), 0), 0);

    // Chart 1: Spend over time
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const chartData = months.slice(0, new Date().getMonth() + 1).map((m, i) => ({
      name: m,
      value: siteMouvements
        .filter(mov => {
          const d = new Date(mov.date);
          return mov.type === 'SORTIE' && d.getMonth() === i && d.getFullYear() === currentYear;
        })
        .reduce((acc, mov) => acc + mov.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0), 0)
    }));

    // Pareto Analysis (ABC)
    const sortedByValue = [...siteArticles].sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price));
    const cumulativeValue = sortedByValue.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
    
    let currentSum = 0;
    const abcData = sortedByValue.reduce((acc, art) => {
      currentSum += (art.quantity * art.price);
      const percent = cumulativeValue > 0 ? (currentSum / cumulativeValue) * 100 : 0;
      if (percent <= 70) acc.A++;
      else if (percent <= 90) acc.B++;
      else acc.C++;
      return acc;
    }, { A: 0, B: 0, C: 0 });

    const abcChartData = [
      { name: 'Classe A (Stratégique)', value: abcData.A, color: '#0ea5e9' },
      { name: 'Classe B (Tactique)', value: abcData.B, color: '#10b981' },
      { name: 'Classe C (Standard)', value: abcData.C, color: '#f59e0b' },
    ];

    // Advanced Analysis
    const spendByMachine = siteMouvements
      .filter(m => m.type === 'SORTIE' && (m.engin || m.perforateur))
      .reduce((acc, m) => {
        const machine = m.engin || m.perforateur || 'Inconnu';
        const spend = m.items.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);
        acc[machine] = (acc[machine] || 0) + spend;
        return acc;
      }, {} as Record<string, number>);

    const machineChartData = Object.entries(spendByMachine)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topConsumedArticles = siteMouvements
      .filter(m => m.type === 'SORTIE')
      .reduce((acc, m) => {
        m.items.forEach(item => {
          const art = articles.find(a => a.id === item.articleId);
          if (art) {
            const key = art.designation;
            acc[key] = (acc[key] || 0) + (item.quantity * (item.price || 0));
          }
        });
        return acc;
      }, {} as Record<string, number>);

    const consumedArticlesData = Object.entries(topConsumedArticles)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Month stats
    const prevMonthIdx = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1;
    const prevMonthYear = currentMonthIdx === 0 ? currentYear - 1 : currentYear;

    const getMonthStats = (mIdx: number, year: number) => {
      const periodMouvements = siteMouvements.filter(m => {
        const d = new Date(m.date);
        return d.getMonth() === mIdx && d.getFullYear() === year;
      });

      const entrees = periodMouvements
        .filter(m => m.type === 'ENTREE' || m.type === 'TRANSFERT_IN')
        .reduce((sum, m) => sum + m.items.reduce((iSum, item) => iSum + (item.quantity * item.price), 0), 0);
        
      const sorties = periodMouvements
        .filter(m => m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT')
        .reduce((sum, m) => sum + m.items.reduce((iSum, item) => iSum + (item.quantity * item.price), 0), 0);

      return { entrees, sorties };
    };

    const currentMonthStats = getMonthStats(currentMonthIdx, currentYear);
    const prevMonthStats = getMonthStats(prevMonthIdx, prevMonthYear);

    const monthNamesShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    const compareData = [
      { name: monthNamesShort[prevMonthIdx], Entrées: prevMonthStats.entrees, Sorties: prevMonthStats.sorties },
      { name: monthNamesShort[currentMonthIdx], Entrées: currentMonthStats.entrees, Sorties: currentMonthStats.sorties }
    ];

    return { 
      totalArticles, 
      stockValue, 
      lowStockCount, 
      valueAtRisk, 
      spendToday,
      chartData,
      abcChartData,
      machineChartData,
      consumedArticlesData,
      currentMonthStats,
      compareData
    };
  }, [articles, mouvements, site]);

  // 3. Multi-field fuzzy search engine
  const instantSearchResults = useMemo(() => {
    if (!instantSearchQuery) return [];
    const q = instantSearchQuery.toLowerCase().trim();
    
    return articles.filter(a => {
      if (a.site !== site) return false;
      
      const inRef = a.ref.toLowerCase().includes(q);
      const inDesignation = a.designation.toLowerCase().includes(q);
      const inType = a.type?.toLowerCase().includes(q);
      
      // Look up movements matching typed vendor or destination or notes of the article
      const itemMovements = mouvements.filter(m => m.site === site && m.items.some(i => i.articleId === a.id));
      const inVendor = itemMovements.some(m => m.vendeur?.toLowerCase().includes(q));
      const inMachine = itemMovements.some(m => (m.engin?.toLowerCase().includes(q) || m.perforateur?.toLowerCase().includes(q)));
      const inHistory = itemMovements.some(m => (
        m.reference?.toLowerCase().includes(q) ||
        m.demandeur?.toLowerCase().includes(q) ||
        m.beneficiaire?.toLowerCase().includes(q) ||
        m.mecanicien?.toLowerCase().includes(q) ||
        m.motif?.toLowerCase().includes(q)
      ));
      
      // Light fuzzy matching score (80% similarity parameter)
      const isFuzzy = q.length >= 3 && (
        a.ref.toLowerCase().includes(q) || 
        a.designation.toLowerCase().includes(q)
      );

      return inRef || inDesignation || inType || inVendor || inMachine || inHistory || isFuzzy;
    }).slice(0, 15);
  }, [instantSearchQuery, articles, mouvements, site]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchHighlightIdx(prev => Math.min(prev + 1, instantSearchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (instantSearchResults[searchHighlightIdx]) {
        onArticleClick?.(instantSearchResults[searchHighlightIdx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setInstantSearchQuery('');
      searchInputRef.current?.blur();
    }
  };

  const stockHealthPercent = totalArticles > 0 ? Math.round(((totalArticles - lowStockCount) / totalArticles) * 100) : 100;
  
  const lowStockItems = React.useMemo(() => 
    articles.filter(a => a.site === site && a.quantity <= a.minStock).slice(0, 5),
  [articles, site]);

  const recentMovements = React.useMemo(() => 
    mouvements.filter(m => m.site === site).slice(0, 8),
  [mouvements, site]);

  const stats = [
    { label: 'Valeur Immobilisée', value: formatCurrency(stockValue), icon: DollarSign, color: 'text-sky-600', bg: 'bg-sky-50', alert: false },
    { label: 'Indice de Santé', value: '88/100', icon: ShieldIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', alert: false },
    ...(isAdmin ? [
      { label: 'Audit FBI', value: 'Lancer', icon: Fingerprint, color: 'text-rose-600', bg: 'bg-rose-50', action: 'AI_FRAUD', alert: false },
      { label: 'Rapport Hebdo', value: 'Prêt', icon: Calendar, color: 'text-sky-600', bg: 'bg-sky-50', action: 'AI_REPORTS', alert: false },
      { label: 'IA Achats', value: 'Optimiser', icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50', action: 'AI_PROCUREMENT', alert: false },
    ] : [])
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-1 bg-sky-100 text-sky-700 text-xs font-black uppercase tracking-widest rounded-md border border-sky-200">v2.0 Sync</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' })}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">ESPACE MAGASINIER</h2>
          <p className="text-sm md:text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-3 opacity-70">Tableau de commande & Surveillance active - Site {site}</p>
        </div>
        
        <div className="flex items-center gap-4 hidden md:flex">
          <div className="p-2 bg-white/80 backdrop-blur-md rounded-xl border border-slate-100 shadow-md flex items-center gap-3 ring-1 ring-slate-900/5">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Réseau</p>
              <p className="text-sm font-black text-emerald-600 uppercase mt-0.5 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* COCKPIT COMPACT PANEL SWITCHER */}
      <div className="flex border-b border-slate-200 gap-1.5 pb-2 no-print">
        <button
          onClick={() => setActivePane('DASHBOARD')}
          className={cn(
            "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
            activePane === 'DASHBOARD'
              ? "bg-slate-950 text-white shadow"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          )}
        >
          📊 Supervision Active
        </button>
        <button
          onClick={() => {
            setActivePane('SAISIE');
            // Re-populate with blank rows if empty
            if (gridRows.length === 0 || (gridRows.length === 5 && gridRows.every(r => r.reference === ''))) {
              setGridRows(Array.from({ length: 5 }, () => ({
                id: generateId(),
                reference: '',
                designation: '',
                quantity: '',
                destination: '',
                observation: '',
              })));
            }
          }}
          className={cn(
            "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2",
            activePane === 'SAISIE'
              ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          )}
        >
          ⌨️ Saisie Massive Excel Grid
        </button>
      </div>

      {/* RECHERCHE ULTRA RAPIDE BAR */}
      <div className="relative group no-print">
        <div className="absolute inset-0 bg-sky-500/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 relative z-10" />
        <input 
          id="espace-magasinier-instant-search"
          ref={searchInputRef}
          type="text" 
          placeholder="RECHERCHE INSTANTANÉE (RÉFÉRENCE, ARTICLE, MACHINE, FOURNISSEUR, LOGS...) — PRESSER [/] OU [CTRL+K] POUR FILTRER..." 
          className="input-field h-12 pl-12 text-sm font-black tracking-tight bg-white border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 rounded-xl relative z-10 transition-all uppercase placeholder:text-slate-400"
          value={instantSearchQuery}
          onChange={(e) => { setInstantSearchQuery(e.target.value); setSearchHighlightIdx(0); }}
          onKeyDown={handleSearchKeyDown}
        />
        {instantSearchQuery && (
          <button 
            type="button"
            onClick={() => setInstantSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-[10px] bg-slate-150 hover:bg-slate-200 border border-slate-250 px-2 py-1 rounded font-black text-slate-500 uppercase tracking-widest"
          >
            Vider
          </button>
        )}
      </div>

      {/* 1. INSTANT SEARCH CONSOLE OVERLAY */}
      {instantSearchQuery && (
        <div className="card glass p-4 border border-slate-150 shadow-xl bg-white space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">RÉSULTATS DE RECHERCHE ULTRA RAPIDE (SAP-STYLE)</p>
              <h3 className="text-sm font-black text-slate-900 mt-1 uppercase tracking-tight">
                {instantSearchResults.length} article(s) trouvé(s) pour "{instantSearchQuery}"
              </h3>
            </div>
            <button 
              onClick={() => setInstantSearchQuery('')}
              className="text-[10px] font-black text-rose-600 hover:bg-rose-50 border border-rose-200 px-2 py-1 rounded uppercase tracking-wider"
            >
              Fermer [ESC]
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-2.5 px-3">Référence SKU</th>
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3">Catégorie</th>
                  <th className="py-2.5 px-3 text-right">Stock Disponible</th>
                  <th className="py-2.5 px-3 text-right">Prix Unit (MAD)</th>
                  <th className="py-2.5 px-3">Dernière Activité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {instantSearchResults.map((art, idx) => {
                  const isHighlighted = idx === searchHighlightIdx;
                  const artMoves = mouvements.filter(m => m.site === site && m.items.some(i => i.articleId === art.id));
                  const lastMove = artMoves[0];
                  
                  return (
                    <tr 
                      key={art.id}
                      onClick={() => {
                        onArticleClick?.(art);
                        setInstantSearchQuery('');
                      }}
                      className={cn(
                        "group cursor-pointer transition-colors text-xs font-semibold",
                        isHighlighted ? "bg-sky-50 text-sky-950 font-bold border-l-4 border-sky-600" : "hover:bg-slate-50/40"
                      )}
                    >
                      <td className="py-2 px-3 font-bold font-mono text-slate-900 group-hover:text-sky-700">{art.ref}</td>
                      <td className="py-2 px-3 tracking-tight uppercase">{art.designation}</td>
                      <td className="py-2 px-3 text-[10px] font-black uppercase text-slate-500">{art.type}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-black",
                          art.quantity > art.minStock ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                        )}>
                          {art.quantity} {art.unit || 'unit'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-black font-mono text-slate-800">{formatCurrency(art.price)}</td>
                      <td className="py-2 px-3 text-[11px] font-black text-slate-400 truncate max-w-[200px]">
                        {lastMove ? (
                          <span className={cn(lastMove.type === 'ENTREE' ? "text-emerald-600" : "text-rose-600")}>
                            {lastMove.type === 'ENTREE' ? 'Réception' : 'Sortie'} • {new Date(lastMove.date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' })}
                          </span>
                        ) : 'Aucun mouvement'}
                      </td>
                    </tr>
                  );
                })}
                {instantSearchResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-bold uppercase tracking-wider">
                      Aucun article found pour "{instantSearchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 flex justify-between items-center text-[10px] font-black text-slate-400 tracking-wider">
            <span>💡 NAVIGATION CLAVIER COMPLETE: PILOTEZ LE SELECTIONNEUR AVEC FLÈCHES HAUT / BAS, APPUYEZ SUR ENTRÉE POUR OUVRIR</span>
            <span>PRESSER "ESC" POUR FERMER</span>
          </div>
        </div>
      )}

      {/* 2. SAISIE MASSIVE EXCEL GRID PANEL */}
      {activePane === 'SAISIE' && !instantSearchQuery && (
        <div className="card glass p-4 border border-slate-150 shadow-xl bg-white space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-100 pb-3 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-black uppercase tracking-wider rounded">Saisie Massive v2.0</span>
                <span className="text-slate-300">|</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Workspace Magasinier {site}</span>
              </div>
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight mt-1 flex items-center gap-2">
                Saisie de Mouvements Multi-lignes
              </h3>
            </div>
            <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button 
                onClick={() => { setGridType('SORTIE'); setGridRows(Array.from({ length: 5 }, () => ({ id: generateId(), reference: '', designation: '', quantity: '', destination: '', observation: '' }))); }}
                className={cn(
                  "px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-md transition-all",
                  gridType === 'SORTIE' ? "bg-rose-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                🔴 Bon de Sortie
              </button>
              <button 
                onClick={() => { setGridType('ENTREE'); setGridRows(Array.from({ length: 5 }, () => ({ id: generateId(), reference: '', designation: '', quantity: '', destination: '', observation: '' }))); }}
                className={cn(
                  "px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-md transition-all",
                  gridType === 'ENTREE' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                🟢 Bon d'Entrée (Réception)
              </button>
            </div>
          </div>

          {/* META GENERAL METADATA FIELDS */}
          <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {gridType === 'SORTIE' ? (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">BÉNÉFICIAIRE / DEMANDEUR *</label>
                  <input 
                    type="text" 
                    className="w-full h-8 bg-white border border-slate-200 rounded-lg text-xs font-bold px-2.5 uppercase text-slate-900 focus:border-sky-500 outline-none" 
                    placeholder="BÉNÉFICIAIRE..." 
                    value={metaBeneficiaire} 
                    onChange={(e) => setMetaBeneficiaire(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SERVICE CONCERNÉ</label>
                  <input 
                    type="text" 
                    className="w-full h-8 bg-white border border-slate-200 rounded-lg text-xs font-bold px-2.5 uppercase text-slate-900 focus:border-sky-500 outline-none" 
                    placeholder="SERVICES (EX: SURFACE, TRAIN...)" 
                    value={metaService} 
                    onChange={(e) => setMetaService(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">MACHINE PRINCIPALE (FILTRE OPTIONNEL)</label>
                  <select 
                    className="w-full h-8 bg-white border border-slate-200 rounded-lg text-xs font-bold px-2.5 text-slate-900 focus:border-sky-500 outline-none"
                    value={metaMachine} 
                    onChange={(e) => setMetaMachine(e.target.value)}
                  >
                    <option value="">SÉLECTIONNER OPTIONNELLE...</option>
                    {[...engins.filter(e => e.site === site), ...perfos.filter(p => p.site === site)].map(item => (
                      <option key={item.id} value={item.id}>{item.code}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">NOM INTERVENANT / MÉCANICIEN</label>
                  <select 
                    className="w-full h-8 bg-white border border-slate-200 rounded-lg text-xs font-bold px-2.5 text-slate-900 focus:border-sky-500 outline-none"
                    value={metaMecanicien}
                    onChange={(e) => setMetaMecanicien(e.target.value)}
                  >
                    <option value="">AUTRE / OPÉRATEUR SANS NOM...</option>
                    {agents.filter(a => a.site === site).map(a => (
                      <option key={a.id} value={`${a.lastname} ${a.firstname}`}>{a.lastname} {a.firstname}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1 md:col-span-1 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ORIGINE / FOURNISSEUR *</label>
                  <input 
                    type="text" 
                    className="w-full h-8 bg-white border border-slate-200 rounded-lg text-xs font-bold px-2.5 uppercase text-slate-900 focus:border-sky-500 outline-none" 
                    placeholder="NOM FOURNISSEUR" 
                    value={metaFournisseur} 
                    onChange={(e) => setMetaFournisseur(e.target.value)} 
                  />
                </div>
                <div className="space-y-1 md:col-span-1 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">N° BON DE LIVRAISON (BL / COMPTES CO) *</label>
                  <input 
                    type="text" 
                    className="w-full h-8 bg-white border border-slate-200 rounded-lg text-xs font-bold px-2.5 uppercase text-slate-900 focus:border-sky-500 outline-none" 
                    placeholder="BL-202X-YYY" 
                    value={metaBLCode} 
                    onChange={(e) => setMetaBLCode(e.target.value)} 
                  />
                </div>
              </>
            )}
            <div className="space-y-1 md:col-span-2 lg:col-span-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">JUSTIFICATION / NOTES TECHNIQUES DU BATCH</label>
              <textarea 
                className="w-full h-10 p-2 text-xs font-medium leading-relaxed bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-500" 
                placeholder="Notes techniques communes aux articles ci-dessous..." 
                value={metaGlobalNotes} 
                onChange={(e) => setMetaGlobalNotes(e.target.value)} 
              />
            </div>
          </div>

          {/* EXCEL GRID TABLE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-250 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="py-2 px-3 w-10 text-center">N°</th>
                    <th className="py-2 px-3 w-40">Référence SKU *</th>
                    <th className="py-2 px-3">Désignation</th>
                    <th className="py-2 px-3 w-28 text-right">Quantité *</th>
                    <th className="py-2 px-3 w-40">{gridType === 'SORTIE' ? 'Machine / Destin.' : 'Emplacement'}</th>
                    <th className="py-2 px-3">Observation terrain</th>
                    <th className="py-2 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {gridRows.map((row, rIdx) => {
                    return (
                      <tr 
                        key={row.id} 
                        className={cn(
                          "transition-colors group",
                          row.error ? "bg-rose-50/40 hover:bg-rose-50/60" : "hover:bg-slate-50/30"
                        )}
                      >
                        <td className="py-1 px-3 text-center text-[10px] font-black text-slate-400 font-mono select-none">
                          {rIdx + 1}
                        </td>
                        <td className="py-1 px-1.5 focus-within:bg-orange-50/20 transition-colors">
                          <input
                            ref={(el) => { inputRefs.current[`${rIdx}-reference`] = el; }}
                            type="text"
                            className="w-full h-8 bg-transparent text-xs font-bold font-mono text-slate-900 outline-none border-0 focus:ring-0 focus:border-0 uppercase px-1.5"
                            placeholder="EX: VAL-10"
                            value={row.reference}
                            onChange={(e) => handleCellChange(rIdx, 'reference', e.target.value)}
                            onKeyDown={(e) => handleGridKeyDown(e, rIdx, 'reference')}
                            onPaste={(e) => handleGridPaste(e, rIdx, 'reference')}
                          />
                        </td>
                        <td className="py-1 px-3">
                          <div className="flex items-center gap-2">
                            {row.isValid && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                            <input
                              type="text"
                              readOnly
                              tabIndex={-1}
                              className="w-full h-8 bg-transparent text-xs font-bold text-slate-500 outline-none truncate border-none select-none uppercase"
                              placeholder="Désignation automatique..."
                              value={row.designation}
                            />
                          </div>
                        </td>
                        <td className="py-1 px-1.5 focus-within:bg-orange-50/20 transition-colors">
                          <input
                            ref={(el) => { inputRefs.current[`${rIdx}-quantity`] = el; }}
                            type="text"
                            className="w-full h-8 bg-transparent text-xs font-mono font-bold text-slate-900 text-right outline-none border-0 focus:ring-0 focus:border-0 px-1.5"
                            placeholder="UNITÉS"
                            value={row.quantity}
                            onChange={(e) => handleCellChange(rIdx, 'quantity', e.target.value)}
                            onKeyDown={(e) => handleGridKeyDown(e, rIdx, 'quantity')}
                          />
                        </td>
                        <td className="py-1 px-1.5 focus-within:bg-orange-50/20 transition-colors">
                          <input
                            ref={(el) => { inputRefs.current[`${rIdx}-destination`] = el; }}
                            type="text"
                            className="w-full h-8 bg-transparent text-xs font-bold text-slate-900 outline-none border-0 focus:ring-0 focus:border-0 uppercase px-1.5"
                            placeholder={gridType === 'SORTIE' ? "D7 / PERFO" : "SITE A1"}
                            value={row.destination}
                            onChange={(e) => handleCellChange(rIdx, 'destination', e.target.value)}
                            onKeyDown={(e) => handleGridKeyDown(e, rIdx, 'destination')}
                          />
                        </td>
                        <td className="py-1 px-1.5 focus-within:bg-orange-50/20 transition-colors">
                          <input
                            ref={(el) => { inputRefs.current[`${rIdx}-observation`] = el; }}
                            type="text"
                            className="w-full h-8 bg-transparent text-xs font-semibold text-slate-900 outline-none border-0 focus:ring-0 focus:border-0 px-1.5"
                            placeholder="Observation..."
                            value={row.observation}
                            onChange={(e) => handleCellChange(rIdx, 'observation', e.target.value)}
                            onKeyDown={(e) => handleGridKeyDown(e, rIdx, 'observation')}
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button 
                            type="button" 
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* LOWER STATS AND WARNINGS IN THE ROWS */}
            <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 flex flex-wrap gap-x-6 gap-y-1 text-[10px] font-black text-slate-500 uppercase tracking-wide">
              <span>TAB = CELLULE SUIVANTE</span>
              <span>ENTER = AJOUT DE LIGNE DYNAMIQUE</span>
              <span className="text-sky-600">🏆 EXCEL COPIER-COLLER: COLLER DIRECTEMENT DANS UNE CELLULE RÉFÉRENCE</span>
            </div>
          </div>

          {/* REAL TIME CELL ERROR CONSOLE (DISCREET) */}
          {gridRows.some(r => r.error) && (
            <div className="p-2.5 bg-rose-50 text-rose-800 rounded-lg text-xs font-bold border border-rose-150 animate-pulse flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Alertes de validation : {
                  gridRows.filter(r => r.error).map(r => `[${r.reference || 'Réf'}]: ${r.error}`).slice(0, 3).join(' • ')
                }
              </span>
            </div>
          )}

          {/* SUBMISSION BAR */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-slate-100 gap-4">
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={handleAddBlankRow}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-black uppercase text-[10px] tracking-wider text-slate-600 rounded-lg transition-all"
              >
                + Nouvelle Ligne
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setGridRows(Array.from({ length: 5 }, () => ({
                    id: generateId(),
                    reference: '',
                    designation: '',
                    quantity: '',
                    destination: '',
                    observation: '',
                  })));
                }}
                className="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-rose-650 border border-transparent hover:border-slate-100 rounded-lg transition-all uppercase"
              >
                Vider la Grille
              </button>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                type="button"
                onClick={() => setActivePane('DASHBOARD')}
                className="flex-1 sm:flex-none px-6 py-2 border border-slate-200 hover:bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-700 rounded-lg"
              >
                Annuler
              </button>
              <button 
                type="button" 
                onClick={handleGlobalValidation}
                className="flex-1 sm:flex-none px-8 py-2.5 bg-sky-600 hover:bg-sky-700 font-black uppercase text-xs tracking-widest text-white rounded-lg shadow-lg hover:shadow-sky-500/10 transition-all select-none"
              >
                🚨 VALIDATION GLOBALE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. NORMAL VISUAL COCKPIT/DASHBOARD */}
      {activePane === 'DASHBOARD' && !instantSearchQuery && (
        <>
          {/* Quick Action Hub */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print row-dense">
            {[
              { icon: ArrowDownLeft, label: 'Réception', color: 'emerald', page: 'BON_ENTREE' },
              { icon: ArrowUpRight, label: 'Sortie', color: 'rose', page: 'BON_SORTIE' },
              { icon: Truck, label: 'Transfert', color: 'sky', page: 'TRANSFERT' },
            ].map(action => (
              <button 
                key={action.page}
                onClick={() => onAction(action.page)}
                className={cn(
                  "group relative overflow-hidden card glass p-4 flex flex-col items-start gap-2 transition-all duration-500",
                  action.color === 'emerald' ? "hover:border-emerald-200" : action.color === 'rose' ? "hover:border-rose-200" : "hover:border-sky-200"
                )}
              >
                <div className={cn(
                  "absolute top-0 right-0 w-16 h-16 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700 opacity-5",
                   action.color === 'emerald' ? "bg-emerald-500" : action.color === 'rose' ? "bg-rose-500" : "bg-sky-500"
                )} />
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform",
                   action.color === 'emerald' ? "bg-emerald-100 text-emerald-600" : action.color === 'rose' ? "bg-rose-100 text-rose-600" : "bg-sky-100 text-sky-600"
                )}>
                   <action.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">{action.label}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 opacity-60">Action Rapide</p>
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div 
                key={stat.label} 
                onClick={() => {
                  if (stat.label === 'Ruptures Stock') onAction('RESTOCK_MGMT');
                  if (stat.action === 'AI_COMPLIANCE') onAction({ page: 'COCKPIT', tab: 'COMPLIANCE' });
                  if (stat.action === 'AI_FRAUD') onAction({ page: 'COCKPIT', tab: 'FRAUD' });
                  if (stat.action === 'AI_REPORTS') onAction({ page: 'COCKPIT', tab: 'REPORT_CENTER' });
                  if (stat.action === 'AI_PROCUREMENT') onAction({ page: 'COCKPIT', tab: 'PROCUREMENT' });
                  if (stat.action === 'AI_VISION') onAction({ page: 'COCKPIT', tab: 'VISION' });
                }}
                className={cn(
                  "card glass p-8 rounded-3xl border-l-[6px] border-slate-100 transition-all duration-300 hover:translate-y-[-4px] h-full",
                  stat.alert ? "border-rose-500 bg-rose-50/20 cursor-pointer shadow-md shadow-rose-100/50" : 
                  stat.action ? "border-indigo-500 bg-indigo-50/20 cursor-pointer hover:shadow-indigo-100/50" : "shadow-sm"
                )}
              >
                <div className="flex items-center justify-between mb-4 font-black">
                  <div className={cn("p-2 rounded-xl", stat.bg, stat.color)}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-lg font-black text-slate-400 uppercase tracking-tighter leading-none opacity-70 mb-2">{stat.label}</p>
                <p className={cn("text-5xl font-black tracking-tighter leading-none", stat.alert ? "text-rose-600" : "text-slate-900")}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-4">
              <div className="card glass p-6 shadow-xl">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-sky-600" /> Flux de Consommation
                </h3>
                <div className="h-[350px] min-h-[350px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={350} minWidth={0} debounce={50}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={12} fontWeight="900" axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} fontWeight="900" axisLine={false} tickLine={false} tickFormatter={(value) => `${value/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', padding: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: '900', fontSize: '12px' }}
                        labelStyle={{ fontWeight: '900', fontSize: '13px', marginBottom: '4px' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card glass p-8 shadow-xl">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <Truck className="w-6 h-6 text-amber-600" /> Coût par Engin
                  </h3>
                  <div className="h-[200px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0} debounce={50}>
                      <BarChart data={machineChartData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} fontSize={10} fontWeight="900" />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', padding: '8px', fontWeight: '900' }} />
                        <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card glass p-8 shadow-xl">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <Package className="w-6 h-6 text-indigo-600" /> Top Consommation
                  </h3>
                  <div className="h-[200px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0} debounce={50}>
                      <BarChart data={consumedArticlesData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} fontSize={10} fontWeight="900" />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', padding: '8px', fontWeight: '900' }} />
                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card glass p-8 shadow-xl">
                  <div className="flex items-center justify-between mb-6 border-b border-transparent">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                      <ArrowRightLeft className="w-6 h-6 text-sky-600" /> Performance
                    </h3>
                  </div>
                  
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-inner">
                      <p className="text-xs font-black text-emerald-600 uppercase tracking-widest leading-none">Entrées</p>
                      <p className="text-lg font-black text-slate-900 mt-2">{formatCurrency(currentMonthStats.entrees)}</p>
                    </div>
                    <div className="flex-1 bg-rose-50 p-4 rounded-2xl border border-rose-100 shadow-inner">
                      <p className="text-xs font-black text-rose-600 uppercase tracking-widest leading-none">Sorties</p>
                      <p className="text-lg font-black text-slate-900 mt-2">{formatCurrency(currentMonthStats.sorties)}</p>
                    </div>
                  </div>

                  <div className="h-[200px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0} debounce={50}>
                      <BarChart data={compareData} margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tickFormatter={(value) => `${value/1000}k`} />
                        <Tooltip contentStyle={{ borderRadius: '12px', padding: '8px', fontWeight: '900', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '10px' }} />
                        <Bar dataKey="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Sorties" fill="#b91c1c" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card glass p-8 shadow-xl">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <PieIcon className="w-6 h-6 text-emerald-600" /> Répartition ABC
                  </h3>
                  <div className="h-[180px] min-h-[180px]">
                     <ResponsiveContainer width="100%" height="100%" minHeight={180} minWidth={0} debounce={50}>
                       <PieChart>
                         <Pie
                           data={abcChartData}
                           innerRadius={50}
                           outerRadius={70}
                           paddingAngle={6}
                           dataKey="value"
                         >
                           {abcChartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                         </Pie>
                         <Tooltip />
                       </PieChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    {abcChartData.map(item => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-400 uppercase">{item.name}</span>
                        <span className="text-lg font-black text-slate-900">{item.value} Réf</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 card glass p-6 flex flex-col h-full bg-slate-900/5 backdrop-blur-3xl border-slate-200/50 shadow-xl overflow-hidden self-stretch">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-sky-600" /> Flux Live
              </h3>
              <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {recentMovements.length > 0 ? recentMovements.map((mov) => {
                  const total = mov.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                  return (
                    <div 
                      key={mov.id} 
                      onClick={() => {
                        const firstItem = mov.items[0];
                        if (firstItem) {
                          const article = articles.find(a => a.id === firstItem.articleId);
                          if (article) onArticleClick?.(article);
                        }
                      }}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-white transition-all border border-transparent hover:border-slate-100 group shadow-none hover:shadow-lg cursor-pointer"
                    >
                      <div className={cn(
                        "p-2.5 rounded-lg flex-shrink-0 transition-transform group-hover:scale-110 shadow-md",
                        mov.type === 'ENTREE' ? "bg-emerald-500 text-white" : "bg-rose-800 text-white"
                      )}>
                        {mov.type === 'ENTREE' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900 uppercase truncate leading-tight">
                          {mov.type === 'ENTREE' ? mov.vendeur : mov.demandeur}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest leading-none opacity-70">
                          {mov.items.length} Réf • {formatCurrency(total)}
                        </p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-6">
                    <p className="text-[10px] font-black uppercase tracking-widest">Aucun flux récent</p>
                  </div>
                )}
              </div>
              <button 
                 onClick={() => onAction('AUDIT_LOG')}
                 className="mt-4 w-full py-3 bg-slate-950 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                Inspecteur Auditeur
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
