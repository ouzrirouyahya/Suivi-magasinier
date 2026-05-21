import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Fingerprint, 
  History, 
  Activity, 
  AlertTriangle, 
  Eye, 
  ShieldCheck, 
  UserX, 
  Clock, 
  Zap, 
  Gavel, 
  Scale,
  Wifi,
  WifiOff,
  Database,
  Play,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  FileText,
  RefreshCcw,
  Sliders,
  Calendar
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { motion } from 'motion/react';
import { useInventory } from '../../context/InventoryContext';
import { reconstructStockAtDate } from '../../lib/industrialSystems';

interface FraudAudit {
  fraudScore: number;
  threatLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'STABLE';
  threats: {
    id: string;
    type: 'FRAUD' | 'COMPLIANCE' | 'BEHAVIORAL';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    logic: string;
    evidence: string;
    userConcerned: string;
    riskScore: number;
  }[];
  behavioralInsights?: {
     speedAnomalies: number;
     afterHoursActivity: number;
     editingPatterns: string;
  };
}

interface ForensicIntelligenceProps {
  fraudAudit: FraudAudit | null;
  analyzing: boolean;
  onRun: (type: 'FRAUD') => void;
}

export const ForensicIntelligence = ({ fraudAudit, analyzing, onRun }: ForensicIntelligenceProps) => {
  const { 
    articles, 
    mouvements, 
    techLogs, 
    retryQueue, 
    dlq, 
    avgTxDuration, 
    txStats, 
    isDegradedNetwork, 
    setDegradedNetwork,
    forceRunQueue, 
    clearDLQ, 
    simulateRuleFailure, 
    simulateConcurrentConflicts 
  } = useInventory();

  // Replay states
  const [replayDate, setReplayDate] = useState<string>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 16);
  });
  const [replaySite, setReplaySite] = useState<'SMI' | 'MRK' | 'BGH' | 'OUZ'>('SMI');
  const [replayedStocks, setReplayedStocks] = useState<any | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);

  const handleRunReplay = () => {
    setIsReplaying(true);
    setTimeout(() => {
      const past = reconstructStockAtDate(articles, mouvements, new Date(replayDate), replaySite);
      setReplayedStocks(past);
      setIsReplaying(false);
    }, 450);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'ELEVATED': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      {/* 1. TOP STATS BOARD */}
      <div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
          <Activity className="w-6 h-6 text-indigo-600" /> Observabilité Transactionnelle Temps-Réel
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6 bg-slate-950 text-white border-none flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] -mr-16 -mt-16" />
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Délai de Réponse Moyen</p>
              <p className="text-4xl font-black tracking-tighter text-white">{avgTxDuration} <span className="text-sm font-bold">ms</span></p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Transactions Optimales</span>
            </div>
          </div>

          <div className={cn(
            "card p-6 border-none flex flex-col justify-between relative overflow-hidden transition-all duration-300",
            txStats.contentions > 0 ? "bg-amber-950 text-amber-200" : "bg-slate-900 text-slate-300"
          )}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Alerte Contention / Verrou</p>
              <p className="text-4xl font-black tracking-tighter text-white">{txStats.contentions}</p>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-80 mt-4">
              {txStats.contentions > 0 ? "⚠️ Risque de blocage SQL résolu !" : "Aucun ralentissement d'écriture"}
            </p>
          </div>

          <div className={cn(
            "card p-6 border-none flex flex-col justify-between relative overflow-hidden transition-all duration-300",
            retryQueue.length > 0 ? "bg-sky-950 text-sky-200 animate-pulse" : "bg-slate-900 text-slate-300"
          )}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-1">File de Synchro Hors-Ligne</p>
              <p className="text-4xl font-black tracking-tighter text-white">{retryQueue.length}</p>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-80 mt-4 flex items-center gap-2">
              {retryQueue.length > 0 ? (
                <>
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                  Reprise programmée active
                </>
              ) : "Réseau principal en ligne"}
            </p>
          </div>

          <div className={cn(
            "card p-6 border-none flex flex-col justify-between relative overflow-hidden transition-all duration-300",
            dlq.length > 0 ? "bg-rose-950 text-rose-300" : "bg-slate-900 text-slate-300"
          )}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Dead Letter Queue (DLQ)</p>
              <p className="text-4xl font-black tracking-tighter text-white">{dlq.length}</p>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-80 mt-4">
              {dlq.length > 0 ? "🔴 Erreur de sécurité/métier !" : "Aucune transaction rejetée"}
            </p>
          </div>
        </div>
      </div>

      {/* 2. ADVERSARIAL SANDBOX AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CONTROL PANEL */}
        <div className="card p-8 bg-slate-50 border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Sliders className="w-6 h-6 text-slate-900" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-950">Sandbox Adversaire (Phase 2)</h3>
            </div>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed mb-6">
              Outils industriels de test et de simulation pour vérifier la résilience de l'application face aux pannes réseau et aux failles de sécurité.
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={() => setDegradedNetwork(!isDegradedNetwork)}
                className={cn(
                  "w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-between px-4",
                  isDegradedNetwork ? "bg-amber-600 text-white shadow-xl shadow-amber-200" : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                )}
              >
                <div className="flex items-center gap-2">
                  {isDegradedNetwork ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                  <span>Simuler Panne/Lenteur Réseau</span>
                </div>
                <span className="text-[10px] uppercase font-black">{isDegradedNetwork ? "Actif (2.5s)" : "Inactif"}</span>
              </button>

              <button 
                onClick={simulateRuleFailure}
                className="w-full h-11 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-left px-4 flex items-center justify-between"
              >
                <span>Crash-test Règles Firestore (Audit)</span>
                <ShieldAlert className="w-4 h-4" />
              </button>

              <button 
                onClick={simulateConcurrentConflicts}
                className="w-full h-11 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-left px-4 flex items-center justify-between"
              >
                <span>Injection Concurrence Tx ×5</span>
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200/60 flex gap-3">
            <button 
              disabled={retryQueue.length === 0}
              onClick={forceRunQueue}
              className="flex-1 h-10 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Forcer file
            </button>
            <button 
              disabled={dlq.length === 0}
              onClick={clearDLQ}
              className="flex-1 h-10 bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> Vider DLQ
            </button>
          </div>
        </div>

        {/* SYSTEM TECHNICAL TRACE LOG */}
        <div className="card p-8 bg-slate-950 text-emerald-400 border-none col-span-1 lg:col-span-2 flex flex-col h-[400px] justify-between relative">
          <div className="absolute top-4 right-4 text-[9px] font-black tracking-widest bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded uppercase font-mono">
            LIVE TRACE
          </div>
          
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <Database className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Journal Industriel Forensic</h3>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-2 pr-2 scrollbar-none">
            {techLogs.map((log) => (
              <div key={log.id} className="border-b border-white/5 pb-2">
                <div className="flex items-center justify-between text-[9px] text-slate-500 mb-0.5">
                  <span>{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</span>
                  {log.duration && <span className="text-emerald-500 font-bold">⏱️ {Math.round(log.duration)}ms</span>}
                </div>
                <div className="flex items-start gap-1.5">
                  <span className={cn(
                    "font-bold text-[9px] px-1 rounded shrink-0",
                    log.type === 'ERROR' ? 'bg-rose-900 text-rose-200' :
                    log.type === 'WARN' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                  )}>
                    {log.type}
                  </span>
                  <span className="text-slate-300 break-all leading-tight">{log.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. HISTORICAL STOCK LEVEL REPLAY (INVENTORY REPLAY) */}
      <div className="card p-8 bg-white border border-slate-100 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" /> Reconstitution Rétrospective (Inventory Replay)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Calculez l'état exact des stocks mathématiques à n'importe quelle date du passé par rembobinage transactionnel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1">Site Industriel</label>
              <select 
                value={replaySite}
                onChange={(e) => setReplaySite(e.target.value as any)}
                className="h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-black uppercase"
              >
                <option value="SMI">SMI - Mine d'Argent</option>
                <option value="MRK">MRK - Mine d'Or</option>
                <option value="BGH">BGH - Site Nord</option>
                <option value="OUZ">OUZ - Site Ouzrir</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1">Date Target</label>
              <input 
                type="datetime-local"
                value={replayDate}
                onChange={(e) => setReplayDate(e.target.value)}
                className="h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold"
              />
            </div>

            <button 
              onClick={handleRunReplay}
              disabled={isReplaying}
              className="h-10 px-6 bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-40 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 self-end"
            >
              {isReplaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Lancer Rejeu
            </button>
          </div>
        </div>

        {replayedStocks ? (
          <div className="overflow-x-auto">
            <p className="text-[10px] font-black uppercase text-indigo-600 mb-4 tracking-wider bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-lg inline-block">
              ✓ Comparatif Reconstitué au {new Date(replayDate).toLocaleString('fr-FR')} pour le site {replaySite}
            </p>
            
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="py-2">Matériel</th>
                  <th className="py-2">Indice Réf</th>
                  <th className="py-2 text-right">Quantité Historique</th>
                  <th className="py-2 text-right">Quantité Présente (Live)</th>
                  <th className="py-2 text-right">Écart Net (Delta)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {Object.entries(replayedStocks).map(([artId, stock]: any) => {
                  const liveArt = articles.find(a => a.id === artId);
                  const liveQty = liveArt ? liveArt.quantity : 0;
                  const delta = liveQty - stock.quantity;

                  return (
                    <tr key={artId} className="hover:bg-slate-50/50">
                      <td className="py-3 font-semibold text-slate-900">{stock.designation}</td>
                      <td className="py-3"><span className="font-mono text-[10px] bg-slate-100 py-0.5 px-1.5 rounded">{stock.ref}</span></td>
                      <td className="py-3 text-right font-bold text-slate-700">{stock.quantity} un.</td>
                      <td className="py-3 text-right font-bold text-slate-400">{liveQty} un.</td>
                      <td className="py-3 text-right font-black">
                        {delta > 0 ? (
                          <span className="text-emerald-600">+{delta} (Reçu)</span>
                        ) : delta < 0 ? (
                          <span className="text-rose-600">{delta} (Sorti/Consommé)</span>
                        ) : (
                          <span className="text-slate-400">0 (Stable)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs uppercase font-black uppercase">
            Aucun calcul actif. Sélectionnez un site et une date puis cliquez sur "Lancer Rejeu".
          </div>
        )}
      </div>

      {/* 4. BEHAVIORAL FORENSIC ANALYSIS (AI SECTION CONDITIONAL DISPLAY) */}
      <div className="border-t border-slate-200 pt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <Fingerprint className="w-6 h-6 text-rose-500" /> Profilage Forensic & Risques IA
          </h2>
          {!fraudAudit && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase">
              Scan Requis
            </span>
          )}
        </div>

        {!fraudAudit ? (
          <div className="card p-16 text-center bg-slate-900 border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-[90px]" />
            
            <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30 mb-6">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Analyse Forensic AI Exigée</h3>
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest leading-relaxed mb-8">
                Le moteur a besoin d'isoler les signatures comportementales pour estimer le risque de fraude et d'activité occulte.
              </p>
              <button 
                disabled={analyzing}
                onClick={() => onRun('FRAUD')} 
                className="btn h-12 bg-rose-600 hover:bg-rose-500 font-black text-white px-8 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-rose-950 transition-all"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Lancer le Scan Forensic
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="card p-8 bg-slate-900 border-slate-800 text-white lg:col-span-2 space-y-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Fingerprint className="w-32 h-32" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Menace Profilage Actuelle</h3>
                </div>
                
                <div className="flex items-end gap-3 mb-4">
                  <span className="text-7xl font-black tracking-tighter leading-none">{fraudAudit.fraudScore}</span>
                  <span className="text-lg font-bold text-slate-500 mb-1">/ 100</span>
                </div>

                <div className={cn("inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border mb-8", getLevelColor(fraudAudit.threatLevel))}>
                  {fraudAudit.threatLevel} PROFILE IDENTIFIED
                </div>

                <div className="space-y-4">
                  {fraudAudit.threats.map((threat) => (
                    <div key={threat.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 bg-rose-950 text-rose-300 text-[8px] font-black uppercase rounded">{threat.type}</span>
                        <span className="text-[10px] font-black text-slate-400">OBJET: {threat.userConcerned}</span>
                      </div>
                      <h4 className="text-xs font-black uppercase text-white mb-1">{threat.logic}</h4>
                      <p className="text-[11px] font-bold text-slate-400 italic">Preuve: {threat.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-6 bg-slate-900 text-white border-slate-800">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400 mb-6 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Radar de Comportement
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase mb-2">
                      <span className="text-slate-400">Intégrité des Données</span>
                      <span className="text-emerald-400">82%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '82%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase mb-2">
                      <span className="text-slate-400">Risque de Collusion</span>
                      <span className="text-rose-400">45%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] font-black uppercase mb-2">
                      <span className="text-slate-400">Activités Hors Heures</span>
                      <span className="text-amber-400">12 incs</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                  <h4 className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-2">Modèles Édit-Pattern</h4>
                  <p className="text-[11px] font-semibold text-slate-300 italic leading-relaxed">
                     "{fraudAudit.behavioralInsights?.editingPatterns || "Pas d'excès d'effacements détecté récemment."}"
                  </p>
                </div>
              </div>

              <div className="card p-6 bg-rose-600 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5" />
                  <h4 className="text-xs font-black uppercase tracking-widest italic">Directives Gouvernance</h4>
                </div>
                <p className="text-[10px] font-black uppercase leading-tight opacity-90 mb-6">
                  Veuillez engager de strictes procédures de vérification contradictoire pour les profils signalés.
                </p>
                <button className="w-full h-11 bg-slate-950 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-900 transition-colors">
                  Générer Enquête PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
