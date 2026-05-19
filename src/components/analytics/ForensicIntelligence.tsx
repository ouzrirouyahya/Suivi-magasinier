import React from 'react';
import { ShieldAlert, Fingerprint, History, Activity, AlertTriangle, Eye, ShieldCheck, UserX, Clock, Zap, Gavel, Scale } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { motion } from 'motion/react';

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
  if (!fraudAudit) {
    return (
      <div className="card p-24 text-center bg-slate-900 border-slate-800 flex flex-col items-center justify-center min-h-[500px] shadow-2xl relative overflow-hidden">
        {/* Background pulses */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30 mb-8 animate-bounce transition-all">
                <ShieldAlert className="w-12 h-12 text-rose-500" />
            </div>
            <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Audit Forensic Requis</h3>
            <p className="text-slate-400 font-bold max-w-md mx-auto mb-10 uppercase text-xs tracking-widest leading-relaxed">
              Le système a détecté des signaux de bruit dans les logs. Activez l'analyse neuronale pour identifier les schémas de fraude et les anomalies comportementales.
            </p>
            <button 
                disabled={analyzing}
                onClick={() => onRun('FRAUD')} 
                className={cn(
                    "group relative px-12 h-16 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center gap-4 shadow-[0_0_40px_rgba(225,29,72,0.4)] hover:shadow-[0_0_60px_rgba(225,29,72,0.6)] disabled:opacity-50",
                    analyzing && "animate-pulse"
                )}
            >
                {analyzing ? (
                    <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 animate-spin" />
                        Scanning...
                    </div>
                ) : (
                    <>
                        <Fingerprint className="w-6 h-6 group-hover:scale-125 transition-transform" />
                        Lancer l'Audit FBI
                    </>
                )}
            </button>
        </div>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'ELEVATED': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card p-8 bg-slate-900 border-slate-800 text-white col-span-1 lg:col-span-2 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Fingerprint className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Niveau de Menace Actuel</h3>
            </div>
            <div className="flex items-end gap-4 mb-4">
               <span className="text-8xl font-black tracking-tighter leading-none">{fraudAudit.fraudScore}</span>
               <span className="text-xl font-bold text-slate-500 mb-2">/ 100</span>
            </div>
            <div className={cn("inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", getLevelColor(fraudAudit.threatLevel))}>
              {fraudAudit.threatLevel} DETECTED
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 col-span-1 lg:col-span-2">
           <div className="card p-6 bg-white border-slate-100 shadow-xl flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                 <Clock className="w-7 h-7" />
              </div>
              <div>
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Activités Hors-Horaires</h4>
                 <div className="text-2xl font-black text-slate-900">{fraudAudit.behavioralInsights?.afterHoursActivity || 0} incidents</div>
              </div>
           </div>
           <div className="card p-6 bg-white border-slate-100 shadow-xl flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                 <Zap className="w-7 h-7" />
              </div>
              <div>
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Vitesse de Saisie Anormale</h4>
                 <div className="text-2xl font-black text-slate-900">{fraudAudit.behavioralInsights?.speedAnomalies || 0} occurrences</div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Investigative Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-950 flex items-center gap-2">
              <Eye className="w-4 h-4 text-rose-500" /> Dossiers d'Investigation
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{fraudAudit.threats.length} dossiers ouverts</span>
          </div>
          
          <div className="space-y-4">
            {fraudAudit.threats.map((threat) => (
              <motion.div 
                key={threat.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="card p-6 bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-xl shrink-0 transition-transform group-hover:rotate-12",
                    threat.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  )}>
                    <Gavel className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                          threat.type === 'FRAUD' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
                        )}>{threat.type}</span>
                        <span className="text-[10px] font-black text-slate-400 tracking-widest">OBJET: {threat.userConcerned}</span>
                      </div>
                      <div className="text-[10px] font-black text-rose-600">SCORE RISQUE: {threat.riskScore}%</div>
                    </div>
                    <h4 className="text-base font-black text-slate-950 uppercase tracking-tight mb-2">{threat.logic}</h4>
                    <p className="text-xs font-bold text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                      <Fingerprint className="w-3 h-3 inline mr-1 opacity-50" />
                      PREUVE: {threat.evidence}
                    </p>
                    <div className="flex justify-end gap-3">
                      <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">Démarrer Interrogatoire</button>
                      <button className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors">Marquer Suspect</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Behavioral Radar & Insights */}
        <div className="space-y-8">
           <div className="card p-6 bg-slate-900 text-white border-slate-800 shadow-2xl">
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
                       <motion.div initial={{ width: 0 }} animate={{ width: '82%' }} className="h-full bg-emerald-500" />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between text-[9px] font-black uppercase mb-2">
                       <span className="text-slate-400">Risque de Collusion</span>
                       <span className="text-rose-400">45%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} className="h-full bg-rose-500" />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between text-[9px] font-black uppercase mb-2">
                       <span className="text-slate-400">Mensonge Détecté (Audit)</span>
                       <span className="text-amber-400">12 inc.</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} className="h-full bg-amber-500" />
                    </div>
                 </div>
              </div>

              <div className="mt-10 p-4 bg-white/5 rounded-xl border border-white/10">
                 <h4 className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Eye className="w-3 h-3" /> Patterns de Modification
                 </h4>
                 <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic">
                   "{fraudAudit.behavioralInsights?.editingPatterns || "Aucun pattern suspect détecté pour le moment."}"
                 </p>
              </div>
           </div>

           <div className="card p-6 bg-rose-600 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                 <ShieldCheck className="w-6 h-6" />
                 <h3 className="text-xs font-black uppercase tracking-widest italic">Action Recommandée</h3>
              </div>
              <p className="text-[11px] font-black uppercase leading-tight opacity-90 mb-6">
                Lancer une confrontation immédiate avec les profils identifiés en "CRITICAL" et geler les accès temporairement.
              </p>
              <button className="w-full h-11 bg-white text-rose-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-100 transition-colors shadow-lg">
                Générer Rapport FBI
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
