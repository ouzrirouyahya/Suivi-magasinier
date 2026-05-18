
import React from 'react';
import { AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AnomalyReport } from '../../types';

interface AnomaliesViewProps {
  anomalies: AnomalyReport[];
  analyzing: boolean;
}

export function AnomaliesView({ anomalies, analyzing }: AnomaliesViewProps) {
  if (analyzing) {
    return (
      <div className="card p-32 flex flex-col items-center justify-center animate-pulse">
        <Activity className="w-16 h-16 text-sky-500 mb-8 animate-bounce" />
        <h3 className="text-3xl font-black text-slate-900 uppercase">Analyse des Patterns...</h3>
        <p className="text-sm font-bold text-slate-400 mt-2">Dépistage d'anomalies sur les flux complexes.</p>
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="card p-32 flex flex-col items-center justify-center border-dashed border-4 border-slate-100">
        <CheckCircle className="w-20 h-20 text-emerald-100 mb-8" />
        <h3 className="text-3xl font-black text-slate-900 uppercase">Aucune anomalie critique</h3>
        <p className="text-base text-slate-500 font-bold mt-2">Vos flux sont sains et conformes aux standards Hydromines.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {anomalies.map((anomaly, idx) => (
        <div key={idx} className={cn(
          "card p-8 border-l-8 transition-all hover:scale-[1.02] shadow-xl",
          anomaly.severity === 'CRITICAL' ? "border-rose-600 bg-rose-50/10" : 
          anomaly.severity === 'HIGH' ? "border-amber-500 bg-amber-50/10" : "border-sky-500 bg-sky-50/10"
        )}>
          <div className="flex justify-between items-start mb-6">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              anomaly.severity === 'CRITICAL' ? "bg-rose-100 text-rose-600" : "bg-sky-100 text-sky-600"
            )}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className={cn(
              "text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
              anomaly.severity === 'CRITICAL' ? "bg-rose-600 text-white" : "bg-sky-600 text-white"
            )}>
              {anomaly.severity}
            </span>
          </div>
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{anomaly.type}</h4>
          <p className="text-lg font-black text-slate-950 uppercase tracking-tight leading-tight mb-4">{anomaly.description}</p>
          <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Action Corrective</p>
            <p className="text-xs font-bold text-slate-700">{anomaly.suggestedAction}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
