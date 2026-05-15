import React, { useState } from 'react';
import { User, ClipboardList, Search, Calendar, Package } from 'lucide-react';
import { Article, DistributionEPI, SiteCode } from '../types';
import { cn, formatDate } from '../lib/utils';

interface EpiTrackingProps {
  site: SiteCode;
  articles: Article[];
  distributions: DistributionEPI[];
}

export function EpiTracking({ site, articles, distributions }: EpiTrackingProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const epiArticles = articles.filter(a => a.type === 'EPI' && a.site === site);

  const filteredDistributions = distributions.filter(d => 
    d.site === site &&
    (d.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.service.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-neutral-900">Suivi des Equipements de Protection (EPI)</h2>
        <p className="text-sm text-neutral-500">Suivi nominatif des attributions par agent.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {epiArticles.slice(0, 4).map(epi => {
          const totalDistributed = distributions
            .filter(d => d.articleId === epi.id)
            .reduce((sum, d) => sum + d.quantity, 0);
          
          return (
            <div key={epi.id} className="card p-4 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform">
                <Package className="w-16 h-16" />
              </div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">{epi.designation}</p>
              <h4 className="text-xl font-bold text-neutral-900">{epi.quantity} <span className="text-xs text-neutral-400">DISPO</span></h4>
              <p className="text-xs text-blue-600 mt-2 font-semibold flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> {totalDistributed} Distribués total
              </p>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Registre des Distributions</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Chercher un agent..." 
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container shadow-sm bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Agent</th>
                <th>Service</th>
                <th>Article EPI</th>
                <th className="text-right">Qté</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredDistributions.length > 0 ? (
                filteredDistributions.map(d => {
                  const article = articles.find(a => a.id === d.articleId);
                  return (
                    <tr key={d.id} className="hover:bg-neutral-50">
                      <td className="text-neutral-500 text-xs">{formatDate(d.date).split(' ')[0]}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-neutral-800">{d.agentName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2 py-1 rounded">
                          {d.service}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm font-medium">{article?.designation}</div>
                        <div className="text-[10px] text-neutral-400 font-mono tracking-tighter">{article?.ref}</div>
                      </td>
                      <td className="text-right font-black text-blue-600">{d.quantity}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <ClipboardList className="w-12 h-12 mx-auto mb-4 text-neutral-200" />
                    <p className="text-neutral-400">Aucune distribution enregistrée pour le moment.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
