
import React from 'react';
import { FileText, Download, Calendar, History, Loader2, Sparkles } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';

interface ReportCenterProps {
  reports: any[];
  loading: boolean;
  selectedReport: any;
  onSelect: (report: any) => void;
  onDownload: (period?: any) => void;
}

export function ReportCenter({ reports, loading, selectedReport, onSelect, onDownload }: ReportCenterProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-32 space-y-4">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Récupération des archives...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar de sélection */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar lg:col-span-1">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Bibliothèque d'Audit</h3>
        {reports.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-400 italic">Aucun rapport archivé pour ce site.</p>
          </div>
        ) : (
          reports.map((report) => (
            <button
              key={report.id}
              onClick={() => onSelect(report)}
              className={cn(
                "w-full p-4 rounded-2xl border transition-all text-left group relative overflow-hidden",
                selectedReport?.id === report.id 
                  ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200" 
                  : "bg-white border-slate-100 hover:border-sky-200 hover:shadow-lg"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest",
                  selectedReport?.id === report.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {report.type}
                </span>
                <span className="text-[8px] font-black text-slate-400">
                  {formatDate(report.generatedAt)}
                </span>
              </div>
              <p className={cn(
                "text-[10px] font-black uppercase tracking-tight",
                selectedReport?.id === report.id ? "text-white" : "text-slate-950"
              )}>
                Audit Site {report.site}
              </p>
              {selectedReport?.id === report.id && (
                <div className="absolute top-0 right-0 p-2">
                  <Sparkles className="w-3 h-3 text-sky-400 animate-pulse" />
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Visualisation du rapport */}
      <div className="lg:col-span-3">
        {selectedReport ? (
          <div className="card glass p-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Détails de l'Audit</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ID Archive : {selectedReport.id}</p>
              </div>
              <button 
                onClick={() => onDownload()}
                className="btn bg-sky-600 text-white px-6 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-sky-100 hover:bg-sky-700 transition-all"
              >
                <Download className="w-4 h-4" /> Télécharger en PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-sky-500" /> Sommaire IA
                  </h4>
                  <div className="space-y-4">
                    {selectedReport.data.healthScore && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Score Santé Magasin</span>
                        <span className="text-xl font-black text-sky-600">{selectedReport.data.healthScore}/100</span>
                      </div>
                    )}
                    {selectedReport.data.fraudScore !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Indice de Fraude</span>
                        <span className={cn("text-xl font-black", selectedReport.data.fraudScore > 10 ? "text-rose-600" : "text-emerald-600")}>
                          {selectedReport.data.fraudScore}/10
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                   <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Génération Automatique</h4>
                   <p className="text-xs font-medium text-slate-600 leading-relaxed">
                     Ce rapport a été généré par l'Intelligence Artificielle d'Hydromines en analysant les flux transversaux (Stock, Finance, RH).
                   </p>
                </div>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Données Brutes Analysées</h4>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-[10px] text-sky-300 whitespace-pre-wrap">
                  {JSON.stringify(selectedReport.data, null, 2)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card border-dashed border-4 border-slate-100 p-32 flex flex-col items-center justify-center text-slate-300 opacity-50">
            <Calendar className="w-20 h-20 mb-6" />
            <h3 className="text-3xl font-black uppercase tracking-tighter">Sélectionner une archive</h3>
            <p className="text-lg font-bold">Consultez l'historique des audits passés.</p>
          </div>
        )}
      </div>
    </div>
  );
}
