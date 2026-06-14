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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-slate-950 flex items-center gap-4 tracking-tighter uppercase leading-none">
            <ShieldCheck className="w-16 h-16 text-sky-500" /> Audit Log
          </h2>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.05em] mt-4 opacity-70">Traçabilité totale des opérations critiques en temps réel</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-100 shadow-xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Surveillance Active</p>
          </div>
        </div>
      </header>

      <div className="card glass p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher par utilisateur, action ou détails..."
              className="input-field pl-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64 relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <select
              className="input-field pl-12 appearance-none"
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
          </div>
        </div>

        <div className="table-container shadow-inner bg-slate-50/20">
          <table className="data-table">
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Opérateur</th>
                <th>Site</th>
                <th>Action</th>
                <th>Détails de l'Opération</th>
                <th className="text-right">Impact Fin.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-xs font-black text-slate-500">
                        {!log.timestamp || new Date(log.timestamp).getFullYear() <= 1970 ? (
                          <span className="text-amber-500 animate-pulse uppercase tracking-wider text-[10px]">À l'instant</span>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-xs font-bold text-slate-700">{log.userEmail.split('@')[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase">
                      {log.site}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tight",
                      log.action.includes('SORTIE') || log.action.includes('TRANSFERT_OUT') ? "bg-rose-50 text-rose-700" :
                      log.action.includes('ENTREE') || log.action.includes('TRANSFERT_IN') ? "bg-emerald-50 text-emerald-700" :
                      "bg-sky-50 text-sky-700"
                    )}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium text-slate-600 max-w-md truncate">{log.details}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {log.amount ? (
                      <span className="text-xs font-black text-slate-900">{formatCurrency(log.amount)}</span>
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
