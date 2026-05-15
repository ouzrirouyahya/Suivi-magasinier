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
  const siteArticles = articles.filter(a => a.site === site);
  const siteMouvements = mouvements.filter(m => m.site === site);

  // KPIs
  const totalArticles = siteArticles.length;
  const stockValue = siteArticles.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
  const lowStockCount = siteArticles.filter(a => a.quantity <= a.minStock).length;
  const stockHealthPercent = totalArticles > 0 ? Math.round(((totalArticles - lowStockCount) / totalArticles) * 100) : 100;
  
  const today = new Date().toISOString().split('T')[0];
  const spendToday = siteMouvements
    .filter(m => m.date.startsWith(today) && m.type === 'SORTIE')
    .reduce((acc, m) => acc + m.items.reduce((sum, item) => sum + (item.quantity * item.price), 0), 0);

  // Top 5 Most Expensive Items in Stock (Pareto)
  const topExpensiveItems = [...siteArticles]
    .sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price))
    .slice(0, 5)
    .map(a => ({ name: a.designation, value: a.quantity * a.price }));

  // Chart 1: Spend over time (Monthly)
  const months = ['Jan', 'Féb', 'Mar', 'Avr', 'Mai', 'Juin'];
  const chartData = months.map((m, i) => ({
    name: m,
    value: siteMouvements
      .filter(mov => mov.type === 'SORTIE' && new Date(mov.date).getMonth() === i)
      .reduce((acc, mov) => acc + mov.items.reduce((sum, item) => sum + (item.quantity * item.price), 0), 0)
  }));

  // Pareto Analysis (ABC Classification)
  const sortedByValue = [...siteArticles].sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price));
  const cumulativeValue = sortedByValue.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
  
  let currentSum = 0;
  const abcData = sortedByValue.reduce((acc, art) => {
    currentSum += (art.quantity * art.price);
    const percent = (currentSum / cumulativeValue) * 100;
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

  const lowStockItems = siteArticles.filter(a => a.quantity <= a.minStock).slice(0, 5);

  // --- Monthly Comparison Logic ---
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  
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

  const diffEntrees = prevMonthStats.entrees > 0 ? ((currentMonthStats.entrees - prevMonthStats.entrees) / prevMonthStats.entrees) * 100 : 0;
  const diffSorties = prevMonthStats.sorties > 0 ? ((currentMonthStats.sorties - prevMonthStats.sorties) / prevMonthStats.sorties) * 100 : 0;
  // --------------------------------

  // --- Advanced Analysis ---
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
  // --------------------------

  const stats = [
    { label: 'Valeur Immobilisée', value: formatCurrency(stockValue), icon: DollarSign, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Ruptures Stock', value: lowStockCount, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', alert: lowStockCount > 0 },
    { label: 'Précision Stock (ABC)', value: `A:${abcData.A} B:${abcData.B} C:${abcData.C}`, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Flux du Jour', value: formatCurrency(spendToday), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const recentMovements = siteMouvements.slice(0, 8);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-[9px] font-black uppercase tracking-widest rounded-md border border-sky-200">Hydromines Suivi v2.0</span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none uppercase">Tableau de Bord</h2>
          <p className="text-slate-500 font-medium mt-2 text-lg italic">Surveillance en temps réel : <span className="text-sky-600 font-black not-italic">{site}</span></p>
        </div>
        
        <div className="flex items-center gap-4 hidden md:flex">
          <div className="p-4 bg-white/80 backdrop-blur-md rounded-[2rem] border border-slate-100 shadow-xl flex items-center gap-4 ring-1 ring-slate-900/5">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ShieldIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status Réseau</p>
              <p className="text-xs font-black text-emerald-600 uppercase mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Opérationnel (MA)
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        {[
          { icon: ArrowDownLeft, label: 'Réception Marchandise', color: 'emerald', page: 'BON_ENTREE' },
          { icon: ArrowUpRight, label: 'Sortie / Consommation', color: 'rose', page: 'BON_SORTIE' },
          { icon: Truck, label: 'Transfert Inter-Site', color: 'sky', page: 'TRANSFERT' },
        ].map(action => (
          <button 
            key={action.page}
            onClick={() => onAction(action.page)}
            className={cn(
              "group relative overflow-hidden card glass p-8 flex flex-col items-start gap-4 transition-all duration-500",
              action.color === 'emerald' ? "hover:border-emerald-200" : action.color === 'rose' ? "hover:border-rose-200" : "hover:border-sky-200"
            )}
          >
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-5",
               action.color === 'emerald' ? "bg-emerald-500" : action.color === 'rose' ? "bg-rose-500" : "bg-sky-500"
            )} />
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform",
               action.color === 'emerald' ? "bg-emerald-100 text-emerald-600" : action.color === 'rose' ? "bg-rose-100 text-rose-600" : "bg-sky-100 text-sky-600"
            )}>
               <action.icon className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">{action.label}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 opacity-60">Action Instantanée</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            onClick={() => stat.label === 'Ruptures Stock' ? onAction('ALERTES_STOCK') : null}
            className={cn(
              "card glass p-6 border-l-4 transition-all duration-300 hover:translate-y-[-4px]",
              stat.alert ? "border-rose-500 bg-rose-50/20 cursor-pointer" : "border-slate-100"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-xl", stat.bg, stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className={cn("text-2xl font-black mt-1", stat.alert ? "text-rose-600" : "text-slate-900")}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="card glass p-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-sky-600" /> Flux de Consommation Mensuel
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(value) => `${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: '900', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card glass p-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                <Truck className="w-6 h-6 text-amber-600" /> Coût par Engin / Machine
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={machineChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} fontSize={9} fontWeight="bold" />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card glass p-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                <Package className="w-6 h-6 text-indigo-600" /> Top Consommation (Articles)
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumedArticlesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={120} fontSize={9} fontWeight="bold" />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card glass p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <ArrowRightLeft className="w-6 h-6 text-sky-600" /> Performance Mensuelle
                </h3>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VS Mois Précédent</p>
                </div>
              </div>
              
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Entrées (M)</p>
                  <div className="flex items-end justify-between">
                    <p className="text-lg font-black text-slate-900">{formatCurrency(currentMonthStats.entrees)}</p>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", diffEntrees >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                      {diffEntrees >= 0 ? '+' : ''}{diffEntrees.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                  <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Sorties (M)</p>
                  <div className="flex items-end justify-between">
                    <p className="text-lg font-black text-slate-900">{formatCurrency(currentMonthStats.sorties)}</p>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", diffSorties >= 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                      {diffSorties >= 0 ? '+' : ''}{diffSorties.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(value) => `${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} />
                    <Bar dataKey="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sorties" fill="#b91c1c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card glass p-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                <PieIcon className="w-6 h-6 text-emerald-600" /> Répartition ABC
              </h3>
              <div className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={abcChartData}
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
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
              <div className="mt-4 space-y-2">
                {abcChartData.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase">{item.name}</span>
                    <span className="text-sm font-black text-slate-900">{item.value} Réf</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card glass p-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" /> Alertes Stock Critiques
            </h3>
            <div className="space-y-4">
              {lowStockItems.length > 0 ? lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-2xl border border-rose-100">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{item.designation}</p>
                    <p className="text-[9px] font-bold text-rose-600 uppercase tracking-widest">{item.quantity} {item.unit} restants</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-rose-300" />
                </div>
              )) : (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-20" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tout est optimal</p>
                </div>
              )}
            </div>
            {lowStockItems.length > 0 && (
              <button 
                onClick={() => onAction('STOCK_CONSOMMABLES')}
                className="mt-6 w-full py-4 bg-white border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-colors"
              >
                Voir toutes les alertes
              </button>
            )}
          </div>
        </div>

        <div className="card glass p-8 flex flex-col h-full bg-slate-900/5 backdrop-blur-3xl border-slate-200/50">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
            <Activity className="w-6 h-6 text-sky-600" /> Flux Live
          </h3>
          <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {recentMovements.length > 0 ? recentMovements.map((mov) => {
              const total = mov.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
              return (
                <div key={mov.id} className="flex items-start gap-4 p-4 rounded-3xl hover:bg-white transition-all border border-transparent hover:border-slate-100 shadow-none hover:shadow-xl hover:shadow-slate-100 group">
                  <div className={cn(
                    "p-3 rounded-2xl flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm",
                    mov.type === 'ENTREE' ? "bg-emerald-500 text-white" : "bg-rose-800 text-white"
                  )}>
                    {mov.type === 'ENTREE' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 uppercase truncate">
                      {mov.type === 'ENTREE' ? mov.vendeur : mov.demandeur}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      {mov.items.length} Réf • {formatCurrency(total)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 font-mono text-slate-500 rounded-md truncate max-w-[100px]">{mov.reference}</span>
                      <span className="text-[8px] font-black text-slate-300 uppercase shrink-0">{new Date(mov.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20 grayscale">
                <Package className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Aucun flux récent</p>
              </div>
            )}
          </div>
          <button 
             onClick={() => onAction('AUDIT_LOG')}
             className="mt-8 w-full py-5 bg-slate-950 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 border-t border-white/10"
          >
            Inspecteur Auditeur
          </button>
        </div>
      </div>
    </div>
  );
}
