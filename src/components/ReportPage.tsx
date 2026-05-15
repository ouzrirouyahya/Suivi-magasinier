import React, { useRef, useMemo } from 'react';
import { useStorage } from '../hooks/useStorage';
import { 
  Printer, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  Truck, 
  MapPin, 
  DollarSign, 
  Activity, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Calendar,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { SITES } from '../demoData';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie, 
  Legend,
  LineChart,
  Line
} from 'recharts';

export function ReportPage() {
  const { articles, mouvements, transferts, currentUser } = useStorage();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // --- ANALYTICS ENGINE ---

  const analytics = useMemo(() => {
    // We only perform calculations if user is admin, but the hook must stay here
    if (currentUser?.role !== 'ADMIN') return null;

    // 1. Total KPI
    const totalStockValue = articles.reduce((acc, art) => acc + (art.quantity * (art.price || 0)), 0);
    const lowStockArticles = articles.filter(a => a.quantity <= a.minStock);
    
    // 2. Daily Flux
    const today = new Date().toISOString().split('T')[0];
    const movementsToday = mouvements.filter(m => m.date.startsWith(today));
    
    const totalEntreesValue = movementsToday
      .filter(m => m.type === 'ENTREE')
      .reduce((acc, m) => acc + (m.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)), 0);

    const totalSortiesValue = movementsToday
      .filter(m => m.type === 'SORTIE')
      .reduce((acc, m) => acc + (m.items.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0)), 0);

    // 3. Chart Data: Stock Value by Site
    const siteChartData = SITES.map(site => {
      const siteArticles = articles.filter(a => a.site === site.code);
      const value = siteArticles.reduce((sum, a) => sum + (a.quantity * (a.price || 0)), 0);
      return {
        name: site.label,
        value: Math.round(value),
        count: siteArticles.length
      };
    });

    // 4. Chart Data: Type Distribution
    const typeDistribution: Record<string, number> = {};
    articles.forEach(art => {
      const type = art.type || 'AUTRE';
      const value = art.quantity * (art.price || 0);
      typeDistribution[type] = (typeDistribution[type] || 0) + value;
    });
    const typeChartData = Object.entries(typeDistribution).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value: Math.round(value)
    })).sort((a, b) => b.value - a.value);

    // 5. 7-Day Trend
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const trendData = last7Days.map(date => {
      const dayMvts = mouvements.filter(m => m.date.startsWith(date));
      const inValue = dayMvts.filter(m => m.type === 'ENTREE').reduce((acc, m) => acc + m.items.reduce((sum, it) => sum + (it.quantity * it.price), 0), 0);
      const outValue = dayMvts.filter(m => m.type === 'SORTIE').reduce((acc, m) => acc + m.items.reduce((sum, it) => sum + (it.quantity * it.price), 0), 0);
      return {
        date: new Date(date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' }),
        entrees: Math.round(inValue),
        sorties: Math.round(outValue)
      };
    });

    // 6. Top Consumed Articles
    const consumptionMap: Record<string, { ref: string, name: string, qty: number, value: number, unit: string }> = {};
    mouvements.filter(m => m.type === 'SORTIE').forEach(m => {
      m.items.forEach(item => {
        if (!consumptionMap[item.articleId]) {
          consumptionMap[item.articleId] = { ref: item.ref, name: item.designation, qty: 0, value: 0, unit: item.unit };
        }
        consumptionMap[item.articleId].qty += item.quantity;
        consumptionMap[item.articleId].value += item.quantity * item.price;
      });
    });
    const topConsumed = Object.values(consumptionMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalStockValue,
      lowStockArticles,
      totalEntreesValue,
      totalSortiesValue,
      siteChartData,
      typeChartData,
      trendData,
      topConsumed,
      movementsTodayCount: movementsToday.length
    };
  }, [articles, mouvements, transferts, currentUser?.role]);

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <AlertTriangle className="w-16 h-16 mb-4 text-rose-500" />
        <h2 className="text-xl font-black uppercase tracking-tighter">Accès Restreint</h2>
        <p className="font-bold text-sm">Seuls les administrateurs peuvent générer des rapports globaux.</p>
      </div>
    );
  }

  if (!analytics) return null;

  const COLORS = ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20 p-8">
      <header className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl shadow-slate-200">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Rapports & Synthèse</h2>
            <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest italic flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" /> Intelligence Logistique & Pilotage Stratégique
            </p>
          </div>
        </div>
        <button 
          onClick={handlePrint}
          className="group flex items-center gap-4 px-8 py-4 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
        >
          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Printer className="w-4 h-4" />
          </div>
          Générer Rapport Global (PDF)
        </button>
      </header>

      <div ref={printRef} className="space-y-12 bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] print:shadow-none print:p-0 print:border-0 print:m-0">
        
        {/* --- HEADER REPORT --- */}
        <div className="flex justify-between items-start border-b-[6px] border-slate-900 pb-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white font-black text-2xl tracking-tighter">
              HM
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter mb-1 uppercase text-slate-950">HYDROMINES CONTRÔLE</h1>
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
                Advanced Logistics Rapport Synthétique
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-600 tracking-widest border border-slate-200">
                  REF: LOG-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}
                </div>
                <div className="px-4 py-1.5 bg-sky-50 rounded-full text-[10px] font-black uppercase text-sky-600 tracking-widest border border-sky-100">
                  DATE: {new Date().toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100 mb-4 inline-block">
              CONFIDENTIEL / USAGE INTERNE
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signataire Autorisé</p>
            <p className="text-lg font-black text-slate-900 mt-1">{currentUser?.name}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Administrateur Système Logistique</p>
          </div>
        </div>

        {/* --- EXECUTIVE KPI GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="relative group overflow-hidden bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
              <DollarSign className="w-16 h-16" />
            </div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Immobilisation Stock</p>
            <p className="text-3xl font-black text-slate-950 tracking-tighter mb-1">
              {analytics.totalStockValue.toLocaleString()} <span className="text-sm text-slate-300 font-bold">DH</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valorisation Totale</span>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-rose-50/30 p-8 rounded-[2.5rem] border border-rose-100/50 shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <AlertTriangle className="w-16 h-16" />
            </div>
            <p className="text-[11px] font-black text-rose-400 uppercase tracking-[0.2em] mb-3">Gravité Inventaire</p>
            <p className="text-3xl font-black text-rose-600 tracking-tighter mb-1">
              {analytics.lowStockArticles.length} <span className="text-sm font-bold opacity-60">Ruptures</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest underline underline-offset-4">Action Requise</span>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-emerald-50/30 p-8 rounded-[2.5rem] border border-emerald-100/50 shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <TrendingUp className="w-16 h-16" />
            </div>
            <p className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3">Entrées (24H)</p>
            <p className="text-3xl font-black text-emerald-600 tracking-tighter mb-1">
              {analytics.totalEntreesValue.toLocaleString()} <span className="text-sm font-bold opacity-60">DH</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Flux d'Approvisionnement</span>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-sky-50/30 p-8 rounded-[2.5rem] border border-sky-100/50 shadow-sm" style={{ backgroundColor: 'rgba(14, 165, 233, 0.05)' }}>
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <TrendingDown className="w-16 h-16" />
            </div>
            <p className="text-[11px] font-black text-sky-400 uppercase tracking-[0.2em] mb-3">Sorties (24H)</p>
            <p className="text-3xl font-black text-sky-600 tracking-tighter mb-1">
              {analytics.totalSortiesValue.toLocaleString()} <span className="text-sm font-bold opacity-60">DH</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <TrendingDown className="w-3 h-3 text-sky-500" />
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Consommation Chantiers</span>
            </div>
          </div>
        </div>

        {/* --- CHARTS & VISUAL DATA --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Stock by Site Chart */}
          <div className="bg-slate-50/50 rounded-[3rem] p-10 border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
              <MapPin className="w-4 h-4 text-sky-500" /> Répartition Financière par Site Operational
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.siteChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'rgba(56, 189, 248, 0.05)' }} 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: '#fff', fontSize: '12px' }} 
                  />
                  <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
                    {analytics.siteChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Type Distribution Chart */}
          <div className="bg-slate-50/50 rounded-[3rem] p-10 border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
              <Layers className="w-4 h-4 text-indigo-500" /> Analyse Structurelle par Type d'Article
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.typeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {analytics.typeChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: '#fff', fontSize: '12px' }} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center" 
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- ACTIVITY TRENDS --- */}
        <section className="bg-slate-900 rounded-[3.5rem] p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/20 rounded-full blur-[100px] -mr-48 -mt-48" />
          <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/3">
              <h3 className="text-xs font-black text-sky-400 mb-4 uppercase tracking-[0.4em] flex items-center gap-3">
                <TrendingUp className="w-4 h-4" /> Analyse des Tendances
              </h3>
              <h4 className="text-3xl font-black tracking-tighter mb-4 leading-tight">Dynamique des Flux sur 7 Jours</h4>
              <p className="text-slate-400 text-sm font-medium italic">Analyse comparative des flux de réception (In) vs consommations (Out) consolidés sur l'ensemble du réseau.</p>
              
              <div className="mt-10 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Activité Peak</span>
                  <span className="text-lg font-black text-sky-400">Maroc SMI Central</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fréquence Mvts</span>
                  <span className="text-lg font-black text-white">High Intensity</span>
                </div>
              </div>
            </div>
            <div className="lg:w-2/3 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', background: '#1e293b', color: '#fff', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="entrees" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="sorties" stroke="#0ea5e9" strokeWidth={4} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* --- TOP CONSUMPTION & ALERT TABLES --- */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Top Products */}
          <section>
            <h3 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.4em] flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-emerald-500" /> Articles à Forte Consommation (Top 5)
            </h3>
            <div className="overflow-hidden border border-slate-100 rounded-[2.5rem] shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Produit / REF</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Quantité Total</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valeur Log.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {analytics.topConsumed.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 uppercase truncate max-w-[200px]">{item.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.ref}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-black text-slate-900">{item.qty} {item.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-black text-emerald-600">{item.value.toLocaleString()} DH</span>
                      </td>
                    </tr>
                  ))}
                  {analytics.topConsumed.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-xs font-bold text-slate-300 italic">No activity data for this cycle</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Transfers in progress */}
          <section>
            <h3 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.4em] flex items-center gap-3">
              <Truck className="w-4 h-4 text-sky-500" /> Flux de Transit Inter-Sites Actifs
            </h3>
            <div className="space-y-4">
              {transferts.filter(t => t.status === 'EN_TRANSIT').slice(0, 5).map(t => (
                <div key={t.id} className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">{t.reference}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                        {t.sourceSite} <ArrowRight className="w-3 h-3 text-slate-300" /> {t.targetSite}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-3 py-1 bg-sky-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">En Transit</span>
                    <span className="text-[9px] font-bold text-slate-400 mt-2 uppercase">{t.items.length} Références</span>
                  </div>
                </div>
              ))}
              {transferts.filter(t => t.status === 'EN_TRANSIT').length === 0 && (
                <div className="p-12 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                  <Package className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucun transit majeur détecté</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* --- SITE ANALYTICS GRID --- */}
        <section className="print:break-before-page">
          <h3 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.4em] flex items-center gap-3">
            <Package className="w-4 h-4 text-slate-400" /> Détails Capacité des Sites
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SITES.map(site => {
              const siteArticles = articles.filter(a => a.site === site.code);
              const siteValue = siteArticles.reduce((sum, a) => sum + (a.quantity * (a.price || 0)), 0);
              const lowStock = siteArticles.filter(a => a.quantity <= a.minStock).length;
              
              return (
                <div key={site.code} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className={cn(
                    "absolute top-0 right-0 w-32 h-32 blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity",
                    site.code === 'SMI' ? 'bg-sky-500' : 'bg-emerald-500'
                  )} />
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-4">{site.label}</h4>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Immo. Stock</span>
                      <span className="text-base font-black text-slate-900">{siteValue.toLocaleString()} DH</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertes</span>
                      <span className={cn("text-base font-black", lowStock > 0 ? "text-rose-500" : "text-emerald-500")}>{lowStock}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                       <div 
                         className="h-full bg-sky-500 rounded-full" 
                         style={{ width: `${Math.min(100, (siteArticles.length / 500) * 100)}%` }} 
                       />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- FINAL COMPLIANCE FOOTER --- */}
        <div className="pt-16 border-t-2 border-slate-100 mt-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
          <div className="max-w-md">
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">Certificat d'Authenticité Logistique</p>
            <p className="text-[11px] font-bold text-slate-400 italic leading-relaxed">
              Ce rapport constitue un document officiel de régulation logistique. Les données extraites proviennent du système de synchronisation en temps réel d'HYDROMINES. Toute exploitation commerciale est strictement réservée à la direction générale.
            </p>
            <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-4">SMI LOGISTIC ENGINE v2.0.4.821</p>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cachet Direction</p>
              <div className="w-32 h-32 border-4 border-slate-100 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden opacity-40">
                 <div className="absolute inset-0 flex items-center justify-center border-t border-b border-slate-100 rotate-[35deg] pointer-events-none" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] -rotate-12">SMI OFFICIAL</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification QR</p>
              <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center opacity-20 border border-slate-100">
                 <div className="grid grid-cols-4 grid-rows-4 gap-1 p-2">
                    {Array.from({length: 16}).map((_, i) => (
                      <div key={i} className={cn("w-2 h-2 rounded-[2px]", Math.random() > 0.5 ? "bg-slate-900" : "bg-transparent")} />
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Helper for specific lucide icons if they miss map pin elsewhere (just to be safe) */}
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
