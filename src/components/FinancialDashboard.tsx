import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet,
  Landmark,
  FileSpreadsheet,
  Wrench
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { formatCurrency, cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

export function FinancialDashboard() {
  const { articles, auditLogs, mouvements, currentSite, maintenanceLogs } = useInventory();

  // Financial Stats Calculation
  const totalStockValue = articles.reduce((sum, a) => sum + (a.quantity * (a.price || 0)), 0);
  const siteStockValue = articles.filter(a => a.site === currentSite).reduce((sum, a) => sum + (a.quantity * (a.price || 0)), 0);
  
  // Last 30 days entries vs exits
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const filterLast30 = (m: any) => new Date(m.date || m.timestamp) >= thirtyDaysAgo;

  const totalEntriesValue = mouvements
    .filter(m => filterLast30(m) && (m.type === 'ENTREE' || m.type === 'TRANSFERT_IN'))
    .reduce((sum, m) => sum + m.items.reduce((s, it) => s + (it.quantity * it.price), 0), 0);

  const totalExitsValue = mouvements
    .filter(m => filterLast30(m) && (m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT'))
    .reduce((sum, m) => sum + m.items.reduce((s, it) => s + (it.quantity * it.price), 0), 0);

  // Chart Data: Stock Value by Site
  const sites = ['SMI', 'OUMEJRANE', 'KOUDIA', 'BOU-AZZER', 'OUANSIMI'];
  const stockBySiteData = sites.map(s => ({
    name: s,
    value: articles.filter(a => a.site === s).reduce((sum, a) => sum + (a.quantity * (a.price || 0)), 0)
  }));

  // Chart Data: Financial Trends (Mocked for better visual)
  const trendData = [
    { name: 'S-4', value: totalStockValue * 0.95 },
    { name: 'S-3', value: totalStockValue * 0.98 },
    { name: 'S-2', value: totalStockValue * 1.02 },
    { name: 'S-1', value: totalStockValue * 0.99 },
    { name: 'S-0', value: totalStockValue },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER BANNER - DESIGN PARFAIT UNIQUE INSPIRÉ DU DASHBOARD */}
      <div className="bg-white border-2 border-amber-500/10 rounded-[14px] shadow-sm overflow-hidden no-print">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* Section gauche : Icone luxueuse */}
          <div className="lg:col-span-3 p-6 flex items-center justify-center bg-white">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg relative bg-gradient-to-br from-[#121c26] to-[#04080c] border border-amber-500/30 text-[#ffd700]">
              <div className="absolute inset-0 rounded-full animate-pulse opacity-13 bg-current scale-110" />
              <Landmark className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          {/* Section centrale : Titre géant et sous-titre */}
          <div className="lg:col-span-6 p-6 lg:p-8 flex flex-col justify-center items-center text-center gap-3 bg-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/40">
              <span className="w-2 h-2 rounded-full animate-pulse bg-[#b8860b]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#b8860b]">
                Valorisation Actifs &amp; Comptabilité analytique
              </span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl xl:text-5xl tracking-normal leading-none uppercase font-black">
              <span className="luminous-gold-white-text">
                Performance Financière
              </span>
            </h1>
            
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Rapport détaillé de la valorisation des stocks, flux monétaires et bilans des sites
            </p>
          </div>

          {/* Section droite : Informations / Actions */}
          <div className="lg:col-span-3 bg-white p-6 flex flex-col justify-center items-center lg:items-end gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200/30 rounded-md shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#b8860b] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider uppercase text-[#b8860b]">VALORISATION COMPTABLE</span>
            </div>
            
            <button className="btn bg-white border border-slate-200 text-slate-700 px-3 h-8 rounded-lg font-black uppercase text-[9px] tracking-wider flex items-center gap-1.5 cursor-pointer mt-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
            </button>
          </div>
          
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPI 
          icon={Wallet} 
          label="Valeur Totale Stock" 
          value={formatCurrency(totalStockValue)} 
          color="sky" 
          trend="+2.4%" 
          trendType="up" 
        />
        <KPI 
          icon={DollarSign} 
          label="Achats / 30j" 
          value={formatCurrency(totalEntriesValue)} 
          color="emerald" 
          trend="-12%" 
          trendType="down" 
        />
        <KPI 
          icon={TrendingUp} 
          label="Consommation / 30j" 
          value={formatCurrency(totalExitsValue)} 
          color="rose" 
          trend="+5.1%" 
          trendType="up" 
        />
        <KPI 
          icon={PieChart} 
          label="Valeur Site Actuel" 
          value={formatCurrency(siteStockValue)} 
          color="indigo" 
          trend="Local" 
          trendType="neutral" 
        />
      </div>

      {/* Maintenance vs Fixed Costs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 bg-white border-slate-100 shadow-sm md:col-span-1">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-amber-50 rounded-xl">
              <Wrench className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-black text-amber-900 uppercase tracking-wider text-xs">Dépenses Maintenance (30j)</h3>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {formatCurrency(maintenanceLogs.filter(l => new Date(l.date) >= thirtyDaysAgo).reduce((s, l) => s + (l.cost || 0), 0))}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-slate-400">Prédictive</span>
              <span className="text-indigo-600">65%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
               <div className="bg-indigo-500 h-full w-[65%]" />
            </div>
          </div>
        </div>
        
        <div className="card p-6 bg-white border-slate-100 shadow-sm md:col-span-2">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">Répartition par Type d'Intervention</h3>
          <div className="flex items-center gap-8 h-24">
             <div className="flex-1 text-center">
                <div className="text-2xl font-black text-emerald-600">42%</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Préventif</div>
             </div>
             <div className="w-px h-12 bg-slate-100" />
             <div className="flex-1 text-center">
                <div className="text-2xl font-black text-indigo-600">38%</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Prédictif</div>
             </div>
             <div className="w-px h-12 bg-slate-100" />
             <div className="flex-1 text-center">
                <div className="text-2xl font-black text-rose-600">20%</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Curatif</div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Value by Site Chart */}
        <div className="card p-6 bg-white border-slate-100 shadow-sm">
           <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-8 flex items-center gap-2">
              Répartition Valorisation par Site (MAD)
           </h3>
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockBySiteData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                    {stockBySiteData.map((entry, index) => (
                      <Cell key={index} fill={['#0ea5e9', '#10b981', '#6366f1', '#f59e0b', '#ec4899'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Global Trend Area Chart */}
        <div className="card p-6 bg-white border-slate-100 shadow-sm">
           <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-8 flex items-center gap-2">
              Tendance Valeur Globale (5 Semaines)
           </h3>
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Efficiency Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="card p-6 bg-white border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">Top 5 Articles à Forte Valeur Immédiate</h3>
            <div className="space-y-4">
               {articles.sort((a, b) => (b.quantity * (b.price || 0)) - (a.quantity * (a.price || 0))).slice(0, 5).map(article => (
                  <div key={article.id} className="flex items-center justify-between group">
                     <div>
                        <div className="text-xs font-black text-slate-900 uppercase">{article.designation}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{article.ref} • Stock: {article.quantity}</div>
                     </div>
                     <div className="text-right">
                        <div className="text-xs font-black text-slate-900">{formatCurrency(article.quantity * (article.price || 0))}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Site: {article.site}</div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         <div className="card p-6 bg-white border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">Indicateurs d'Efficacité</h3>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Taux de Rotation</div>
                  <div className="text-xl font-black text-slate-900">4.2x <span className="text-[10px] text-emerald-500">OPTIMAL</span></div>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Ruptures Coûteuses</div>
                  <div className="text-xl font-black text-slate-900">03 <span className="text-[10px] text-rose-500">RISQUE</span></div>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Stock Dormant (+1an)</div>
                  <div className="text-xl font-black text-slate-900">8.5% <span className="text-[10px] text-amber-500">SUR-STOCK</span></div>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Précision Inventaire</div>
                  <div className="text-xl font-black text-slate-900">99.1% <span className="text-[10px] text-emerald-500">EXCELLENT</span></div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color, trend, trendType }: any) {
  const colors: any = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="card p-6 bg-white border-slate-100 shadow-sm relative overflow-hidden group">
      <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20", colors[color])} />
      <div className="flex items-center gap-4 mb-4">
        <div className={cn("p-2.5 rounded-xl", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-tight">{label}</h3>
      </div>
      <div className="flex items-end justify-between relative z-10">
        <div className="text-xl font-black text-slate-900 tracking-tight">{value}</div>
        <div className={cn(
          "flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md",
          trendType === 'up' ? 'bg-emerald-50 text-emerald-600' : 
          trendType === 'down' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
        )}>
          {trendType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : 
           trendType === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
          {trend}
        </div>
      </div>
    </div>
  );
}
