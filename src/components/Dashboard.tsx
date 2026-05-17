import React from 'react';
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
  ArrowRightLeft
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
import { Article, Mouvement, SiteCode } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface DashboardProps {
  site: SiteCode;
  articles: Article[];
  mouvements: Mouvement[];
  onAction: (page: any) => void;
}

const COLORS = ['#0ea5e9', '#991b1b', '#10b981', '#f59e0b', '#6366f1'];

export function Dashboard({ site, articles, mouvements, onAction }: DashboardProps) {
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
  } = React.useMemo(() => {
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

  const stockHealthPercent = totalArticles > 0 ? Math.round(((totalArticles - lowStockCount) / totalArticles) * 100) : 100;
  
  const lowStockItems = React.useMemo(() => 
    articles.filter(a => a.site === site && a.quantity <= a.minStock).slice(0, 5),
  [articles, site]);

  const recentMovements = React.useMemo(() => 
    mouvements.filter(m => m.site === site).slice(0, 8),
  [mouvements, site]);

  const stats = [
    { label: 'Valeur Immobilisée', value: formatCurrency(stockValue), icon: DollarSign, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Valeur en Risque', value: formatCurrency(valueAtRisk), icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', alert: valueAtRisk > (stockValue * 0.1) },
    { label: 'Ruptures Stock', value: lowStockCount, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', alert: lowStockCount > 0 },
    { label: 'Flux du Jour', value: formatCurrency(spendToday), icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Tableau de Bord</h2>
          <p className="text-sm md:text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-3 opacity-70">Tableau de commande & Surveillance active - Site {site}</p>
        </div>
        
        <div className="flex items-center gap-4 hidden md:flex">
          <div className="p-2 bg-white/80 backdrop-blur-md rounded-xl border border-slate-100 shadow-md flex items-center gap-3 ring-1 ring-slate-900/5">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Réseau</p>
              <p className="text-sm font-black text-emerald-600 uppercase mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
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
            onClick={() => stat.label === 'Ruptures Stock' ? onAction('ALERTES_STOCK') : null}
            className={cn(
              "card glass p-8 rounded-3xl border-l-[6px] border-slate-100 transition-all duration-300 hover:translate-y-[-4px] h-full",
              stat.alert ? "border-rose-500 bg-rose-50/20 cursor-pointer shadow-md shadow-rose-100/50" : "shadow-sm"
            )}
          >
            <div className="flex items-center justify-between mb-4">
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
              <div className="flex items-center justify-between mb-6">
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
                <div key={mov.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white transition-all border border-transparent hover:border-slate-100 group shadow-none hover:shadow-lg">
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
    </div>
  );
}
