import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, Calendar, User, MapPin, DollarSign } from 'lucide-react';
import { AuditLog, SiteCode } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView = React.memo(function AuditLogView({ logs }: AuditLogViewProps) {
  const [search, setSearch] = useState('');
  const [filterSite, setFilterSite] = useState<SiteCode | 'ALL'>('ALL');

  const filteredLogs = logs.filter(log => {
    const sTerm = search.toLowerCase();
    const safeContains = (field: any) => {
      if (typeof field !== 'string') return false;
      return field.toLowerCase().includes(sTerm);
    };
    const matchesSearch = !search ||
      safeContains(log.userEmail) ||
      safeContains(log.details) ||
      safeContains(log.action);
    const matchesSite = filterSite === 'ALL' || log.site === filterSite;
    return matchesSearch && matchesSite;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Sub-Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 animate-pulse" />
            Journal d'Audit Système
          </h3>
          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-1">
            Traçabilité totale des opérations critiques en temps réel
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[9px] font-black text-slate-450 uppercase tracking-widest">Surveillance Active</p>
          </div>
        </div>
      </div>

      <div className="card-clean p-5">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
            <input 
              type="text" 
              placeholder="Rechercher par utilisateur, action ou détails..."
              className="w-full bg-slate-50 h-10 pl-10 pr-4 rounded-xl text-xs outline-none border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-semibold placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64 relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
            <select
              className="w-full bg-slate-50 h-10 pl-10 pr-8 rounded-xl text-xs outline-none border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-semibold appearance-none"
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value as any)}
            >
              <option value="ALL">Tous les sites</option>
              <option value="SMI">SMI</option>
              <option value="OUMEJRANE">OUMEJRANE</option>
              <option value="KOUDIA">KOUDIA</option>
              <option value="BOU-AZZER">BOU-AZZER</option>
              <option value="OUANSIMI">OUANSIMI</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>
        </div>

        <div className="table-container shadow-inner bg-slate-50/20">
          <table className="data-table">
            <thead>
              <tr>
                <th className="px-4 py-3">Horodatage</th>
                <th className="px-4 py-3">Opérateur</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Détails de l'Opération</th>
                <th className="px-4 py-3 text-right">Impact Fin.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[11px] font-bold text-slate-600">
                        {!log.timestamp || new Date(log.timestamp).getFullYear() <= 1970 ? (
                          <span className="text-amber-500 animate-pulse uppercase tracking-wider text-[9px]">À l'instant</span>
                        ) : (
                          new Date(log.timestamp).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-[11px] font-bold text-slate-705">{log.userEmail.split('@')[0]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded uppercase">
                      {log.site}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-tight",
                      log.action.includes('SORTIE') || log.action.includes('TRANSFERT_OUT') ? "bg-rose-50 text-rose-700" :
                      log.action.includes('ENTREE') || log.action.includes('TRANSFERT_IN') ? "bg-emerald-50 text-emerald-700" :
                      "bg-sky-50 text-sky-700"
                    )}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500 max-w-md truncate">{log.details}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {log.amount ? (
                      <span className="text-[11px] font-black text-slate-900">{formatCurrency(log.amount)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <ShieldCheck className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Aucun log correspondant</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
