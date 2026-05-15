import React, { useMemo, useRef, useState } from 'react';
import { 
  TrendingUp, 
  Package, 
  AlertCircle, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight,
  Printer,
  Calendar,
  LayoutGrid,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  MapPin,
  Truck,
  ShieldCheck,
  Search,
  CheckCircle2,
  PackageCheck,
  Droplets,
  Download,
  ExternalLink
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { useStorage } from '../hooks/useStorage';
import { SiteCode } from '../types';
import { SITES } from '../demoData';
import { formatCurrency, cn } from '../lib/utils';
import type { Article, Mouvement } from '../types';

export function ReportPage() {
  const { articles, mouvements, transferts, currentUser } = useStorage();
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SITES' | 'CRITICAL'>('OVERVIEW');

  const analytics = useMemo(() => {
    // Filter data by month
    const filteredMouvements = mouvements.filter(m => m && m.date && m.date.startsWith(selectedMonth));
    const filteredTransferts = transferts.filter(t => t && t.date && t.date.startsWith(selectedMonth));
    
    // Note: articles are current state, so we can't easily "backdate" them without historical stock tracking
    // but we can filter the movements and trends.

    if (!articles.length && !filteredMouvements.length) return {
      totalArticles: articles.length,
      totalStockValue: articles.reduce((sum, a) => sum + ((a.quantity || 0) * (a.price || 0)), 0),
      lowStockCount: articles.filter(a => (a.quantity || 0) <= (a.minStock || 0)).length,
      siteStats: SITES.map(s => ({ site: s.code, label: s.label, value: 0, count: 0, critical: 0 })),
      distributionData: [],
      topConsumed: [],
      last14Days: [],
      dailyStats: { in: 0, out: 0 },
      inTransit: [],
      inTransitValue: 0,
      lowStockItems: []
    };

    // Fast Lookup Map for Article Names
    const artMap = new Map<string, Article>();
    articles.forEach(a => artMap.set(a.id, a));

    const totalArticles = articles.length || 1;
    const totalStockValue = articles.reduce((sum, a) => sum + ((a.quantity || 0) * (a.price || 0)), 0);
    const lowStockItems = articles.filter(a => (a.quantity || 0) <= (a.minStock || 0));

    // Site Breakdown (Current State)
    const siteStats = SITES.map(s => {
      const siteArts = articles.filter(a => a.site === s.code);
      const value = siteArts.reduce((sum, a) => sum + ((a.quantity || 0) * (a.price || 0)), 0);
      return { 
        site: s.code, 
        label: s.label, 
        value: isNaN(value) ? 0 : value, 
        count: siteArts.length,
        critical: siteArts.filter(a => (a.quantity || 0) <= (a.minStock || 0)).length
      };
    }).sort((a, b) => b.value - a.value);

    // Distribution by Type (Current State)
    const typeMap: Record<string, number> = {};
    articles.forEach(a => {
      const qty = typeof a.quantity === 'number' && !isNaN(a.quantity) ? a.quantity : 0;
      const price = typeof a.price === 'number' && !isNaN(a.price) ? a.price : 0;
      typeMap[a.type] = (typeMap[a.type] || 0) + (qty * price);
    });
    const distributionData = Object.entries(typeMap).map(([name, value]) => ({ 
      name, 
      value: isNaN(value) ? 0 : value 
    }));

    // Consumption Trends (Filtered by Month)
    const consumptionMap: Record<string, { ref: string, name: string, qty: number, value: number, unit: string, type: string }> = {};
    const filteredSorties = filteredMouvements.filter(m => m.type === 'SORTIE');
    
    filteredSorties.forEach(m => {
      m.items.forEach(item => {
        if (!consumptionMap[item.articleId]) {
          const art = artMap.get(item.articleId);
          consumptionMap[item.articleId] = { 
            ref: art?.ref || 'REF-INCONNU', 
            name: art?.designation || 'Article Supprimé', 
            qty: 0, 
            value: 0, 
            unit: art?.unit || 'U',
            type: art?.type || 'AUTRES'
          };
        }
        consumptionMap[item.articleId].qty += item.quantity || 0;
        consumptionMap[item.articleId].value += (item.quantity || 0) * (item.price || 0);
      });
    });

    const topConsumed = Object.values(consumptionMap)
      .map(item => ({ ...item, value: isNaN(item.value) ? 0 : item.value, qty: isNaN(item.qty) ? 0 : item.qty }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Activity Trends (Adjusted for Selected Month if needed, but let's keep 14 days logic or adapt to month)
    // If it's the current month, show last 14 days. If it's a past month, show the whole month.
    const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);
    
    const trendDays = isCurrentMonth ? 14 : 31;
    const lastN = Array.from({ length: trendDays }).map((_, i) => {
      const d = new Date(`${selectedMonth}-01`);
      if (isCurrentMonth) {
        d.setDate(new Date().getDate() - i);
      } else {
        d.setDate(31 - i);
      }
      
      if (d.toISOString().slice(0, 7) !== selectedMonth) return null;

      const dateStr = d.toISOString().split('T')[0];
      const dayMovements = filteredMouvements.filter(m => m.date.startsWith(dateStr));
      const entrees = dayMovements
        .filter(m => m.type === 'ENTREE' || m.type === 'TRANSFERT_IN')
        .reduce((sum, m) => sum + m.items.reduce((iSum, item) => iSum + ((item.quantity || 0) * (item.price || 0)), 0), 0);
      const sortiesVal = dayMovements
        .filter(m => m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT')
        .reduce((sum, m) => sum + m.items.reduce((iSum, item) => iSum + ((item.quantity || 0) * (item.price || 0)), 0), 0);
      
      return { 
        name: d.toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' }), 
        entrees: isNaN(entrees) ? 0 : entrees, 
        sorties: isNaN(sortiesVal) ? 0 : sortiesVal 
      };
    }).filter(Boolean).reverse() as { name: string, entrees: number, sorties: number }[];

    // Value entries/sorties totals for today or period
    const now = new Date().toISOString().split('T')[0];
    const dailyStats = filteredMouvements.filter(m => m.date.startsWith(now)).reduce((acc, m) => {
      const val = m.items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.price || 0)), 0);
      if (m.type === 'ENTREE' || m.type === 'TRANSFERT_IN') acc.in += val;
      if (m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT') acc.out += val;
      return acc;
    }, { in: 0, out: 0 });

    const inTransit = filteredTransferts.filter(t => t.status === 'EN_TRANSIT');
    const inTransitValue = inTransit.reduce((sum, t) => {
      const tVal = t.items.reduce((iSum, item) => {
        const qty = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
        const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0;
        return iSum + (qty * price);
      }, 0);
      return sum + tVal;
    }, 0);

    const safeArticles = articles.map(a => ({
      ...a,
      quantity: typeof a.quantity === 'number' && !isNaN(a.quantity) ? a.quantity : 0,
      minStock: typeof a.minStock === 'number' && !isNaN(a.minStock) ? a.minStock : 0
    }));

    const sortedLowStock = lowStockItems.map(a => ({
      ...a,
      quantity: typeof a.quantity === 'number' && !isNaN(a.quantity) ? a.quantity : 0,
      minStock: typeof a.minStock === 'number' && !isNaN(a.minStock) ? a.minStock : 0
    })).sort((a,b) => {
        const ratioA = a.minStock === 0 ? 0 : a.quantity / a.minStock;
        const ratioB = b.minStock === 0 ? 0 : b.quantity / b.minStock;
        return ratioA - ratioB;
      }).slice(0, 10);

    return {
      totalArticles: articles.length,
      totalStockValue: isNaN(totalStockValue) ? 0 : totalStockValue,
      lowStockCount: lowStockItems.length,
      siteStats,
      distributionData,
      topConsumed,
      last14Days: lastN,
      dailyStats: {
        in: isNaN(dailyStats.in) ? 0 : dailyStats.in,
        out: isNaN(dailyStats.out) ? 0 : dailyStats.out
      },
      inTransit,
      inTransitValue: isNaN(inTransitValue) ? 0 : inTransitValue,
      lowStockItems: sortedLowStock
    };
  }, [articles, mouvements, transferts, currentUser?.role, selectedMonth]);

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-3xl border border-slate-100 italic">
        <ShieldCheck className="w-16 h-16 text-rose-500 mb-6 opacity-20" />
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Accès Restreint</h2>
        <p className="text-slate-500 mt-2 font-bold max-w-sm">
          Vous n'avez pas les habilitations nécessaires pour consulter les rapports consolidés du groupe Hydromines.
        </p>
      </div>
    );
  }

  if (!analytics) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
      <div className="w-16 h-16 bg-slate-100 rounded-full mb-4" />
      <div className="h-4 w-48 bg-slate-100 rounded-full" />
    </div>
  );

  const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-1000">
      {/* IMPROVED HEADER */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-8 no-print">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 bg-slate-950 rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <TrendingUp className="w-10 h-10 text-white relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5 line-height-none">
              <span className="text-[10px] font-black tracking-tighter uppercase mr-1">
                <span className="text-sky-500">HYDRO</span>
                <span className="text-rose-700">MINES</span>
              </span>
              <span className="text-slate-300 tracking-tighter opacity-50">•</span>
              <div className="flex items-center gap-2 no-print">
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-[10px] bg-slate-100 hover:bg-white border-0 focus:ring-0 rounded-lg font-black text-slate-500 uppercase tracking-widest cursor-pointer transition-colors"
                />
              </div>
            </div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tighter uppercase leading-none">Gestion de Stock & Magasinage</h1>
            <p className="text-slate-500 font-bold mt-2 text-[10px] uppercase tracking-widest italic flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Console de Supervision Magasinière
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm p-1.5 no-print">
             <button 
              onClick={() => {
                const data = analytics.siteStats.map(s => `${s.label},${s.site},${s.value},${s.count}`).join('\n');
                const blob = new Blob([`Site,Code,Valeur,Articles\n${data}`], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Hydromines_Rapport_Sites_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
              className="px-4 py-2.5 hover:bg-slate-50 text-slate-400 hover:text-sky-600 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              title="Exporter CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-200 mx-2" />
            <button 
              onClick={() => {
                window.focus();
                window.print();
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-950 text-white rounded-xl shadow-xl hover:bg-slate-800 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer z-30"
            >
              <Printer className="w-4 h-4 text-sky-400" /> 
              <span>PDF</span>
            </button>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-inner z-30 no-print">
            {[
              { id: 'OVERVIEW', label: 'Vue Globale', icon: LayoutGrid },
              { id: 'SITES', label: 'Performances Sites', icon: MapPin },
              { id: 'CRITICAL', label: 'Points Critiques', icon: AlertCircle },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  console.log('Switching to tab:', tab.id);
                  setActiveTab(tab.id as any);
                }}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer",
                  activeTab === tab.id 
                    ? "bg-white text-slate-950 shadow-md border border-slate-100" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={printRef} className="space-y-12 print:p-8 print:bg-white print:text-black">
        
        {/* PRINT HEADER */}
        <div className="hidden print:flex items-center justify-between mb-12 pb-6 border-b-4 border-slate-950">
          <div className="flex flex-col">
            <span className="text-4xl font-black tracking-tighter leading-none mb-1">
              <span className="text-sky-500">HYDRO</span><span className="text-rose-900">MINES</span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Gestion de Stock Groupe</span>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">Rapport de Synthèse {new Date(`${selectedMonth}-01`).toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' })}</h2>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Date d'édition : {new Date().toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* --- GLOBAL VIEW (EVERYTHING) --- */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-12">
            {/* EXECUTIVE KPI GRID */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card-kpi bg-slate-950 text-white border-0 shadow-2xl relative overflow-hidden group">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Valeur Consolidée du Stock</p>
                <p className="text-3xl font-black tracking-tighter leading-none">{formatCurrency(analytics.totalStockValue)}</p>
                <div className="mt-6 flex items-center gap-2">
                  <span className="text-[9px] font-black px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded uppercase">Groupe SMI</span>
                </div>
              </div>

              <div className="card-kpi bg-white border-slate-100 shadow-xl group hover:border-sky-100 transition-colors">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Consommation Aujourd'hui</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-rose-600 tracking-tighter leading-none">{formatCurrency(analytics.dailyStats.out)}</p>
                  <ArrowDownRight className="w-4 h-4 text-rose-500" />
                </div>
                <div className="mt-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Mouvements de Sorties Actifs</span>
                  </div>
                </div>
              </div>

              <div className="card-kpi bg-white border-slate-100 shadow-xl group hover:border-amber-100 transition-colors">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alertes Critiques</p>
                <p className="text-3xl font-black text-amber-600 tracking-tighter leading-none">{analytics.lowStockCount || 0}</p>
                <div className="mt-6">
                   <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                     <div 
                        className="bg-amber-500 h-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, analytics.totalArticles > 0 ? (analytics.lowStockCount/analytics.totalArticles)*100 : 0)}%` }} 
                     />
                   </div>
                </div>
              </div>

              <div className="card-kpi bg-white border-slate-100 shadow-xl group hover:border-sky-100 transition-colors">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Opérations en Transit</p>
                <p className="text-3xl font-black text-sky-600 tracking-tighter leading-none">{analytics.inTransit.length}</p>
                <div className="mt-6 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-500 opacity-50" />
                  <span className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{formatCurrency(analytics.inTransitValue)} Immo.</span>
                </div>
              </div>
            </section>

            {/* CHARTS & ANALYTICS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Main Evolution Chart */}
              <div className="lg:col-span-8 card glass p-8 shadow-2xl relative overflow-hidden backdrop-blur-none bg-white/70">
                 <div className="flex items-center justify-between mb-10">
                   <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                     <Activity className="w-5 h-5 text-sky-500" /> Flux de Valeurs pour {new Date(`${selectedMonth}-01`).toLocaleDateString('fr-MA', { month: 'long' })}
                   </h3>
                   <div className="flex items-center gap-6 no-print">
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-emerald-500" />
                       <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Entrées</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-rose-500" />
                       <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Sorties</span>
                     </div>
                   </div>
                 </div>
                 <div className="h-[350px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={analytics.last14Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <defs>
                         <linearGradient id="colorEn" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                         </linearGradient>
                         <linearGradient id="colorSo" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <XAxis dataKey="name" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                       <YAxis fontSize={9} fontWeight="900" axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} tick={{ fill: '#94a3b8' }} />
                       <Tooltip 
                         contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }} 
                         labelStyle={{ fontWeight: '900', color: '#1e293b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}
                       />
                       <Area type="monotone" dataKey="entrees" name="ENTRÉES" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEn)" />
                       <Area type="monotone" dataKey="sorties" name="SORTIES" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSo)" />
                     </AreaChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              {/* Distribution Pie Chart */}
              <div className="lg:col-span-4 card glass p-8 shadow-2xl flex flex-col backdrop-blur-none bg-white/70">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter mb-8">
                  Distribution par Type
                </h3>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.distributionData}
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={1500}
                      >
                        {analytics.distributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                        formatter={(value) => formatCurrency(value as number)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-8 space-y-3 w-full max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                  {analytics.distributionData.sort((a,b) => b.value - a.value).map((item, index) => (
                    <div key={item.name} className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="text-[11px] font-black text-slate-900">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SUMMARY INFO ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Site Performance Summary Mini-Table */}
               <div className="card glass p-8 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-sky-500" /> Bilan Financier par Site
                    </h3>
                    <button onClick={() => setActiveTab('SITES')} className="text-[9px] font-black text-sky-600 uppercase tracking-widest hover:underline no-print">Détails Complets</button>
                  </div>
                  <div className="space-y-4">
                    {analytics.siteStats.slice(0, 5).map((site) => (
                      <div key={site.site} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-sky-200 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="w-10 h-10 flex items-center justify-center bg-white rounded-lg text-[10px] font-black text-slate-400 border border-slate-100 uppercase">{site.site}</span>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase truncate max-w-[150px]">{site.label}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{site.count} Réf.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-950">{formatCurrency(site.value)}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {site.critical > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                            <span className={cn("text-[8px] font-black uppercase", site.critical > 0 ? "text-rose-500" : "text-emerald-500")}>
                              {site.critical} Alertes
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               {/* Top Consumed Items Mini-Table */}
               <div className="card glass p-8 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <TrendingUp className="w-4 h-4 text-rose-500" /> Top Consommation Sorties
                    </h3>
                    <button onClick={() => setActiveTab('CRITICAL')} className="text-[9px] font-black text-sky-600 uppercase tracking-widest hover:underline no-print">Top 10 Complet</button>
                  </div>
                  <div className="space-y-4">
                    {analytics.topConsumed.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-rose-200 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-xs font-black text-rose-500 border border-slate-100">0{idx+1}</span>
                          <div className="truncate max-w-[200px]">
                            <p className="text-[11px] font-black text-slate-900 uppercase truncate">{item.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.ref} • {item.qty} {item.unit}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-rose-600">{formatCurrency(item.value)}</p>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            {/* CRITICAL STOCK ALERTS (New in Overview) */}
            <div className="card glass p-8 shadow-xl border-rose-100">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                   <AlertCircle className="w-4 h-4 text-rose-500" /> Urgences de Réapprovisionnement
                 </h3>
                 <button onClick={() => setActiveTab('CRITICAL')} className="text-[9px] font-black text-rose-600 uppercase tracking-widest hover:underline no-print">Gérer les Alertes</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {analytics.lowStockItems.slice(0, 6).map((item) => (
                   <div key={item.id} className="flex items-center justify-between p-4 bg-rose-50/20 rounded-2xl border border-rose-100 group transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 uppercase">{item.site.slice(0,3)}</div>
                        <div>
                          <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[120px]">{item.designation}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">{item.ref}</p>
                        </div>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-black text-rose-600 leading-none">{item.quantity}</p>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Min: {item.minStock}</p>
                     </div>
                   </div>
                 ))}
                 {analytics.lowStockItems.length === 0 && (
                   <div className="col-span-full py-8 text-center bg-emerald-50 rounded-2xl border border-emerald-100 italic text-emerald-600 font-bold text-xs uppercase tracking-widest">
                     Félicitations • Aucun article en rupture critique
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* SITE PERFORMANCE GRID & COMPARISON */}
        {activeTab === 'SITES' && (
          <section className="space-y-12 animate-in slide-in-from-bottom-5 duration-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <MapPin className="w-6 h-6 text-sky-500" /> Performance Comparative Inter-Sites
              </h3>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-100 px-4 py-2 rounded-full border border-slate-200 no-print">
                Audit Consolidé • Temps Réel
              </div>
            </div>

            {/* COMPARISON CHART */}
            <div className="card glass p-8 shadow-2xl relative overflow-hidden backdrop-blur-none bg-white">
              <div className="flex items-center justify-between mb-10">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-500" /> Volume Financier Comparé
                </h4>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic no-print">Valeur des Articles en Stock par Site d'Exploitation</div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.siteStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="site" 
                      fontSize={11} 
                      fontWeight="900" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b' }}
                      label={{ value: 'SITES', position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 900, fill: '#cbd5e1' }}
                    />
                    <YAxis 
                      fontSize={10} 
                      fontWeight="900" 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => `${v/1000}k`} 
                      tick={{ fill: '#64748b' }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }} 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} 
                      formatter={(value) => [formatCurrency(value as number), 'Valeur Totale']}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#0ea5e9" 
                      radius={[8, 8, 0, 0]} 
                      barSize={45}
                      animationDuration={2000}
                    >
                      {analytics.siteStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > analytics.totalStockValue / analytics.siteStats.length ? '#0284c7' : '#38bdf8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DETAILED SITES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
              {analytics.siteStats.map((site) => (
                <div key={site.site} className="group relative">
                  <div className="relative h-full card glass p-8 border-slate-100 shadow-xl overflow-hidden flex flex-col bg-white">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-3 py-1 rounded-full uppercase self-start border border-sky-100 mb-2">
                          {site.site}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">
                          {site.label}
                        </h4>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-sky-500 group-hover:text-white transition-all duration-500 no-print">
                        <Activity className="w-5 h-5 text-slate-400 group-hover:text-white" />
                      </div>
                    </div>

                    <div className="mt-auto">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 items-center flex gap-2">
                        Valeur Active
                      </p>
                      <p className="text-2xl font-black text-slate-950 tracking-tighter leading-none">
                        {formatCurrency(site.value)}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-50">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Articles</p>
                          <p className="text-base font-black text-slate-900">{site.count}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Critiques</p>
                          <p className={cn(
                            "text-base font-black",
                            site.critical > 0 ? "text-rose-600" : "text-emerald-500"
                          )}>
                            {site.critical}
                          </p>
                        </div>
                      </div>

                      {/* Micro Progress Bar */}
                      <div className="mt-6 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-sky-500 h-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.max(10, Math.min(100, (site.value / analytics.totalStockValue) * 100))}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CRITICAL ANALYTICS SECTION */}
        {activeTab === 'CRITICAL' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="card glass p-8 shadow-2xl">
               <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                 <Package className="w-5 h-5 text-sky-500" /> Articles à Forte Consommation (Top 10)
               </h3>
               <div className="table-container rounded-3xl border border-slate-100 h-[600px] overflow-y-auto">
                 <table className="data-table">
                   <thead className="sticky top-0 bg-white z-10">
                     <tr>
                       <th>Article / Réf</th>
                       <th className="text-center">Qte Sortie</th>
                       <th className="text-right">Valeur</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {analytics.topConsumed.map((item, idx) => (
                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="text-xs font-black text-slate-900 uppercase truncate max-w-[250px]">{item.name}</span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.ref} • {item.type}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-center font-black text-slate-700 text-xs">{item.qty} {item.unit}</td>
                         <td className="px-6 py-4 text-right font-black text-rose-600 text-xs">{formatCurrency(item.value)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>

            <div className="card glass p-8 shadow-2xl border-rose-100 backdrop-blur-none bg-white">
               <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                 <AlertCircle className="w-5 h-5 text-rose-500" /> Priorités Ravitaillement (Stock Critiques)
               </h3>
               <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar no-print-scroll">
                 {analytics.lowStockItems.length > 0 ? analytics.lowStockItems.map((item) => (
                   <div key={item.id} className="flex items-center justify-between p-4 bg-rose-50/20 rounded-2xl border border-rose-100 group hover:border-rose-300 transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">{item.site.slice(0,3)}</div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase">{item.designation}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.ref} • {item.location}</p>
                        </div>
                     </div>
                     <div className="text-right">
                       <p className="text-lg font-black text-rose-600 leading-none">{item.quantity}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">Seuil: {item.minStock}</p>
                     </div>
                   </div>
                 )) : (
                   <div className="py-20 text-center opacity-40">
                     <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aucune alerte critique</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* --- FINAL COMPLIANCE FOOTER --- */}
        <div className="pt-16 border-t-2 border-slate-100 mt-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-12 print:mt-20 print:pt-10">
          <div className="max-w-md">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Certificat d'Authenticité Stock</p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-black tracking-tighter uppercase">
                <span className="text-sky-500">HYDRO</span><span className="text-rose-900">MINES</span>
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 italic leading-relaxed">
              Ce rapport constitue un document officiel de gestion de stock. Les données extraites proviennent du système de synchronisation en temps réel d'HYDROMINES. Toute exploitation commerciale est strictement réservée à la direction générale.
            </p>
            <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-4">HYDROMINES STOCK ENGINE v2.2.0 • SÉCURISÉ</p>
          </div>
        </div>

      </div>

      <div className="hidden">
        <MapPin />
      </div>

    </div>
  );
}

function ArrowRight(props: any) {
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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
