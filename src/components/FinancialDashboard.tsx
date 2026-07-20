import React, { useMemo } from 'react';
import { toDateString } from '../types';
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
import { SITE_CODES } from '../lib/constants';
import { toast } from 'sonner';
import { 
  exportToExcel, 
  formatArticlesSummaryDashboard, 
  formatMovementsSummaryDashboard 
} from '../utils/exportUtils';
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
  Area,
  Legend
} from 'recharts';

export function FinancialDashboard() {
  const { articles, auditLogs, mouvements, currentSite, maintenanceLogs, inventaires = [] } = useInventory();

  // Taux de Rotation Calculation
  const tauxRotationStats = useMemo(() => {
    const activeArticlesValue = articles
      .filter(a => a.active !== false)
      .reduce((sum, a) => sum + ((Number(a.quantity) || 0) * (Number(a.price) || 0)), 0);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const sortiesValue12Mois = mouvements
      .filter(m => m.type === 'SORTIE' && new Date(toDateString(m.date)) >= oneYearAgo)
      .reduce((sum, m) => sum + (m.items?.reduce((s, it) => s + ((Number(it.quantity) || 0) * (Number(it.price) || 0)), 0) || 0), 0);

    const taux = activeArticlesValue > 0 ? (sortiesValue12Mois / activeArticlesValue) : 0;
    
    let badge = 'LENT';
    let colorClass = 'text-rose-500';
    if (taux >= 3) {
      badge = 'OPTIMAL';
      colorClass = 'text-emerald-500';
    } else if (taux >= 1) {
      badge = 'MOYEN';
      colorClass = 'text-amber-500';
    }

    return {
      value: `${taux.toFixed(1)}x`,
      badge,
      colorClass
    };
  }, [articles, mouvements]);

  // Ruptures Coûteuses Calculation
  const rupturesStats = useMemo(() => {
    const count = articles.filter(a => 
      a.active !== false && 
      (a.minStock || 0) > 0 && 
      (a.quantity || 0) <= (a.minStock || 0) && 
      (Number(a.price) || 0) > 10000
    ).length;

    let badge = 'OK';
    let colorClass = 'text-emerald-500';
    if (count > 0) {
      badge = 'RISQUE';
      colorClass = 'text-rose-500';
    }

    return {
      value: count.toString().padStart(2, '0'),
      badge,
      colorClass
    };
  }, [articles]);

  // Stock Dormant (+1an) Calculation
  const dormantStats = useMemo(() => {
    const activeArticles = articles.filter(a => a.active !== false);
    const totalValue = activeArticles.reduce((sum, a) => sum + ((Number(a.quantity) || 0) * (Number(a.price) || 0)), 0);
    if (totalValue <= 0) {
      return {
        value: '0.0%',
        badge: 'SAIN',
        colorClass: 'text-emerald-500'
      };
    }

    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - 1);
    const thresholdTime = threshold.getTime();

    const activeQtyArticles = activeArticles.filter(a => (Number(a.quantity) || 0) > 0);
    const lastSortieDateMap: Record<string, number> = {};
    mouvements.forEach(m => {
      if (m.type === 'SORTIE') {
        const mTime = new Date(toDateString(m.date)).getTime();
        m.items?.forEach(it => {
          if (it.articleId) {
            const currentMax = lastSortieDateMap[it.articleId] || 0;
            if (mTime > currentMax) {
              lastSortieDateMap[it.articleId] = mTime;
            }
          }
        });
      }
    });

    let sumDormant = 0;
    activeQtyArticles.forEach(a => {
      const lastSortieTime = lastSortieDateMap[a.id];
      if (!lastSortieTime || lastSortieTime < thresholdTime) {
        sumDormant += (Number(a.quantity) || 0) * (Number(a.price) || 0);
      }
    });

    const percent = (sumDormant / totalValue) * 100;
    let badge = 'SAIN';
    let colorClass = 'text-emerald-500';
    if (percent > 5) {
      badge = 'SUR-STOCK';
      colorClass = 'text-amber-500';
    }

    return {
      value: `${percent.toFixed(1)}%`,
      badge,
      colorClass
    };
  }, [articles, mouvements]);

  // Précision Inventaire Calculation
  const precisionStats = useMemo(() => {
    const validInventaires = inventaires.filter(inv => inv.status === 'VALIDE');
    const allItems = validInventaires.flatMap(inv => inv.items || []);
    const matchingItems = allItems.filter(item => item.difference === 0).length;
    const precisionPercent = allItems.length > 0 ? (matchingItems / allItems.length * 100) : null;

    if (precisionPercent === null) {
      return {
        value: 'N/A',
        badge: 'Aucun inventaire validé',
        colorClass: 'text-slate-400'
      };
    }

    let badge = 'CRITIQUE';
    let colorClass = 'text-rose-500';
    if (precisionPercent >= 95) {
      badge = 'EXCELLENT';
      colorClass = 'text-emerald-500';
    } else if (precisionPercent >= 85) {
      badge = 'À SURVEILLER';
      colorClass = 'text-amber-500';
    }

    return {
      value: `${precisionPercent.toFixed(1)}%`,
      badge,
      colorClass
    };
  }, [inventaires]);

  // Financial Stats Calculation
  const totalStockValue = articles
    .filter(a => a.active !== false)
    .reduce((sum, a) => {
      const qty = Number(a.quantity) || 0;
      const price = Number(a.price) || 0;
      return sum + (qty * price);
    }, 0);

  const siteStockValue = articles
    .filter(a => a.active !== false && a.site === currentSite)
    .reduce((sum, a) => {
      const qty = Number(a.quantity) || 0;
      const price = Number(a.price) || 0;
      return sum + (qty * price);
    }, 0);
  
  // Last 30 days entries vs exits
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const filterLast30 = (m: any) => new Date(m.date || m.timestamp) >= thirtyDaysAgo;

  const totalEntriesValue = mouvements
    .filter(m => filterLast30(m) && (m.type === 'ENTREE' || m.type === 'TRANSFERT_IN'))
    .reduce((sum, m) => sum + (m.items?.reduce((s, it) => s + ((Number(it.quantity) || 0) * (Number(it.price) || 0)), 0) || 0), 0);

  const totalExitsValue = mouvements
    .filter(m => filterLast30(m) && (m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT'))
    .reduce((sum, m) => sum + (m.items?.reduce((s, it) => s + ((Number(it.quantity) || 0) * (Number(it.price) || 0)), 0) || 0), 0);

  // Chart Data: Stock Value by Site
  const sites = SITE_CODES;
  const stockBySiteData = sites.map(s => ({
    name: s,
    value: articles
      .filter(a => a.active !== false && a.site === s)
      .reduce((sum, a) => {
        const qty = Number(a.quantity) || 0;
        const price = Number(a.price) || 0;
        return sum + (qty * price);
      }, 0)
  }));

  const trendData = useMemo(() => {
    const weeks = [];
    for (let i = 4; i >= 0; i--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 7);

      const siteFilter = (m: typeof mouvements[0]) =>
        currentSite === 'ALL' ? true : m.site === currentSite;

      const calcValue = (types: string[]) =>
        mouvements
          .filter(m =>
            siteFilter(m) &&
            types.includes(m.type) &&
            m.date >= weekStart.toISOString() &&
            m.date < weekEnd.toISOString()
          )
          .reduce((sum, m) =>
            sum + (m.items?.reduce(
              (s, it) => s + ((Number(it.quantity) || 0) * (Number(it.price) || 0)),
              0
            ) || 0), 0);

      weeks.push({
        name: i === 0 ? 'Cette sem.' : `S-${i}`,
        entrees: Math.round(calcValue(['ENTREE', 'TRANSFERT_IN', 'RETOUR'])),
        sorties: Math.round(calcValue(['SORTIE', 'TRANSFERT_OUT'])),
      });
    }
    return weeks;
  }, [mouvements, currentSite]);

  const handleExportExcel = () => {
    if (currentSite !== 'ALL') {
      toast.error("Sélectionne 'Tous les sites' dans le menu en haut de l'application avant d'exporter — ce rapport compare les 5 chantiers entre eux.");
      return;
    }

    const siteLabel = currentSite === 'ALL' ? 'Tous chantiers' : currentSite;
    
    exportToExcel([
      {
        name: 'Résumé Stock',
        title: `Valorisation Comptable — ${siteLabel}`,
        data: formatArticlesSummaryDashboard(articles, mouvements)
      },
      {
        name: 'Mouvements',
        title: `Mouvements de Stock — ${siteLabel}`,
        data: formatMovementsSummaryDashboard(mouvements, articles)
      }
    ], `Rapport_Financier_${siteLabel}`);
    
    toast.success('Export Excel généré');
  };

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
            
            <button 
              onClick={handleExportExcel}
              className="btn bg-white border border-slate-200 text-slate-700 px-3 h-8 rounded-lg font-black uppercase text-[9px] tracking-wider flex items-center gap-1.5 cursor-pointer mt-1"
            >
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
            {formatCurrency(maintenanceLogs.filter(l => new Date(toDateString(l.date)) >= thirtyDaysAgo).reduce((s, l) => s + (l.cost || 0), 0))}
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
              {currentSite !== 'ALL' ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold max-w-sm leading-relaxed">
                    📊 Ce graphique compare les 5 chantiers entre eux — sélectionnez 'Tous les sites' dans le menu en haut de l'application pour l'afficher.
                  </p>
                </div>
              ) : (
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
              )}
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
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Area
                    type="monotone"
                    dataKey="entrees"
                    name="Entrées"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="sorties"
                    name="Sorties"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
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
               {[...articles].sort((a, b) => {
                  const valB = (Number(b.quantity) || 0) * (Number(b.price) || 0);
                  const valA = (Number(a.quantity) || 0) * (Number(a.price) || 0);
                  return valB - valA;
               }).slice(0, 5).map(article => {
                  const qty = Number(article.quantity) || 0;
                  const price = Number(article.price) || 0;
                  return (
                     <div key={article.id} className="flex items-center justify-between group">
                        <div>
                           <div className="text-xs font-black text-slate-900 uppercase">{article.designation}</div>
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{article.ref} • Stock: {qty}</div>
                        </div>
                        <div className="text-right">
                           <div className="text-xs font-black text-slate-900">{formatCurrency(qty * price)}</div>
                           <div className="text-[9px] font-bold text-slate-400 uppercase">Site: {article.site}</div>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>

         <div className="card p-6 bg-white border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">Indicateurs d'Efficacité</h3>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Taux de Rotation</div>
                  <div className="text-xl font-black text-slate-900">
                     {tauxRotationStats.value} <span className={cn("text-[10px] font-bold", tauxRotationStats.colorClass)}>{tauxRotationStats.badge}</span>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Ruptures Coûteuses</div>
                  <div className="text-xl font-black text-slate-900">
                     {rupturesStats.value} <span className={cn("text-[10px] font-bold", rupturesStats.colorClass)}>{rupturesStats.badge}</span>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Stock Dormant (+1an)</div>
                  <div className="text-xl font-black text-slate-900">
                     {dormantStats.value} <span className={cn("text-[10px] font-bold", dormantStats.colorClass)}>{dormantStats.badge}</span>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Précision Inventaire</div>
                  <div className="text-xl font-black text-slate-900">
                     {precisionStats.value} <span className={cn("text-[10px] font-bold", precisionStats.colorClass)}>{precisionStats.badge}</span>
                  </div>
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
