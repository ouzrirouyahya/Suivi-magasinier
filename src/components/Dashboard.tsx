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
    addMouvement,
    setEngin,
    setPerfo
  } = useInventory();

  // Mode Selection State
  const [activePane, setActivePane] = useState<'DASHBOARD' | 'SAISIE' | 'PARC'>('DASHBOARD');
  const [dashboardViewMode, setDashboardViewMode] = useState<'OPERATIONAL' | 'ANALYTICAL'>('OPERATIONAL');

  // Single Item Saisie Express states
  const [singleType, setSingleType] = useState<'ENTREE' | 'SORTIE'>('SORTIE');
  const [singleArticleId, setSingleArticleId] = useState('');
  const [singleQty, setSingleQty] = useState<number>(1);
  const [singleBeneficiaire, setSingleBeneficiaire] = useState('');
  const [singleFournisseur, setSingleFournisseur] = useState('');
  const [singleBL, setSingleBL] = useState('');
  const [singleMecanicien, setSingleMecanicien] = useState('');
  const [singleMachine, setSingleMachine] = useState('');
  const [singleMotif, setSingleMotif] = useState('');
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

  // Live Flux Active Tab Filter
  const [liveFluxFilter, setLiveFluxFilter] = useState<'ALL' | 'ENTREE' | 'SORTIE' | 'TRANSFERT'>('ALL');
  const [liveFluxSearchText, setLiveFluxSearchText] = useState('');
  const [selectedFluxMovement, setSelectedFluxMovement] = useState<any | null>(null);
  const [selectedTopCat, setSelectedTopCat] = useState<'ENGINS' | 'PERFORATEURS' | 'CONSOMMABLES' | 'EPI'>('ENGINS');

  // Instant Search Section States
  const [instantSearchQuery, setInstantSearchQuery] = useState('');
  const [searchHighlightIdx, setSearchHighlightIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Parc Management Form States
  const [parcCategory, setParcCategory] = useState<'ENGIN' | 'PERFO'>('ENGIN');
  const [parcCode, setParcCode] = useState('');
  const [parcLabel, setParcLabel] = useState('');
  const [parcType, setParcType] = useState<'PELLE' | 'DUMPER' | 'VEHICULE' | 'AUTRE'>('PELLE');
  const [parcFormSuccess, setParcFormSuccess] = useState('');

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

  const handleSingleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleArticleId) {
      toast.error("Veuillez sélectionner un article.");
      return;
    }
    const matchedArt = articles.filter(a => a.site === site).find(a => a.id === singleArticleId);
    if (!matchedArt) {
      toast.error("Article introuvable.");
      return;
    }
    const qNum = Number(singleQty);
    if (isNaN(qNum) || qNum <= 0) {
      toast.error("Quantité invalide.");
      return;
    }
    if (singleType === 'SORTIE') {
      if (qNum > matchedArt.quantity) {
        toast.error(`Stock insuffisant. Quantité maximale disponible : ${matchedArt.quantity}`);
        return;
      }
      if (!singleBeneficiaire.trim()) {
        toast.error("Veuillez indiquer le demandeur/bénéficiaire.");
        return;
      }
    } else {
      if (!singleFournisseur.trim()) {
        toast.error("Veuillez indiquer le fournisseur.");
        return;
      }
      if (!singleBL.trim()) {
        toast.error("Veuillez indiquer le code document (BL/Manifest).");
        return;
      }
    }

    setIsSubmittingSingle(true);
    try {
      const itemsList: MouvementItem[] = [{
        articleId: matchedArt.id,
        quantity: qNum,
        price: matchedArt.price || 0
      }];

      const prefix = singleType === 'ENTREE' ? 'BE' : 'BS';
      const autoDocId = `${prefix}/${site}/${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      const resolvedMachine = [...engins, ...perfos].find(m => m.id === singleMachine);

      const newMouvement: Mouvement = {
        id: generateId(),
        site,
        date: new Date().toISOString(),
        type: singleType,
        reference: singleType === 'ENTREE' ? singleBL : autoDocId,
        vendeur: singleType === 'ENTREE' ? singleFournisseur : undefined,
        demandeur: singleType === 'SORTIE' ? singleBeneficiaire : undefined,
        beneficiaire: singleType === 'SORTIE' ? singleBeneficiaire : undefined,
        mecanicien: singleMecanicien || 'OPÉRATEUR RECON',
        engin: resolvedMachine?.code || '',
        perforateur: '',
        category: 'FAST_GRID',
        service: 'TERRAIN_MAGASIN',
        motif: singleMotif || 'SAISIE COCKPIT RAPIDE',
        notes: `Opération express - Article : ${matchedArt.designation}`,
        status: 'VALIDE',
        items: itemsList
      };

      await addMouvement(newMouvement);
      toast.success("Mouvement rapide enregistré avec succès !");
      
      // Reset form fields
      setSingleArticleId('');
      setSingleQty(1);
      setSingleBeneficiaire('');
      setSingleFournisseur('');
      setSingleBL('');
      setSingleMecanicien('');
      setSingleMachine('');
      setSingleMotif('');
    } catch (err) {
      console.error(err);
      toast.error("Erreur durant l'enregistrement.");
    } finally {
      setIsSubmittingSingle(false);
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
    compareData,
    lastSortieText,
    lastSortieSub,
    lastEntreeText,
    lastEntreeSub,
    topEnginsData,
    topPerforateursData,
    topConsommablesData,
    topEpiData
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

    // Last movements
    const lastSortie = [...siteMouvements]
      .filter(m => m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const lastEntree = [...siteMouvements]
      .filter(m => m.type === 'ENTREE' || m.type === 'TRANSFERT_IN')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const formatLastMouvementText = (m?: any) => {
      if (!m) return 'Aucun';
      const d = new Date(m.date);
      const dateStr = d.toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit' });
      const priceSum = m.items.reduce((sum: number, it: any) => sum + (it.quantity * (it.price || 0)), 0);
      return `${dateStr} (${formatCurrency(priceSum)})`;
    };

    const formatLastMouvementSub = (m?: any) => {
      if (!m || m.items.length === 0) return 'Aucun flux enregistré';
      const count = m.items.length;
      const originLabel = m.type === 'SORTIE' ? `Dmd: ${m.demandeur || 'Atelier'}` : `Fourn: ${m.vendeur || 'Epiroc'}`;
      return `${count} réf • ${originLabel}`;
    };

    const lastSortieText = formatLastMouvementText(lastSortie);
    const lastSortieSub = formatLastMouvementSub(lastSortie);
    const lastEntreeText = formatLastMouvementText(lastEntree);
    const lastEntreeSub = formatLastMouvementSub(lastEntree);

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

    // Multi-category Top-consumed values
    const getTopConsumedByCategory = (categoryType: string) => {
      const topConsumed = siteMouvements
        .filter(m => m.type === 'SORTIE')
        .reduce((acc, m) => {
          m.items.forEach(item => {
            const art = articles.find(a => a.id === item.articleId);
            if (art) {
              const matchesType = categoryType === 'EPI' 
                ? art.type === 'EPI' 
                : art.type === categoryType;
                
              if (matchesType) {
                const key = art.designation;
                const spendValue = item.quantity * (item.price || art.price || 0);
                acc[key] = (acc[key] || 0) + spendValue;
              }
            }
          });
          return acc;
        }, {} as Record<string, number>);

      return Object.entries(topConsumed)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    };

    const topEnginsData = getTopConsumedByCategory('ENGINS');
    const topPerforateursData = getTopConsumedByCategory('PERFORATEURS');
    const topConsommablesData = getTopConsumedByCategory('CONSOMMABLES');
    const topEpiData = getTopConsumedByCategory('EPI');

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
      compareData,
      lastSortieText,
      lastSortieSub,
      lastEntreeText,
      lastEntreeSub,
      topEnginsData,
      topPerforateursData,
      topConsommablesData,
      topEpiData
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

  const recentMovements = React.useMemo(() => {
    let list = mouvements.filter(m => m.site === site);
    
    // 1. Live tab filter
    if (liveFluxFilter !== 'ALL') {
      list = list.filter(m => {
        if (liveFluxFilter === 'ENTREE') return m.type === 'ENTREE' || m.type === 'TRANSFERT_IN';
        if (liveFluxFilter === 'SORTIE') return m.type === 'SORTIE';
        if (liveFluxFilter === 'TRANSFERT') return m.type === 'TRANSFERT_OUT' || m.type === 'TRANSFERT_IN';
        return true;
      });
    }

    // 2. Live text filter
    if (liveFluxSearchText.trim() !== '') {
      const q = liveFluxSearchText.toLowerCase();
      list = list.filter(m => {
        const machineMatch = (m.engin || '').toLowerCase().includes(q) || (m.perforateur || '').toLowerCase().includes(q);
        const reasonMatch = (m.motif || '').toLowerCase().includes(q);
        const sourceMatch = (m.vendeur || m.demandeur || '').toLowerCase().includes(q);
        const refMatch = m.items.some(it => {
          const art = articles.find(a => a.id === it.articleId);
          if (!art) return false;
          return art.ref.toLowerCase().includes(q) || art.designation.toLowerCase().includes(q);
        });
        return machineMatch || reasonMatch || sourceMatch || refMatch;
      });
    }

    return list.slice(0, 15);
  }, [mouvements, site, liveFluxFilter, liveFluxSearchText]);

  const stats = [
    { 
      label: 'Valeur Immobilisée', 
      value: formatCurrency(stockValue), 
      sub: `${totalArticles} références actives`, 
      icon: DollarSign, 
      color: 'text-sky-600', 
      bg: 'bg-sky-50',
      alert: false 
    },
    { 
      label: 'Dernière Entrée', 
      value: lastEntreeText, 
      sub: lastEntreeSub, 
      icon: ArrowDownLeft, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      alert: false 
    },
    { 
      label: 'Dernière Sortie', 
      value: lastSortieText, 
      sub: lastSortieSub, 
      icon: ArrowUpRight, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50',
      alert: false 
    },
    { 
      label: 'Ruptures Stock Critique', 
      value: `${lowStockCount} Réf`, 
      sub: `En alerte approvisionnement`, 
      icon: AlertCircle, 
      color: lowStockCount > 0 ? 'text-amber-600' : 'text-slate-500', 
      bg: lowStockCount > 0 ? 'bg-amber-50' : 'bg-slate-50', 
      action: 'ALERTES_STOCK', 
      alert: lowStockCount > 0 
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-semibold uppercase tracking-wider rounded-full border border-slate-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">Espace Opérationnel</span>
            <span className="text-slate-200">•</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">{new Date().toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight leading-none">ESPACE MAGASINIER</h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium tracking-tight mt-1.5 opacity-80">Tableau de commande & surveillance active en temps réel — Site {site}</p>
        </div>
        
        <div className="flex items-center gap-4 hidden md:flex">
          <div className="px-3 py-1.5 bg-white rounded-full border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Connexion Live</span>
          </div>
        </div>
      </header>

      {/* RECHERCHE ULTRA RAPIDE BAR */}
      <div className="relative group no-print">
        <div className="absolute inset-0 bg-slate-400/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 relative z-10" />
        <input 
          id="espace-magasinier-instant-search"
          ref={searchInputRef}
          type="text" 
          placeholder="RECHERCHE RAPIDE (RÉFÉRENCE, NOM PIÈCE, MACHINE, FOURNISSEUR, LOGS...) — Saisir [/] pour filtrer" 
          className="w-full h-11 pl-11 pr-20 text-xs font-medium bg-white border border-slate-200 rounded-xl relative z-10 transition-all outline-none placeholder:text-slate-400 focus:border-slate-350 focus:ring-4 focus:ring-slate-50"
          value={instantSearchQuery}
          onChange={(e) => { setInstantSearchQuery(e.target.value); setSearchHighlightIdx(0); }}
          onKeyDown={handleSearchKeyDown}
        />
        {instantSearchQuery ? (
          <button 
            type="button"
            onClick={() => setInstantSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 rounded-md font-semibold text-slate-600 uppercase tracking-wider"
          >
            Vider
          </button>
        ) : (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 pointer-events-none">
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[9px] font-bold text-slate-400">
              <span>Ctrl</span>K
            </kbd>
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[9px] font-bold text-slate-400">
              <span>/</span>
            </kbd>
          </div>
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

      {/* 2.5 PARC ENGINS & PERFORATEURS PANEL */}
      {activePane === 'PARC' && !instantSearchQuery && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-100 p-5 rounded-xl border border-slate-200 gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" /> GESTION OPÉRATIONNELLE DU PARC ÉQUIPEMENTS LOURDS
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">État physique et d'imputation du site {site} (-350m, agressif silices)</p>
            </div>
            <button
              onClick={() => setActivePane('DASHBOARD')}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors shadow-md"
            >
              Retour Tableau de Bord
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: List of existing equipment */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Scooptrams / Engins section */}
              <div className="card glass p-6 shadow-sm border border-slate-200/60">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-500" /> Flotte d'Engins Actifs (Scooptrams / Dumpers)
                  </h4>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-900 text-[9px] font-mono border border-amber-100 rounded">
                    {engins.filter(e => e.site === site).length} actifs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {engins.filter(e => e.site === site).map(eng => (
                    <div key={eng.id} className="p-4 bg-white border border-slate-150 rounded-xl hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider rounded border border-amber-200">
                            {eng.type}
                          </span>
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black rounded uppercase">
                            Opérationnel
                          </span>
                        </div>
                        <h5 className="text-sm font-black text-slate-900 mt-2 uppercase">{eng.code}</h5>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-0.5 leading-snug">{eng.label}</p>
                      </div>
                      
                      <div className="mt-4 pt-2 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase">
                        <span>Mine Souterraine</span>
                        <span className="text-amber-600 font-black">Epiroc Tracked</span>
                      </div>
                    </div>
                  ))}

                  {engins.filter(e => e.site === site).length === 0 && (
                    <div className="col-span-2 text-center py-10 text-slate-400 font-bold text-xs uppercase opacity-70">
                      Aucun Scooptram ou véhicule lourd déclaré pour le point d'imputation {site}.
                    </div>
                  )}
                </div>
              </div>

              {/* Perforateurs section */}
              <div className="card glass p-6 shadow-sm border border-slate-200/60">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-rose-500" /> Marteaux de Perforation COP Systems
                  </h4>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-900 text-[9px] font-mono border border-rose-100 rounded">
                    {perfos.filter(p => p.site === site).length} marteaux
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {perfos.filter(p => p.site === site).map(perf => (
                    <div key={perf.id} className="p-4 bg-white border border-slate-150 rounded-xl hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[8px] font-black uppercase tracking-wider rounded border border-rose-200">
                            MARTEAU DRIL
                          </span>
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black rounded uppercase">
                            Actif Terrain
                          </span>
                        </div>
                        <h5 className="text-sm font-black text-slate-900 mt-2 uppercase">{perf.code}</h5>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-0.5">COP Forage Technique Silices</p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase">
                        <span>Attribution Front</span>
                        <span className="text-rose-600 font-black">Montabert Compatible</span>
                      </div>
                    </div>
                  ))}

                  {perfos.filter(p => p.site === site).length === 0 && (
                    <div className="col-span-2 text-center py-10 text-slate-400 font-bold text-xs uppercase opacity-70">
                      Aucun marteau de perforation déclaré sur le site {site}.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Add equipment form */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xl space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">
                📝 Enregistrer un Matériel au Parc
              </h4>

              {parcFormSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl animate-bounce">
                  {parcFormSuccess}
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!parcCode.trim()) return;
                const newId = generateId();
                if (parcCategory === 'ENGIN') {
                  await setEngin(newId, {
                    id: newId,
                    code: parcCode.toUpperCase().trim(),
                    label: parcLabel.toUpperCase().trim() || 'EQUIPEMENT ENGIN',
                    site,
                    type: parcType
                  });
                  setParcFormSuccess(`L'engin "${parcCode.toUpperCase()}" a été enregistré.`);
                } else {
                  await setPerfo(newId, {
                    id: newId,
                    code: parcCode.toUpperCase().trim(),
                    site
                  });
                  setParcFormSuccess(`Le perforateur "${parcCode.toUpperCase()}" a été enregistré.`);
                }
                setParcCode('');
                setParcLabel('');
                setTimeout(() => setParcFormSuccess(''), 4000);
              }} className="space-y-4">
                
                {/* CATEGORY SELECTOR */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Catégorie D'Équipement</label>
                  <div className="flex bg-slate-105 p-0.5 rounded-lg border border-slate-200 gap-0.5">
                    <button
                      type="button"
                      onClick={() => setParcCategory('ENGIN')}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-black uppercase rounded-md transition-all text-center",
                        parcCategory === 'ENGIN' ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      Scooptram
                    </button>
                    <button
                      type="button"
                      onClick={() => setParcCategory('PERFO')}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-black uppercase rounded-md transition-all text-center",
                        parcCategory === 'PERFO' ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      Perforateur
                    </button>
                  </div>
                </div>

                {/* ID/CODE */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Code / Châssis (Immatriculation) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: EX-ST2G-03, COP1838HD..."
                    value={parcCode}
                    onChange={(e) => setParcCode(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-black text-slate-800 placeholder-slate-400 bg-slate-5e border border-slate-200 rounded-lg outline-none focus:border-amber-500 uppercase"
                  />
                </div>

                {/* Specific features for Scooptrams */}
                {parcCategory === 'ENGIN' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Marque / Modèle descriptif</label>
                      <input
                        type="text"
                        placeholder="Ex: Epiroc Scooptram ST2G, ST2D..."
                        value={parcLabel}
                        onChange={(e) => setParcLabel(e.target.value)}
                        className="w-full h-10 px-3 text-xs font-black text-slate-800 placeholder-slate-400 bg-slate-5e border border-slate-200 rounded-lg outline-none focus:border-amber-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Type d'imputation ERP</label>
                      <select
                        value={parcType}
                        onChange={(e: any) => setParcType(e.target.value)}
                        className="w-full h-10 px-3 text-xs font-black text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 uppercase"
                      >
                        <option value="PELLE">PELLE (SCOOPTRAM LOADER)</option>
                        <option value="DUMPER">DUMPER (MINING TRUCK)</option>
                        <option value="VEHICULE">VEHICULE UTILITAIRE</option>
                        <option value="AUTRE">AUTRE CHARGEUR</option>
                      </select>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={!parcCode.trim()}
                  className="w-full py-3 mt-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg shadow-amber-500/10 active:scale-95"
                >
                  🚀 Valider l'enregistrement
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. NORMAL VISUAL COCKPIT/DASHBOARD */}
      {activePane === 'DASHBOARD' && !instantSearchQuery && (
        <>
          {/* Quick Action Hub with Hydromines Signature Dual-Vline Design and Advanced Operational HUD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 no-print row-dense">
            {/* 1. RÉCEPTION (ENTRÉES) */}
            <button 
              onClick={() => onAction('BON_ENTREE')}
              className="group relative text-left bg-white border border-slate-200/70 p-6 pl-10 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.015)] transition-all duration-300 hover:border-slate-400 hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)] focus:outline-none overflow-hidden"
            >
              {/* Double Ligne Verticale Hydromines: BLEU CIEL (première) & ROUGE FONCÉ (deuxième) */}
              <div className="absolute left-0 top-0 bottom-0 flex w-3">
                <div className="w-1.5 h-full bg-sky-400" />
                <div className="w-1.5 h-full bg-[#991b1b]" />
              </div>

              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-sky-50 text-sky-600 transition-transform group-hover:scale-105">
                  <ArrowDownLeft className="w-5.5 h-5.5" />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">ENREGISTREMENT ENTRÉE</span>
              </div>
              <div className="mt-5">
                <h4 className="text-base font-black text-slate-950 uppercase tracking-tight group-hover:text-sky-950 transition-colors">Réception (Entrées)</h4>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-snug pb-3 border-b border-slate-100">Enregistrer une nouvelle livraison de pièces ou d'équipements de forage.</p>
                
                {/* Embedded Live HUD */}
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold uppercase font-sans">Mouvements ce jour</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-black font-mono">
                    {(() => {
                      const mvs = mouvements.filter(m => m.site === site && (m.type === 'ENTREE'));
                      const count = mvs.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
                      return `${count} ENTRÉE${count > 1 ? 'S' : ''}`;
                    })()}
                  </span>
                </div>
              </div>
            </button>

            {/* 2. SORTIE DE PIÈCES */}
            <button 
              onClick={() => onAction('BON_SORTIE')}
              className="group relative text-left bg-white border border-slate-200/70 p-6 pl-10 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.015)] transition-all duration-300 hover:border-slate-400 hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)] focus:outline-none overflow-hidden"
            >
              {/* Double Ligne Verticale Hydromines: ROUGE FONCÉ (première) & BLEU CIEL (deuxième) */}
              <div className="absolute left-0 top-0 bottom-0 flex w-3">
                <div className="w-1.5 h-full bg-[#991b1b]" />
                <div className="w-1.5 h-full bg-sky-400" />
              </div>

              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 transition-transform group-hover:scale-105">
                  <ArrowUpRight className="w-5.5 h-5.5" />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">ENREGISTREMENT SORTIE</span>
              </div>
              <div className="mt-5">
                <h4 className="text-base font-black text-slate-950 uppercase tracking-tight group-hover:text-rose-950 transition-colors">Sortie de Pièces</h4>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-snug pb-3 border-b border-slate-100">Déstocker pour un engin minier, perforateur Montabert ou atelier local.</p>
                
                {/* Embedded Live HUD */}
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold uppercase font-sans">Mouvements ce jour</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-black font-mono">
                    {(() => {
                      const mvs = mouvements.filter(m => m.site === site && m.type === 'SORTIE');
                      const count = mvs.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
                      return `${count} SORTIE${count > 1 ? 'S' : ''}`;
                    })()}
                  </span>
                </div>
              </div>
            </button>

            {/* 3. TRANSFERTS & RETOURS */}
            <button 
              onClick={() => onAction('TRANSFERS_RETURNS')}
              className="group relative text-left bg-white border border-slate-200/70 p-6 pl-10 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.015)] transition-all duration-300 hover:border-slate-400 hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)] focus:outline-none overflow-hidden"
            >
              {/* Double Ligne Verticale Hydromines: BLEU CIEL (première) & ROUGE FONCÉ (deuxième) */}
              <div className="absolute left-0 top-0 bottom-0 flex w-3">
                <div className="w-1.5 h-full bg-sky-400" />
                <div className="w-1.5 h-full bg-[#991b1b]" />
              </div>

              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-105">
                  <Truck className="w-5.5 h-5.5" />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">TRANSFERT INTER-SITES</span>
              </div>
              <div className="mt-5">
                <h4 className="text-base font-black text-slate-950 uppercase tracking-tight group-hover:text-indigo-950 transition-colors">Transferts & Retours</h4>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-snug pb-3 border-b border-slate-100">Transférer entre magasins de surface et fonds (-350m) et retours usine.</p>
                
                {/* Embedded Live HUD */}
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold uppercase font-sans">Mouvements ce jour</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-black font-mono">
                    {(() => {
                      const mvs = mouvements.filter(m => m.site === site && (m.type === 'TRANSFERT_OUT' || m.type === 'TRANSFERT_IN' || m.type === 'RETOUR'));
                      const count = mvs.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;
                      return `${count} TRANSFERT${count > 1 ? 'S' : ''}`;
                    })()}
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* CATALOG NAVIGATION SHORTCUTS */}
          <div className="relative bg-white border border-slate-200/60 p-6 pl-10 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.015)] hover:border-slate-350 transition-all duration-300 no-print overflow-hidden">
            {/* Double Ligne Verticale Hydromines: BLEU CIEL & ROUGE FONCÉ */}
            <div className="absolute left-0 top-0 bottom-0 flex w-3">
              <div className="w-1.5 h-full bg-[#38bdf8]" />
              <div className="w-1.5 h-full bg-[#991b1b]" />
            </div>

            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Accès Rapide aux Catalogues & Flotte</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Catalogues Maîtres', desc: 'Gestion Réf/BOM', icon: Package, page: 'GESTION_ARTICLES', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100', hoverBorder: 'hover:border-sky-300' },
                { label: 'Parc Engins', desc: 'Registre Scooptrams', icon: Truck, page: 'PARC', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', hoverBorder: 'hover:border-amber-300' },
                { label: 'Perforateurs', desc: 'Marteaux COP/MB', icon: Activity, page: 'STOCK_PERFORATEURS', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100', hoverBorder: 'hover:border-rose-300' },
                { label: 'Consommables', desc: 'Fluides & Silice', icon: Flame, page: 'STOCK_CONSOMMABLES', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', hoverBorder: 'hover:border-orange-300' },
                { label: 'Equipements EPI', desc: 'Sûreté -350m', icon: ShieldIcon, page: 'STOCK_EPI', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', hoverBorder: 'hover:border-emerald-300' },
                { label: 'Ravitaillement', desc: 'Stock & Plannings', icon: AlertCircle, page: 'RESTOCK_MGMT', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', hoverBorder: 'hover:border-indigo-300' },
              ].map(sec => (
                <button
                  key={sec.label}
                  onClick={() => {
                    if (sec.page === 'PARC') {
                      setActivePane('PARC');
                    } else {
                      onAction(sec.page);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200/50 transition-all text-center group bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-md cursor-pointer",
                    sec.hoverBorder
                  )}
                >
                  <div className={cn("p-2.5 rounded-xl mb-2.5 transition-transform group-hover:scale-110", sec.bg, sec.color)}>
                    <sec.icon className="w-5.5 h-5.5 stroke-[2]" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 tracking-tight group-hover:text-slate-950">{sec.label}</span>
                  <span className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider leading-none">{sec.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* VIEW SWITCHER CONTROL */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit gap-1 no-print">
            <button
              onClick={() => setDashboardViewMode('OPERATIONAL')}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all",
                dashboardViewMode === 'OPERATIONAL'
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/40 font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              📋 Mode Opérationnel
            </button>
            <button
              onClick={() => setDashboardViewMode('ANALYTICAL')}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all",
                dashboardViewMode === 'ANALYTICAL'
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/40 font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              📊 Mode Statistique
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div 
                key={stat.label} 
                onClick={() => {
                  if (stat.action === 'ALERTES_STOCK') onAction('RESTOCK_MGMT');
                }}
                className={cn(
                  "bg-white border border-slate-200/60 p-5 rounded-2xl transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] h-full flex flex-col justify-between select-none relative overflow-hidden",
                  stat.action || stat.alert ? "cursor-pointer hover:border-slate-350" : ""
                )}
              >
                {stat.alert && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
                )}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none">{stat.label}</p>
                    <div className={cn("p-1.5 rounded-xl border border-slate-100", stat.bg, stat.color)}>
                      <stat.icon className="w-4 h-4 stroke-[1.5]" />
                    </div>
                  </div>
                  <p className={cn(
                    "font-semibold tracking-tight leading-none mb-1 text-slate-900 truncate",
                    stat.value.length > 20 ? "text-xs font-mono text-slate-500" : "text-2xl"
                  )}>
                    {stat.value}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-2 leading-normal border-t border-slate-100/60 pt-2 font-mono">
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>

          {dashboardViewMode === 'OPERATIONAL' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: SAISIE UNITAIRE EXPRESS */}
              <div className="lg:col-span-5 bg-white border border-slate-200/60 p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_24px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-5">
                  <div className="p-2 bg-slate-50 text-slate-700 rounded-lg flex items-center justify-center border border-slate-200/60">
                    <Zap className="w-4 h-4 text-slate-800" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight leading-none font-sans">Saisie Unitaire Express</h3>
                    <p className="text-[10px] text-slate-400 mt-1 leading-none font-sans">Enregistrement rapide d'un article</p>
                  </div>
                </div>

                <form onSubmit={handleSingleMovementSubmit} className="space-y-4">
                  {/* TYPE DE MOUVEMENT BUTTONS */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 font-sans">Action Magasinier</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setSingleType('SORTIE'); setSingleArticleId(''); }}
                        className={cn(
                          "py-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2",
                          singleType === 'SORTIE'
                            ? "bg-slate-950 text-white border-transparent shadow-[0_2px_4px_rgba(0,0,0,0.06)]"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                        )}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Imputation / Sortie
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSingleType('ENTREE'); setSingleArticleId(''); }}
                        className={cn(
                          "py-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2",
                          singleType === 'ENTREE'
                            ? "bg-slate-950 text-white border-transparent shadow-[0_2px_4px_rgba(0,0,0,0.06)]"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                        )}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" /> Réception Check
                      </button>
                    </div>
                  </div>

                  {/* SÉLECTION ARTICLE */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Article en stock *</label>
                    <select
                      value={singleArticleId}
                      onChange={(e) => setSingleArticleId(e.target.value)}
                      required
                      className="w-full h-10 px-3 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-all uppercase tracking-tight"
                    >
                      <option value="">-- CHOISIR ARTICLE --</option>
                      {articles
                        .filter(a => a.site === site)
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.ref} - {a.designation.toUpperCase()} ({a.quantity} {a.unit || 'uds'} dispo)
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* SÉLECTION QUANTITÉ WITH MINUS/PLUS CONTROLS */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Quantité *</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSingleQty(prev => Math.max(1, prev - 1))}
                        className="w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-medium rounded-lg flex items-center justify-center text-sm transition-all active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        required
                        value={singleQty}
                        onChange={(e) => setSingleQty(Math.max(1, Number(e.target.value)))}
                        className="flex-1 h-9 text-center font-medium text-xs bg-white border border-slate-200 rounded-lg focus:border-slate-400 focus:ring-4 focus:ring-slate-50 outline-none text-slate-900 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setSingleQty(prev => prev + 1)}
                        className="w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-medium rounded-lg flex items-center justify-center text-sm transition-all active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* CONDITIONAL SUPPLY METADATA (SUPPLIER VS BENEFICIARY) */}
                  {singleType === 'SORTIE' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Bénéficiaire *</label>
                          <input
                            type="text"
                            required
                            placeholder="Atelier, Personnel..."
                            value={singleBeneficiaire}
                            onChange={(e) => setSingleBeneficiaire(e.target.value)}
                            className="w-full h-9 px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-all uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Mécanicien</label>
                          <select
                            value={singleMecanicien}
                            onChange={(e) => setSingleMecanicien(e.target.value)}
                            className="w-full h-9 px-3 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-all uppercase"
                          >
                            <option value="">Sélectionner...</option>
                            {agents.filter(a => a.site === site).map(a => (
                              <option key={a.id} value={`${a.lastname} ${a.firstname}`}>{a.lastname} {a.firstname}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Engin Imputé</label>
                        <select
                          value={singleMachine}
                          onChange={(e) => setSingleMachine(e.target.value)}
                          className="w-full h-9 px-3 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-all uppercase"
                        >
                          <option value="">Aucune imputation...</option>
                          {[...engins.filter(e => e.site === site), ...perfos.filter(p => p.site === site)].map(item => (
                            <option key={item.id} value={item.id}>{item.code}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Fournisseur *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Epiroc, Sandvik..."
                            value={singleFournisseur}
                            onChange={(e) => setSingleFournisseur(e.target.value)}
                            className="w-full h-9 px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-all uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">N° BL / Manifest *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: BL-837424"
                            value={singleBL}
                            onChange={(e) => setSingleBL(e.target.value)}
                            className="w-full h-9 px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-all uppercase"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Motif / Notes</label>
                    <input
                      type="text"
                      placeholder="Maintenance, rechange d'usage..."
                      value={singleMotif}
                      onChange={(e) => setSingleMotif(e.target.value)}
                      className="w-full h-9 px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-all uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingSingle}
                    className="w-full py-2.5 rounded-xl font-medium text-xs tracking-wider transition-all shadow-[0_2px_4px_rgba(0,0,0,0.04)] active:scale-95 text-white bg-slate-900 hover:bg-slate-800 flex items-center justify-center gap-2 focus:outline-none"
                  >
                    {isSubmittingSingle ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      <>⚡ Soumettre le mouvement</>
                    )}
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: STOCK ALERTS & TRACKING FLUX */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. SEUILS DE RUPTURE CRITIQUES SECTION */}
                <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_24px_rgba(0,0,0,0.01)]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 text-slate-700 rounded-lg flex items-center justify-center border border-slate-200/60">
                        <AlertCircle className="w-4 h-4 text-slate-800 anim-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 tracking-tight leading-none font-sans">Ruptures & Seuils d'Alerte Actifs</h3>
                        <p className="text-[10px] text-slate-400 mt-1 leading-none font-sans">Besoin de ravitaillement à {site}</p>
                      </div>
                    </div>
                    <span className="bg-red-50 text-red-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-red-100/80">
                      {lowStockCount} Articles critiques
                    </span>
                  </div>

                  <div className="space-y-3">
                    {lowStockItems.length > 0 ? (
                      lowStockItems.map((item) => {
                        const safetyPct = item.quantity > 0 ? Math.round((item.quantity / (item.minStock || 1)) * 100) : 0;
                        return (
                          <div key={item.id} className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-mono font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {item.ref}
                              </span>
                              <h4 className="text-xs font-semibold text-slate-800 mt-2 tracking-tight truncate uppercase">
                                {item.designation}
                              </h4>
                              {/* Stock metric / Progress bar */}
                              <div className="mt-2.5 flex items-center gap-3">
                                <div className="flex-1 bg-slate-200/80 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all", 
                                      item.quantity === 0 ? "w-0 bg-red-505" : safetyPct <= 45 ? "bg-red-400" : "bg-amber-400"
                                    )}
                                    style={{ width: `${Math.min(100, safetyPct)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium font-mono text-slate-500 shrink-0">
                                  {item.quantity} / {item.minStock} {item.unit || 'unit'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toast.success(`Bon de ravitaillement drafté pour ${item.ref}. Soumis à l'approvisionneur.`)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-[10px] tracking-wider rounded-lg transition-all shrink-0 md:self-end flex items-center gap-1 focus:outline-none"
                            >
                              <ArrowRight className="w-3" /> Rapprovisionner
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-slate-400 font-medium text-xs tracking-tight flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <span>Tout est en ordre — aucun article en alerte de stock.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. SUIVI TERRAIN ET DERNIERS MOUVEMENTS (Timeline style) */}
                <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_24px_rgba(0,0,0,0.01)]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 text-slate-700 rounded-lg flex items-center justify-center border border-slate-200/60">
                        <Activity className="w-4 h-4 text-slate-800" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 tracking-tight leading-none font-sans">Journal d'Imputations Récentes</h3>
                        <p className="text-[10px] text-slate-400 mt-1 leading-none font-sans">Derniers déstockages observés sur site</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {recentMovements.length > 0 ? (
                      recentMovements.slice(0, 8).map((mov) => {
                        const total = mov.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                        const isIncoming = mov.type === 'ENTREE' || mov.type === 'TRANSFERT_IN';
                        return (
                          <div 
                            key={mov.id}
                            onClick={() => setSelectedFluxMovement(mov)}
                            className="p-3 border border-slate-100 bg-white hover:border-slate-300 rounded-xl hover:shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border-slate-100",
                                isIncoming ? "bg-emerald-50/50 text-emerald-600 border" : "bg-rose-50/50 text-rose-600 border"
                              )}>
                                {isIncoming ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-semibold text-slate-800 uppercase tracking-tight leading-none">
                                    {isIncoming ? (mov.vendeur || 'Fournisseur') : (mov.demandeur || 'Atelier')}
                                  </span>
                                  <span className={cn(
                                    "px-1.5 py-0.2 text-[8px] font-semibold rounded-full uppercase tracking-wider",
                                    isIncoming ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                                  )}>
                                    {mov.type}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase max-w-sm truncate whitespace-nowrap">
                                  {mov.motif || 'Aucune note'} • {mov.items.length} Réf PIÈCES
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-semibold text-slate-900 leading-none">{formatCurrency(total)}</p>
                              <p className="text-[9px] text-slate-400 font-medium mt-1">
                                {new Date(mov.date).toLocaleDateString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-slate-400 font-medium text-xs">
                        Aucun flux de mouvement enregistré aujourd'hui.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_24px_rgba(0,0,0,0.01)]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 tracking-tight leading-none mb-1.5 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-slate-800 font-semibold" /> Flux de Consommation Magasin (MAD)
                      </h3>
                      <p className="text-[10px] text-slate-400 font-sans leading-none">
                        Courbe de valorisation globale des sorties magasin en Dirhams (MAD) cumulées par mois sur l'année en cours.
                      </p>
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full uppercase tracking-tight border border-slate-200/60 font-mono">Devise: MAD</span>
                  </div>
                  <div className="h-[300px] min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={0} debounce={50}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f172a" stopOpacity={0.06}/>
                            <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={10} fontWeight="500" axisLine={false} tickLine={false} stroke="#64748b" />
                        <YAxis fontSize={10} fontWeight="500" axisLine={false} tickLine={false} stroke="#64748b" tickFormatter={(value) => `${formatCurrency(value)}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}
                          itemStyle={{ fontWeight: '500', fontSize: '11px', color: '#0f172a' }}
                          labelStyle={{ fontWeight: '600', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}
                          formatter={(value: any) => [`${formatCurrency(value)}`, 'Total Consommé']}
                        />
                        <Area type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* COÛT PAR ENGIN */}
                  <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_24px_rgba(0,0,0,0.01)]">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 tracking-tight leading-none mb-1.5 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-slate-800" /> Dépenses de Maintenance par Machine
                      </h3>
                      <p className="text-[10px] text-slate-400 font-sans leading-none mb-5">Valorisation globale des sorties imputées par engin lourd</p>
                    </div>
                    <div className="h-[250px] min-h-[250px]">
                      {machineChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={0} debounce={50}>
                          <BarChart data={machineChartData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} fontSize={9} fontWeight="500" axisLine={false} tickLine={false} stroke="#475569" />
                            <Tooltip 
                              cursor={{ fill: 'rgba(15, 23, 42, 0.02)' }} 
                              contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', padding: '8px', fontWeight: '500', boxShadow: '0 5px 15px rgba(0,0,0,0.03)' }} 
                              formatter={(value: any) => [`${formatCurrency(value)}`, 'Coûts de sorties']}
                            />
                            <Bar dataKey="value" fill="#334155" radius={[0, 4, 4, 0]} maxBarSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-xs font-semibold text-slate-400 uppercase">Aucune imputation de coût machine</div>
                      )}
                    </div>
                  </div>

                  {/* TOP CONSOMMATION CATEGORIES TABBED */}
                  <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 tracking-tight leading-none mb-1.5 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-slate-800" /> Dépenses par Catégorie de Pièce
                      </h3>
                      <p className="text-[10px] text-slate-400 font-sans leading-none mb-4">Valorisation absolue (MAD) des pièces détachées sorties</p>
                      
                      {/* Category Switcher Tabs */}
                      <div className="flex bg-slate-50 border border-slate-200/60 p-0.5 rounded-xl gap-0.5 mb-4 no-print flex-wrap">
                        {[
                          { id: 'ENGINS', label: '🚚 Engins' },
                          { id: 'PERFORATEURS', label: '🔨 Perfo' },
                          { id: 'CONSOMMABLES', label: '🧪 Fluides' },
                          { id: 'EPI', label: '🦺 EPI' }
                        ].map(tab => (
                          <button
                            type="button"
                            key={tab.id}
                            onClick={() => setSelectedTopCat(tab.id as any)}
                            className={cn(
                              "flex-1 text-[9px] font-semibold uppercase py-1.5 px-1 rounded-lg transition-all",
                              selectedTopCat === tab.id 
                                ? "bg-slate-900 text-white shadow-sm" 
                                : "text-slate-500 hover:text-slate-900"
                            )}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-[200px] min-h-[200px] flex-1">
                      {(() => {
                        const data = selectedTopCat === 'ENGINS' ? topEnginsData :
                                     selectedTopCat === 'PERFORATEURS' ? topPerforateursData :
                                     selectedTopCat === 'CONSOMMABLES' ? topConsommablesData : topEpiData;
                        const activeColor = selectedTopCat === 'ENGINS' ? '#475569' :
                                            selectedTopCat === 'PERFORATEURS' ? '#475569' :
                                            selectedTopCat === 'CONSOMMABLES' ? '#475569' : '#475569';

                        return data.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0} debounce={50}>
                            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" width={90} fontSize={9} fontWeight="500" axisLine={false} tickLine={false} stroke="#475569" />
                              <Tooltip 
                                cursor={{ fill: 'transparent' }} 
                                contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', padding: '8px', fontWeight: '500', boxShadow: '0 5px 15px rgba(0,0,0,0.03)' }} 
                                formatter={(value: any) => [`${formatCurrency(value)}`, 'Valorisation']}
                              />
                              <Bar dataKey="value" fill={activeColor} radius={[0, 4, 4, 0]} maxBarSize={14} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-center text-xs font-semibold text-slate-400 uppercase">Aucune consommation enregistrée dans cette catégorie</div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_24px_rgba(0,0,0,0.01)]">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                      <h3 className="text-sm font-semibold text-slate-900 tracking-tight leading-none flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-slate-800" /> Flux d'Entrées vs Sorties
                      </h3>
                    </div>
                    
                    <div className="flex gap-4 mb-5">
                      <div className="flex-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-semibold text-slate-450 uppercase tracking-widest leading-none">Entrées</p>
                        <p className="text-sm font-bold text-slate-900 mt-2">{formatCurrency(currentMonthStats.entrees)}</p>
                      </div>
                      <div className="flex-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-semibold text-slate-450 uppercase tracking-widest leading-none">Sorties</p>
                        <p className="text-sm font-bold text-slate-900 mt-2">{formatCurrency(currentMonthStats.sorties)}</p>
                      </div>
                    </div>

                    <div className="h-[200px] min-h-[200px]">
                      <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0} debounce={50}>
                        <BarChart data={compareData} margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={9} fontWeight="500" axisLine={false} tickLine={false} />
                          <YAxis fontSize={9} fontWeight="500" axisLine={false} tickLine={false} tickFormatter={(value) => `${value/1000}k`} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ borderRadius: '12px', padding: '8px', fontWeight: '500', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }} />
                          <Legend iconSize={6} wrapperStyle={{ fontSize: '9px', fontWeight: '500', textTransform: 'uppercase', paddingTop: '10px' }} />
                          <Bar dataKey="Entrées" fill="#334155" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="Sorties" fill="#64748b" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_24px_rgba(0,0,0,0.01)]">
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight leading-none mb-6 flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-slate-800" /> Analyse & Dispersion ABC
                    </h3>
                    <div className="h-[180px] min-h-[180px] flex items-center justify-center">
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
                    <div className="mt-4 space-y-1">
                      {abcChartData.map(item => (
                        <div key={item.name} className="flex items-center justify-between text-xs font-sans">
                          <span className="font-semibold text-slate-400 uppercase">{item.name}</span>
                          <span className="font-semibold text-slate-900">{item.value} Réf</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white border border-slate-200/60 p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01),0_8px_24px_rgba(0,0,0,0.01)] flex flex-col h-full overflow-hidden self-stretch no-print">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight leading-none flex items-center gap-1.5 font-sans">
                    <Activity className="w-4 h-4 text-slate-850" /> Flux Live Interactif
                  </h3>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>

                {/* LIVE TABS FILTER */}
                <div className="flex bg-slate-5 border border-slate-200/60 p-0.5 rounded-xl gap-0.5 mb-3 flex-wrap">
                  {[
                    { id: 'ALL', label: 'Tous' },
                    { id: 'ENTREE', label: 'Entrées' },
                    { id: 'SORTIE', label: 'Sorties' },
                    { id: 'TRANSFERT', label: 'Transf.' }
                  ].map(lt => (
                    <button
                      type="button"
                      key={lt.id}
                      onClick={() => setLiveFluxFilter(lt.id as any)}
                      className={cn(
                        "flex-1 text-[9px] font-semibold uppercase py-1.5 rounded-lg transition-all text-center",
                        liveFluxFilter === lt.id 
                          ? "bg-slate-900 text-white shadow-sm" 
                          : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      {lt.label}
                    </button>
                  ))}
                </div>

                {/* SEARCH INPUT FILTER */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Filtrer par machine, motif..."
                    value={liveFluxSearchText}
                    onChange={(e) => setLiveFluxSearchText(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-all font-sans"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  {liveFluxSearchText && (
                    <button 
                      onClick={() => setLiveFluxSearchText('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[450px]">
                  {recentMovements.length > 0 ? recentMovements.map((mov) => {
                    const total = mov.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                    const isIncoming = mov.type === 'ENTREE' || mov.type === 'TRANSFERT_IN';
                    return (
                      <div 
                        key={mov.id} 
                        onClick={() => setSelectedFluxMovement(mov)}
                        className="group border border-slate-100 hover:border-slate-300 p-3 bg-white rounded-xl shadow-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-200 cursor-pointer flex flex-col gap-1 text-left"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={cn(
                              "px-1.5 py-0.2 text-[8px] font-semibold rounded-full uppercase tracking-wider",
                              isIncoming ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                            )}>
                              {mov.type}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 truncate uppercase mt-0.5">
                              {isIncoming ? mov.vendeur : mov.demandeur}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-semibold text-slate-500 flex-shrink-0">
                            {formatCurrency(total)}
                          </span>
                        </div>

                        {/* Display targeted machine if imputed */}
                        {(mov.engin || mov.perforateur) && (
                          <div className="flex items-center gap-1 text-[9px] text-slate-505 font-medium uppercase tracking-tight mt-1 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 inline-block self-start">
                            <Truck className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">ENGIN: {mov.engin || mov.perforateur}</span>
                          </div>
                        )}

                        {/* Display intervention motif */}
                        {mov.motif && (
                          <p className="text-[9px] font-medium text-slate-400 uppercase italic line-clamp-1 border-t border-slate-50 pt-1 mt-1">
                            Motif: {mov.motif}
                          </p>
                        )}

                        <div className="flex justify-between items-center text-[8px] text-slate-400 font-medium uppercase tracking-wider mt-1.5 border-t border-slate-50 pt-1">
                          <span>{mov.items.length} références</span>
                          <span>{new Date(mov.date).toLocaleDateString('fr-MA', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                      <p className="text-[10px] font-semibold uppercase tracking-widest">Aucun flux ne correspond</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. COMPREHENSIVE MOVEMENT TRACEABILITY MODAL POP-UP */}
      {selectedFluxMovement && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200/60 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <header className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/60 font-mono">Traceability Log</span>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight mt-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-950" /> Compte rendu de flux #{selectedFluxMovement.id.slice(0, 8)}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedFluxMovement(null)}
                className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-850 text-sm font-medium transition-all"
                title="Fermer"
              >
                ✕
              </button>
            </header>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block font-sans">Type de mouvement</span>
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-tight inline-block px-2.5 py-0.5 mt-1 rounded-md",
                    selectedFluxMovement.type === 'ENTREE' || selectedFluxMovement.type === 'TRANSFERT_IN' 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                      : "bg-rose-50 text-rose-800 border border-rose-100"
                  )}>
                    {selectedFluxMovement.type}
                  </span>
                </div>
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block font-sans">Date / Heure</span>
                  <span className="text-xs font-mono font-semibold text-slate-700 mt-1.5 block">
                    {new Date(selectedFluxMovement.date).toLocaleString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Saisie par (Opérateur)</span>
                  <p className="text-xs font-semibold text-slate-800 uppercase mt-1">
                    {selectedFluxMovement.operateur || 'Magasinier SMI'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Acteur terrain (Mécanicien)</span>
                  <p className="text-xs font-semibold text-slate-800 uppercase mt-1">
                    {selectedFluxMovement.mecanicien || 'Aucun affecté'}
                  </p>
                </div>
              </div>

              {selectedFluxMovement.type === 'SORTIE' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Demandeur (Service)</span>
                    <p className="text-xs font-semibold text-slate-800 uppercase mt-1">
                      {selectedFluxMovement.demandeur || 'Atelier de maintenance'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Bénéficiaire final</span>
                    <p className="text-xs font-semibold text-slate-800 uppercase mt-1">
                      {selectedFluxMovement.beneficiaire || 'Atelier fond'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Vendeur / Fournisseur</span>
                    <p className="text-xs font-semibold text-slate-800 uppercase mt-1">
                      {selectedFluxMovement.vendeur || 'Epiroc France / OEM'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">BL Code / Manifest</span>
                    <p className="text-xs font-mono font-semibold text-slate-800 uppercase mt-1">
                      {selectedFluxMovement.blCode || 'SANS BL'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Machine cible affectée</span>
                  <p className="text-xs font-semibold text-slate-800 uppercase mt-1 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-405" />
                    {selectedFluxMovement.engin || selectedFluxMovement.perforateur || 'Parc global (Sans imputation)'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Motif d'intervention</span>
                  <p className="text-xs font-medium text-slate-700 uppercase mt-1">
                    {selectedFluxMovement.motif || 'Aucune observation saisie'}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-105 rounded-xl overflow-hidden mt-4">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-[9px] font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-1.5 font-mono">
                  <span className="col-span-3">Référence</span>
                  <span className="col-span-5">Désignation complète</span>
                  <span className="col-span-2 text-right">Qté</span>
                  <span className="col-span-2 text-right">Prix Unitaire</span>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {selectedFluxMovement.items.map((it: any) => (
                    <div 
                      key={it.articleId || it.ref} 
                      onClick={() => {
                        const art = articles.find(a => a.id === it.articleId || a.ref === it.ref);
                        if (art) {
                          onArticleClick?.(art);
                          setSelectedFluxMovement(null);
                        }
                      }}
                      className="px-3 py-2 text-xs grid grid-cols-12 gap-1.5 items-center hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      <span className="col-span-3 font-mono font-semibold text-slate-900 group-hover:text-slate-950">{it.ref}</span>
                      <span className="col-span-5 text-slate-600 font-medium truncate uppercase">{it.designation || 'Pièce inconnue'}</span>
                      <span className="col-span-2 text-right font-mono font-semibold text-slate-600">{it.quantity}</span>
                      <span className="col-span-2 text-right font-mono font-medium text-slate-550">{formatCurrency(it.price || 0)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50/40 px-4 py-3 text-xs font-semibold text-slate-900 flex justify-between items-center tracking-tight border-t border-slate-100">
                  <span className="text-[11px] text-slate-450 uppercase tracking-wider">VALORISATION TOTALE DU BON DE MOUVEMENT</span>
                  <span className="text-xs font-mono font-semibold text-slate-950">
                    {formatCurrency(selectedFluxMovement.items.reduce((sum: number, it: any) => sum + (it.quantity * (it.price || 0)), 0))}
                  </span>
                </div>
              </div>
            </div>

            <footer className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedFluxMovement(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-all"
              >
                Fermer la vue
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
