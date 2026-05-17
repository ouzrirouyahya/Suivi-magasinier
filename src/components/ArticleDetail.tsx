import React from 'react';
import { X, Calendar, Activity, ArrowDownLeft, ArrowUpRight, MapPin, Tag, Package } from 'lucide-react';
import { Article, Mouvement } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ArticleDetailProps {
  article: Article;
  mouvements: Mouvement[];
  onClose: () => void;
}

export function ArticleDetail({ article, mouvements, onClose }: ArticleDetailProps) {
  const articleMouvements = mouvements.filter(m => 
    m.items.some(item => item.articleId === article.id)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Prepare data for consumption chart (last 6 months)
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthName = d.toLocaleDateString('fr-FR', { month: 'short' });
    const monthYear = `${d.getMonth()}/${d.getFullYear()}`;
    
    const consumed = mouvements
      .filter(m => {
        const md = new Date(m.date);
        return m.type === 'SORTIE' && 
               md.getMonth() === d.getMonth() && 
               md.getFullYear() === d.getFullYear() &&
               m.items.some(item => item.articleId === article.id);
      })
      .reduce((sum, m) => {
        const item = m.items.find(it => it.articleId === article.id);
        return sum + (item?.quantity || 0);
      }, 0);

    return { name: monthName, value: consumed };
  });

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <header className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900">{article.designation}</h3>
              <p className="text-sm font-mono text-neutral-400 font-medium tracking-tight">{article.ref}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-neutral-400" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="card p-6 bg-neutral-50 border-none">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> État du Stock
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-neutral-500">Quantité actuelle</span>
                    <span className={cn(
                      "text-4xl font-black",
                      article.quantity <= article.minStock ? "text-red-600" : "text-blue-600"
                    )}>{article.quantity} <span className="text-sm font-normal text-neutral-400">{article.unit}</span></span>
                  </div>
                  <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        article.quantity <= article.minStock ? "bg-red-500" : "bg-blue-500"
                      )}
                      style={{ width: `${Math.min((article.quantity / (article.minStock * 2)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
                    <span>SEUIL: {article.minStock}</span>
                    <span>CAPACITÉ MAX EST.: {article.minStock * 2}</span>
                  </div>
                </div>
              </div>

              <div className="card p-6 border-neutral-100 shadow-none">
                <h4 className="text-xs font-bold uppercase text-neutral-500 mb-4 flex items-center gap-2">
                   Fiche Technique
                </h4>
                <div className="space-y-3">
                  <InfoItem icon={Tag} label="Catégorie" value={article.category} />
                  {article.component && (
                    <>
                      <InfoItem icon={Package} label="Composant" value={article.component} />
                      <InfoItem icon={Package} label="Sous-Composant" value={article.subComponent || 'N/A'} />
                    </>
                  )}
                  <InfoItem icon={MapPin} label="Emplacement" value={article.location} />
                  <InfoItem icon={ArrowDownLeft} label="Unités" value={article.unit} />
                  <InfoItem icon={Activity} label="Valeur Unitaire" value={formatCurrency(article.price)} />
                </div>
              </div>

              <div className="card p-6 border-neutral-100 shadow-none">
                <h4 className="text-xs font-bold uppercase text-neutral-500 mb-4">Consommation (6 mois)</h4>
                <div className="h-40 min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={160} minWidth={0} debounce={50}>
                    <AreaChart data={last6Months}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#2563eb" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} />
                      <Tooltip />
                      <XAxis dataKey="name" hide />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2 px-2">
                <Calendar className="w-4 h-4" /> Historique spécifique des mouvements
              </h4>
              <div className="table-container shadow-none border-neutral-100">
                <table className="data-table">
                  <thead className="bg-transparent">
                    <tr>
                      <th>Date</th>
                      <th>Bon</th>
                      <th>Type</th>
                      <th>Tiers / Affectation</th>
                      <th className="text-right">Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articleMouvements.length > 0 ? (
                      articleMouvements.map(m => {
                        const item = m.items.find(it => it.articleId === article.id);
                        return (
                          <tr key={m.id}>
                            <td className="text-xs text-neutral-500">{formatDate(m.date).split(' ')[0]}</td>
                            <td className="font-bold text-neutral-800">{m.id}</td>
                            <td>
                              <span className={cn(
                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                                m.type === 'ENTREE' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              )}>
                                {m.type}
                              </span>
                            </td>
                            <td className="text-xs">
                              {m.type === 'ENTREE' ? (
                                <span className="font-medium">{m.vendeur}</span>
                              ) : (
                                <div>
                                  <span className="font-bold">{m.demandeur}</span>
                                  <span className="text-neutral-400 ml-1">({m.engin})</span>
                                </div>
                              )}
                            </td>
                            <td className={cn(
                              "text-right font-bold text-lg",
                              m.type === 'ENTREE' ? "text-green-600" : "text-red-600"
                            )}>
                              {m.type === 'ENTREE' ? '+' : '-'}{item?.quantity}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-20 text-neutral-400 italic">
                          Aucun mouvement enregistré pour cet article.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white rounded-lg border border-neutral-200">
        <Icon className="w-4 h-4 text-neutral-400" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter leading-none mb-1">{label}</p>
        <p className="text-sm font-semibold text-neutral-800 leading-none">{value}</p>
      </div>
    </div>
  );
}
