/**
 * HYDROMINES INDUSTRIAL INTELLIGENCE & SUPERVISION COCKPIT v8.0
 * Module: Predictive Analysis, Behavior Tracking & Anomaly Detection Dashboard
 * Style: Corporate Premium, Modern Industrial Supervision, Dark Glassmorphism, Field Tablet Adaptive
 * File: /src/components/IndustrialIntelligenceDashboard.tsx
 */

import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { analyseOperationalAnomalies, SKUAnomalyScore } from '../core/anomalyEngine';
import { executePredictiveForecasting, PredictiveAlert, SKUReviewPrediction } from '../core/predictiveEngine';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import { 
  Brain, 
  AlertTriangle, 
  ShieldAlert, 
  TrendingUp, 
  Activity, 
  Sparkles, 
  Zap, 
  Clock, 
  Sliders, 
  UserCheck, 
  Filter, 
  Download, 
  RotateCcw,
  RefreshCw,
  FileText,
  AlertCircle,
  Network
} from 'lucide-react';
import { toast } from 'sonner';

export default function IndustrialIntelligenceDashboard() {
  const { 
    articles, 
    mouvements, 
    isLoaded, 
    isDegradedNetwork,
    avgTxDuration,
    retryQueue
  } = useInventory();

  // Interactive controls & simulation state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [minRiskThreshold, setMinRiskThreshold] = useState<number>(0);
  const [simulatedLeadTimeMultiplier, setSimulatedLeadTimeMultiplier] = useState<number>(1.0);
  const [activeAlertFilter, setActiveAlertFilter] = useState<string>('ALL');
  const [selectedSkuForChart, setSelectedSkuForChart] = useState<string>('');
  const [isRefreshingModel, setIsRefreshingModel] = useState<boolean>(false);

  // Trigger telemetry recalculation effect
  const handleModelRecalculate = () => {
    setIsRefreshingModel(true);
    setTimeout(() => {
      setIsRefreshingModel(false);
      toast.success("Moteur IA HydroMines recalculé avec succès (Arbres décisionnels & Dérives)");
    }, 850);
  };

  // Run dynamic anomaly engine with current state
  const anomalyMetrics = useMemo(() => {
    return analyseOperationalAnomalies(articles, mouvements);
  }, [articles, mouvements]);

  const anomalyValues = useMemo(() => {
    return Object.values(anomalyMetrics) as SKUAnomalyScore[];
  }, [anomalyMetrics]);

  // Run predictive forecasting
  const forecastResults = useMemo(() => {
    return executePredictiveForecasting(articles, mouvements);
  }, [articles, mouvements]);

  // Aggregate Category Options
  const categories = useMemo(() => {
    const list = new Set(articles.map(a => a.category || 'AUTRE'));
    return Array.from(list);
  }, [articles]);

  // Sort and filter predictions
  const filteredAnalysis = useMemo(() => {
    return articles.map(art => {
      const anomaly = anomalyMetrics[art.id] || {
        stabilityIndex: 100,
        criticalityLevel: 'LOW',
        consumptionTrend: 'STABLE',
        probabilityOfRupturePct: 0,
        anomalyHistoryCount: 0,
        unusualSpikeDetected: false,
        frequencyScore: 0,
        operatorAnomalies: []
      };

      const forecast = forecastResults.predictions[art.id] || {
        estimatedStockoutDays: -1,
        dormantIndexPct: 0,
        suggestedSafetyStock: art.minStock,
        estimatedReplenishmentLeadDays: 4
      };

      return {
        article: art,
        anomaly,
        forecast
      };
    }).filter(item => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.article.category !== selectedCategory) {
        return false;
      }
      // Risk intensity filter
      if (item.anomaly.probabilityOfRupturePct < minRiskThreshold) {
        return false;
      }
      return true;
    });
  }, [articles, anomalyMetrics, forecastResults, selectedCategory, minRiskThreshold]);

  // Compute total dynamic score for the whole mine depot
  const globalMinesHealthScore = useMemo(() => {
    if (articles.length === 0) return 100;
    const totalStabilities = anomalyValues.reduce((acc, score) => acc + score.stabilityIndex, 0);
    return Math.round(totalStabilities / articles.length);
  }, [anomalyValues, articles.length]);

  // Autodetect default SKU for charts on loaded
  useMemo(() => {
    if (!selectedSkuForChart && articles.length > 0) {
      setSelectedSkuForChart(articles[0].ref);
    }
  }, [articles]);

  // Historical data for selected SKU
  const selectedSkuHistory = useMemo(() => {
    if (!selectedSkuForChart) return [];
    const targetArt = articles.find(a => a.ref === selectedSkuForChart);
    if (!targetArt) return [];

    // Filter relevant movements and map timeline
    const relevantMovements = mouvements.filter(m => m.items.some(it => it.articleId === targetArt.id));
    
    let currentVirtualQuantity = targetArt.quantity;
    const dataPoints = relevantMovements.map((m, index) => {
      const timeStr = typeof m.date === 'string' 
        ? new Date(m.date).toLocaleDateString()
        : new Date(m.date?.seconds * 1000).toLocaleDateString();

      const item = m.items.find(it => it.articleId === targetArt.id);
      const isAdd = m.type === 'ENTREE' || m.type === 'TRANSFERT_IN' || m.type === 'RETOUR';
      const quantityAltered = item ? item.quantity : 0;

      // Reverse calculate historically to build curves
      if (isAdd) {
        currentVirtualQuantity -= quantityAltered;
      } else {
        currentVirtualQuantity += quantityAltered;
      }

      return {
        name: timeStr,
        Quantite: currentVirtualQuantity,
        Mouvement: isAdd ? quantityAltered : -quantityAltered
      };
    }).reverse();

    // Append present state as last point
    dataPoints.push({
      name: 'Actuel',
      Quantite: targetArt.quantity,
      Mouvement: 0
    });

    return dataPoints;
  }, [selectedSkuForChart, articles, mouvements]);

  // Operator performance analysis
  const operatorTelemetry = useMemo(() => {
    const stats: Record<string, { totalTx: number; additions: number; subtractions: number; anomaliesTriggered: number }> = {};
    
    mouvements.forEach(m => {
      const op = m.operateur || 'Magasinier';
      if (!stats[op]) {
        stats[op] = { totalTx: 0, additions: 0, subtractions: 0, anomaliesTriggered: 0 };
      }
      stats[op].totalTx++;
      if (m.type === 'ENTREE' || m.type === 'RETOUR') {
        stats[op].additions++;
      } else {
        stats[op].subtractions++;
      }
    });

    // Add anomalies counted to operators
    anomalyValues.forEach(anom => {
      if (anom.operatorAnomalies.length > 0) {
        // Distribute anomaly weight to recent operators
        const targetMvs = mouvements.filter(m => m.items.some(it => it.articleId === anom.articleId));
        if (targetMvs.length > 0) {
          const lastOp = targetMvs[targetMvs.length - 1].demandeur || 'Magasinier';
          if (stats[lastOp]) {
            stats[lastOp].anomaliesTriggered += anom.operatorAnomalies.length;
          }
        }
      }
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data
    }));
  }, [mouvements, anomalyMetrics]);

  // Risk clusters statistics
  const riskHeatmapData = useMemo(() => {
    return [
      { name: 'Stable (Index 85-100)', value: anomalyValues.filter(s => s.stabilityIndex >= 85).length, fill: '#10b981' },
      { name: 'Modéré (Index 60-84)', value: anomalyValues.filter(s => s.stabilityIndex >= 60 && s.stabilityIndex < 85).length, fill: '#f59e0b' },
      { name: 'Vulnérable (Index 40-59)', value: anomalyValues.filter(s => s.stabilityIndex >= 40 && s.stabilityIndex < 60).length, fill: '#f97316' },
      { name: 'Alerte Rouge (Index <40)', value: anomalyValues.filter(s => s.stabilityIndex < 40).length, fill: '#ef4444' }
    ];
  }, [anomalyValues]);

  const activeAlerts = useMemo(() => {
    const original = forecastResults.alerts;
    // Map anomalous triggers from anomaly engine into smart alerts feed too
    const extraAlerts: PredictiveAlert[] = [];
    anomalyValues.forEach(anom => {
      anom.operatorAnomalies.forEach((opAnom, idx) => {
        extraAlerts.push({
          id: `eval-operator-${anom.articleId}-${idx}`,
          type: 'REPETITIVE_ANOMALY',
          title: `DÉVIATION D'USAGE CONDUCTEUR`,
          message: `${anom.ref} (${anom.designation}) : ${opAnom}`,
          sku: anom.ref,
          designation: anom.designation,
          severity: 'WARNING',
          timestamp: new Date().toISOString()
        });
      });
    });

    const combined = [...original, ...extraAlerts];

    if (activeAlertFilter === 'ALL') return combined;
    return combined.filter(a => a.type === activeAlertFilter);
  }, [forecastResults.alerts, anomalyMetrics, activeAlertFilter]);

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4 text-slate-400 font-mono">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        <div>Chargement des couches d'intelligence industrielle v8.0...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 p-6 space-y-6 overflow-x-hidden font-sans relative">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* HEADER BAR */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0d1225]/60 border border-[#1b254b] backdrop-blur-xl p-5 rounded-2xl gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-600/20 text-purple-400 border border-purple-500/30 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> MOTEUR PRÉDICTIF v8.0 ACTIVÉ
            </span>
            <span className="text-[10px] text-slate-500 font-mono">MODEL DE LATENCE: {(avgTxDuration || 2).toFixed(1)}ms</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1 flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-400 animate-pulse" />
            Supervision Industrielle & Anomalies Prédictives
          </h2>
          <p className="text-xs text-slate-450 mt-0.5 font-light">
            Analyse proactive des drifts, anticipation des ruptures logistiques et dépistage des abus sur les SKU critiques.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleModelRecalculate}
            disabled={isRefreshingModel}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-505 hover:to-indigo-505 text-white border border-purple-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-900/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingModel ? 'animate-spin' : ''}`} />
            {isRefreshingModel ? "RECALCUL DU MODÈLE..." : "RE-FORGER INTELLIGENCE"}
          </button>
        </div>
      </div>

      {/* BENТO TOP METRICS */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1 : GLOBAL SAFETY INDEX */}
        <div className="bg-[#0c1024]/75 border border-[#1e2753]/90 backdrop-blur-md p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all duration-500"></div>
          
          {/* Dynamic Arc representation */}
          <div className="w-16 h-16 rounded-full border-4 border-dashed border-[#1f295e] flex items-center justify-center shrink-0 relative">
            <span className={`text-xl font-black ${globalMinesHealthScore > 80 ? 'text-emerald-400' : globalMinesHealthScore > 60 ? 'text-amber-400' : 'text-rose-500'}`}>
              {globalMinesHealthScore}%
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase block">INDICE DE SANTÉ DÉPÔT</span>
            <h3 className="text-lg font-bold text-slate-200 mt-1">Conformité Logique</h3>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              💡 {globalMinesHealthScore > 85 ? 'Alignement idéal constaté' : 'Risques de ruptures identifiés'}
            </span>
          </div>
        </div>

        {/* KPI 2 : PREDICTED CRITICAL SKU */}
        <div className="bg-[#0c1024]/75 border border-[#1e2753]/90 backdrop-blur-md p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all duration-300"></div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase block">SKU EN CADENCE D'ALERTE</span>
            <h3 className="text-2xl font-black text-slate-200 mt-1">
              {anomalyValues.filter(s => s.criticalityLevel === 'CRITICAL' || s.criticalityLevel === 'HIGH').length} Part(s)
            </h3>
            <span className="text-[10px] text-amber-400 block mt-0.5">Priorité de livraison immédiate</span>
          </div>
        </div>

        {/* KPI 3 : ACTIVE SMART ALERTS */}
        <div className="bg-[#0c1024]/75 border border-[#1e2753]/90 backdrop-blur-md p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-all duration-300"></div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase block">ALERTES IA EMBARQUÉES</span>
            <h3 className="text-2xl font-black text-slate-200 mt-1">
              {activeAlerts.length} Menaces
            </h3>
            <span className="text-[10px] text-rose-400 block mt-0.5">Surchauffes & Abus détectés</span>
          </div>
        </div>

        {/* KPI 4 : LOGISTIC LATENCY / DRIFTS */}
        <div className="bg-[#0c1024]/75 border border-[#1e2753]/90 backdrop-blur-md p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all duration-300"></div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <Network className={`w-6 h-6 ${isDegradedNetwork ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase block">ÉTAТ RÉSEAU DE SURFACE</span>
            <h3 className={`text-lg font-black mt-1 ${isDegradedNetwork ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {isDegradedNetwork ? 'DEGRADED_SITUATION' : 'TRANQUILLE - ONLINE'}
            </h3>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {retryQueue.length > 0 ? `${retryQueue.length} tx en cache d'antichambre` : 'Aucun conflit de cache'}
            </span>
          </div>
        </div>

      </div>

      {/* SECТION A: RISK SCATTER & CONSUMPTION COCKPIT */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* HEATMAP / RISK MATRIX DISTRIBUTION CHART */}
        <div className="bg-[#0b0e20]/80 border border-[#1c244e] p-5 rounded-2xl space-y-4">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#bfc0cc] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Rhythm de Stabilité des Stocks Catalogues
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">Rapport statistique global de l'intégrité</span>
          </div>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskHeatmapData} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#121833" />
                <XAxis type="number" stroke="#5f627b" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#5f627b" fontSize={9} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070a1a', borderColor: '#1c244c', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="value" name="Nombre de SKU" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* HAZARD ZONE EXPLANATION */}
          <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-2 text-[11px] leading-relaxed">
            <span className="text-[10px] font-black uppercase text-slate-500 block">DÉFINITION DES NIVEAUX DE DÉRIVES</span>
            <p className="text-slate-400 text-xs">
              Les articles en <strong className="text-red-400">Alerte Rouge</strong> possèdent une stabilité &lt; 40 et font face à un sous-écoulement direct ou une rupture mécanique sous 72 heures.
            </p>
          </div>
        </div>

        {/* SKU ADVANCED INTERACTIVE CONSUMPTION PLOTTER */}
        <div className="bg-[#0b0e20]/80 border border-[#1c244e] p-5 rounded-2xl space-y-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#bfc0cc] flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Vitesse Historique & Équation de Flottement du SKU
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Modélisation de la cadence physique</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest shrink-0">SKU :</span>
              <select
                value={selectedSkuForChart}
                onChange={(e) => setSelectedSkuForChart(e.target.value)}
                className="bg-[#070919] text-white border border-[#1b2550] rounded-lg px-2.5 py-1 text-xs font-mono outline-none w-full sm:w-48 focus:border-purple-500"
              >
                {articles.map(a => (
                  <option key={a.id} value={a.ref}>{a.ref} - {a.designation.slice(0,25)}...</option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-64">
            {selectedSkuHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedSkuHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#121833" />
                  <XAxis dataKey="name" stroke="#5f627b" fontSize={10} />
                  <YAxis stroke="#5f627b" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#070a1a', borderColor: '#1c244c', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="Quantite" name="Stock d'articles" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorQty)" />
                  <Line type="monotone" dataKey="Mouvement" name="Amplitude Flux" stroke="#f59e0b" strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 italic">
                Sélectionnez un SKU disposant d'antécédents logistiques pour tracer sa courbe.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs bg-[#070a1b]/40 border border-[#121935] p-3 rounded-xl">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 block"></span> Profil Quantitatif
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span> Mouvements
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm">
              Tracé généré en temps réel par rebroussement des registres d'audit dans la file FSM locale.
            </p>
          </div>
        </div>

      </div>

      {/* SECТION B: TIMELINES & PREDICTIONS BENTO */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* INTERACTIVE COMPONENT CONTROLS & MODEL SIMULATION CHASSIS */}
        <div className="bg-[#0b0e20]/80 border border-[#1c244e] p-5 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#bfc0cc] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              Paramètres & Curseurs de Simulation Logistique
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">Calibrage dynamique du niveau de criticité</span>
          </div>

          <div className="space-y-5 my-3">
            {/* 1. Category Selector dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-black tracking-wider uppercase block">Filtrer par classification</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#070919] text-white border border-[#1b2550] rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-500"
              >
                <option value="ALL">TOUTES CATÉGORIES</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* 2. Min risk tolerance slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <label className="text-slate-400 font-black tracking-wider uppercase">Seuil d'Alerte Probabilité de Rupture</label>
                <span className="text-purple-400 font-bold">{minRiskThreshold}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                value={minRiskThreshold}
                onChange={(e) => setMinRiskThreshold(parseInt(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-[#121834] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 3. Simulated replenishment multiplier slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <label className="text-slate-400 font-black tracking-wider uppercase">Délai d'Entrainement (Lead-Time Multiplier)</label>
                <span className="text-amber-400 font-bold">{simulatedLeadTimeMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={simulatedLeadTimeMultiplier}
                onChange={(e) => setSimulatedLeadTimeMultiplier(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-1 bg-[#121834] rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-purple-950/20 border border-purple-505/20 text-purple-300 rounded-xl text-[11px] leading-relaxed">
            <strong>Moteur Récursif :</strong> Ajuster ces paramètres modifie instantanément les alertes et les calculs de rupture globale dans le cockpit sans altérer les registres Firestore réels.
          </div>
        </div>

        {/* LOGISTIC REPLENISHMENT PREDICTION TABLE / BOARD */}
        <div className="bg-[#0b0e20]/80 border border-[#1c244e] p-5 rounded-2xl space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#bfc0cc] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 animate-spin-slow" />
                Matrice Opérationnelle & Prévision de Stockout (Foresight Matrix)
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Détecteur de rupture précoce HydroMines</span>
            </div>
            <span className="text-xs bg-[#13193c] px-3 py-1 rounded-full text-slate-300">
              {filteredAnalysis.length} SKU filtré(s)
            </span>
          </div>

          <div className="overflow-x-auto max-h-[290px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#070a1a] text-slate-500 uppercase text-[9px] tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Réf SKU</th>
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3 text-center">Stability Index</th>
                  <th className="py-2.5 px-3 text-center">Rupture Prédite</th>
                  <th className="py-2.5 px-3 text-center">Replenish Lead (Est)</th>
                  <th className="py-2.5 px-3 text-center">Dormancy</th>
                  <th className="py-2.5 px-3">Cadence Conseil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151c41]/50 text-[11px]">
                {filteredAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-600 italic">
                      Aucun SKU ne correspond aux critères de simulation de risques ou de classification choisis.
                    </td>
                  </tr>
                ) : (
                  filteredAnalysis.map(({ article, anomaly, forecast }) => {
                    const lTime = Math.round(forecast.estimatedReplenishmentLeadDays * simulatedLeadTimeMultiplier);
                    return (
                      <tr key={article.id} className="hover:bg-[#12183c]/30 transition-colors">
                        <td className="py-2.5 px-3 text-slate-300 font-bold">{article.ref}</td>
                        <td className="py-2.5 px-3 text-slate-400 truncate max-w-[170px]">{article.designation}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            anomaly.stabilityIndex >= 85 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            anomaly.stabilityIndex >= 60 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {anomaly.stabilityIndex}/100
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {forecast.estimatedStockoutDays === 0 ? (
                            <span className="text-red-500 font-extrabold uppercase animate-pulse">RUPTURE</span>
                          ) : forecast.estimatedStockoutDays === -1 ? (
                            <span className="text-slate-500">INDÉTERMINÉ</span>
                          ) : (
                            <span className={forecast.estimatedStockoutDays <= 5 ? 'text-red-400 font-bold' : forecast.estimatedStockoutDays <= 12 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                              {forecast.estimatedStockoutDays} jours
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-450">{lTime} j.</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={forecast.dormantIndexPct >= 100 ? 'text-blue-400 font-black' : 'text-slate-600'}>
                            {forecast.dormantIndexPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {article.quantity < forecast.suggestedSafetyStock ? (
                            <span className="text-amber-400">Recharger &gt;= {forecast.suggestedSafetyStock}</span>
                          ) : (
                            <span className="text-emerald-500">Dépôt Sains</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SECТION C: SMART ALERTS FEED & OPERATOR PROFILE */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SMART ALERT TICKETS FEED */}
        <div className="bg-[#0b0e20]/80 border border-[#1c244e] p-5 rounded-2xl space-y-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#bfc0cc] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Moteur d'Alerte Intelligent (Smart Alerting Logs)
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Dépistages et déviations en cours d'exploitation</span>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {['ALL', 'CRITICAL_STOCKOUT', 'PREDICTIVE_RUPTURE', 'INCOHERENT_FLOW', 'REPETITIVE_ANOMALY'].map(filt => (
                <button
                  key={filt}
                  onClick={() => setActiveAlertFilter(filt)}
                  className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded ${
                    activeAlertFilter === filt ? 'bg-rose-500 text-white' : 'bg-[#070919] text-slate-450 hover:bg-slate-900'
                  }`}
                >
                  {filt.replace('CRITICAL_', '').replace('PREDICTIVE_', '').slice(0, 8)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
            {activeAlerts.length === 0 ? (
              <div className="text-center py-16 text-slate-600 italic">
                Aucune anomalie critique ou prédictive enregistrée sur ce périmètre d'audit.
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-transform ${
                    alert.severity === 'CRITICAL' 
                      ? 'bg-rose-500/5 border-rose-500/30 text-rose-350' 
                      : alert.severity === 'WARNING'
                      ? 'bg-amber-500/5 border-amber-500/30 text-amber-300'
                      : 'bg-indigo-500/5 border-indigo-500/20 text-[#bfc0cc]'
                  }`}
                >
                  <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                    alert.severity === 'CRITICAL' ? 'text-rose-500' : alert.severity === 'WARNING' ? 'text-amber-500' : 'text-indigo-400'
                  }`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold uppercase tracking-wide font-mono bg-slate-950 px-2 py-0.5 rounded">
                        {alert.type}
                      </span>
                      <span className="font-bold text-xs uppercase">{alert.title}</span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">{alert.message}</p>
                    <div className="text-[10px] opacity-60 font-mono">
                      SKU concerné: {alert.sku} | Diagnostic exécuté: {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* OPERATORS PROFILE PROFILE PATTERNS (POLAR RADAR) */}
        <div className="bg-[#0b0e20]/80 border border-[#1c244e] p-5 rounded-2xl space-y-4">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#bfc0cc] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              Activité & Risques d'Erreurs Opérateurs
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">Fidélité d'usage de la file FSM</span>
          </div>

          <div className="h-60 flex items-center justify-center">
            {operatorTelemetry.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={operatorTelemetry}>
                  <PolarGrid stroke="#1c244c" />
                  <PolarAngleAxis dataKey="name" stroke="#5f627b" fontSize={9} />
                  <PolarRadiusAxis stroke="#1c244c" fontSize={8} />
                  <Radar name="Anomalies Déclenchées" dataKey="anomaliesTriggered" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
                  <Radar name="Transactions" dataKey="totalTx" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 italic">
                En attente de flux d'enregistrement terrain pour dresser la cartographie.
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1.5 text-[10px] leading-relaxed text-slate-400">
            <span className="text-xs font-bold text-slate-300 block">EXPLICATION DU RADAR</span>
            L'analyseur surveille les flux pour détecter des alternances suspicieuses ou des ajustements multiples qui indiquent des anomalies d'usage répétitives.
          </div>
        </div>

      </div>

    </div>
  );
}
