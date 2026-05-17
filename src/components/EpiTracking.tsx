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
    <div className="space-y-8 p-6">
      <header className="mb-12">
        <h2 className="text-5xl font-black text-neutral-900 tracking-tighter uppercase leading-none">Protection (EPI)</h2>
        <p className="text-xl text-neutral-500 uppercase tracking-[0.05em] font-bold mt-4 opacity-70">Suivi nominatif des attributions par agent et gestion des stocks de sécurité.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {epiArticles.slice(0, 4).map(epi => {
          const totalDistributed = distributions
            .filter(d => d.articleId === epi.id)
            .reduce((sum, d) => sum + d.quantity, 0);
          
          return (
            <div key={epi.id} className="card p-8 relative overflow-hidden group border-neutral-100 shadow-xl bg-white rounded-3xl transition-all hover:shadow-2xl hover:-translate-y-1">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                <Package className="w-24 h-24" />
              </div>
              <p className="text-lg font-black text-neutral-400 uppercase mb-3 tracking-tighter truncate">{epi.designation}</p>
              <h4 className="text-5xl font-black text-neutral-900 tracking-tighter leading-none">{epi.quantity} <span className="text-base text-neutral-400 font-black tracking-widest ml-1">DISPO</span></h4>
              <div className="mt-8 pt-6 border-t border-neutral-50">
                <p className="text-lg text-blue-600 font-black flex items-center gap-3 uppercase tracking-tighter">
                  <ClipboardList className="w-6 h-6" /> {totalDistributed} Distribués
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-6 mt-12 bg-white/50 p-8 rounded-[3rem] border border-neutral-100/50 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <h3 className="text-2xl font-black uppercase tracking-[0.25em] text-neutral-400">Registre des Distributions</h3>
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-neutral-400 relative z-10" />
            <input 
              type="text" 
              placeholder="RECHERCHER UN AGENT..." 
              className="w-full pl-14 pr-6 h-16 border-2 border-neutral-100 rounded-2xl text-xl bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-black tracking-tight relative z-10 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container shadow-2xl bg-white overflow-hidden border border-neutral-100 rounded-[2.5rem]">
          <table className="data-table w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50">
                <th className="px-8 py-6 text-lg font-black uppercase tracking-[0.2em] text-neutral-400">Date</th>
                <th className="px-8 py-6 text-lg font-black uppercase tracking-[0.2em] text-neutral-400">Agent</th>
                <th className="px-8 py-6 text-lg font-black uppercase tracking-[0.2em] text-neutral-400">Service</th>
                <th className="px-8 py-6 text-lg font-black uppercase tracking-[0.2em] text-neutral-400">Article EPI</th>
                <th className="px-8 py-6 text-right text-lg font-black uppercase tracking-[0.2em] text-neutral-400">Qté</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredDistributions.length > 0 ? (
                filteredDistributions.map(d => {
                  const article = articles.find(a => a.id === d.articleId);
                  return (
                    <tr key={d.id} className="hover:bg-neutral-50/80 transition-all group">
                      <td className="px-8 py-8 text-neutral-400 text-base font-black uppercase tracking-widest">{formatDate(d.date).split(' ')[0]}</td>
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-[1.2rem] bg-neutral-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-neutral-500 transition-all shadow-sm">
                            <User className="w-6 h-6" />
                          </div>
                          <span className="font-black text-neutral-800 text-2xl tracking-tighter">{d.agentName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <span className="text-base font-black text-neutral-500 bg-neutral-100 px-4 py-2 rounded-xl border border-neutral-200 uppercase tracking-widest">
                          {d.service}
                        </span>
                      </td>
                      <td className="px-8 py-8">
                        <div className="text-3xl font-black text-neutral-800 tracking-tighter leading-tight">{article?.designation}</div>
                        <div className="text-lg text-neutral-400 font-black uppercase tracking-widest mt-1">{article?.ref}</div>
                      </td>
                      <td className="px-8 py-8 text-right font-black text-blue-600 text-4xl tabular-nums tracking-tighter">{d.quantity}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 text-neutral-100" />
                    <p className="text-neutral-300 text-lg uppercase font-black tracking-[0.3em]">Aucune distribution enregistrée</p>
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
