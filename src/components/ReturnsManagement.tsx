import React, { useState } from 'react';
import { 
  RotateCcw, 
  Search, 
  Package, 
  User, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  History,
  AlertCircle
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Mouvement, Article } from '../types';
import { cn, formatDate, generateId, formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

export function ReturnsManagement() {
  const { mouvements, articles, addMouvement } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState<'NEUF' | 'BON' | 'MAUVAIS' | 'HORS_SERVICE'>('BON');

  const recentReturns = mouvements.filter(m => m.type === 'RETOUR').slice(0, 10);

  const handleReturn = async () => {
    if (!selectedArticleId || returnQty <= 0 || !reason) {
      toast.error("Données de retour incomplètes");
      return;
    }

    const article = articles.find(a => a.id === selectedArticleId);
    if (!article) return;

    const newMouvement: Mouvement = {
      id: generateId(),
      site: article.site,
      date: new Date().toISOString(),
      type: 'RETOUR',
      reference: `RET-${Date.now().toString().slice(-6)}`,
      items: [{ articleId: selectedArticleId, quantity: returnQty, price: article.price || 0 }],
      notes: `Condition: ${condition} - Raison: ${reason}`,
      status: 'COMPLETE'
    };

    try {
      await addMouvement(newMouvement);
      toast.success("Retour enregistré et stock mis à jour");
      resetForm();
    } catch (err) {
      toast.error("Erreur lors du retour");
    }
  };

  const resetForm = () => {
    setSelectedArticleId('');
    setReturnQty(1);
    setReason('');
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <RotateCcw className="w-6 h-6 text-emerald-600" />
          </div>
          Gestion des Retours
        </h2>
        <p className="text-slate-500 font-medium text-sm mt-1">
          Réintégration de matériel non utilisé ou gestion des rebuts.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Return Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6 bg-white border-slate-100 shadow-sm border-t-4 border-t-emerald-500">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
              Enregistrer un Retour
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Article</label>
                <select 
                  value={selectedArticleId}
                  onChange={(e) => setSelectedArticleId(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-sm"
                >
                  <option value="">Sélectionner un article...</option>
                  {articles.map(a => <option key={a.id} value={a.id}>{a.ref} - {a.designation}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Quantité</label>
                  <input 
                    type="number"
                    value={returnQty}
                    onChange={(e) => setReturnQty(parseInt(e.target.value))}
                    className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">État</label>
                  <select 
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-sm"
                  >
                    <option value="NEUF">Neuf</option>
                    <option value="BON">Bon</option>
                    <option value="MAUVAIS">Mauvais</option>
                    <option value="HORS_SERVICE">H.S</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Justification</label>
                <textarea 
                   rows={3}
                   value={reason}
                   onChange={(e) => setReason(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm"
                   placeholder="Ex: Surplus de chantier / Erreur de commande..."
                />
              </div>

              <button 
                onClick={handleReturn}
                className="w-full btn bg-emerald-600 text-white h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-100 mt-4"
              >
                Valider Réintégration
              </button>
            </div>
          </div>

          <div className="card p-5 bg-blue-50/50 border-blue-100 flex gap-3">
             <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
             <p className="text-[10px] font-bold text-blue-700 uppercase leading-relaxed">
               Les retours augmentent directement le stock physique sur le site concerné. Les pièces marquées H.S sont automatiquement mises en quarantaine.
             </p>
          </div>
        </div>

        {/* Returns History */}
        <div className="lg:col-span-2 space-y-4">
           <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2">
            <History className="w-4 h-4" /> Historique des Retours
          </h3>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-[10px] font-black text-slate-400 uppercase p-4 text-left">Date</th>
                    <th className="text-[10px] font-black text-slate-400 uppercase p-4 text-left">Article</th>
                    <th className="text-[10px] font-black text-slate-400 uppercase p-4 text-center">Qté</th>
                    <th className="text-[10px] font-black text-slate-400 uppercase p-4 text-left">Notes</th>
                    <th className="text-[10px] font-black text-slate-400 uppercase p-4 text-right">Valeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {recentReturns.length > 0 ? recentReturns.map(m => {
                      const item = m.items[0];
                      const article = articles.find(a => a.id === item?.articleId);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="p-4 text-[10px] font-bold text-slate-500">{formatDate(m.date)}</td>
                           <td className="p-4">
                              <div className="text-xs font-black text-slate-900 line-clamp-1">{article?.designation || 'Article Inconnu'}</div>
                              <div className="text-[10px] font-bold text-slate-400">{article?.ref}</div>
                           </td>
                           <td className="p-4 text-center">
                              <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-black">+{item?.quantity}</span>
                           </td>
                           <td className="p-4 text-[10px] font-medium text-slate-500 italic max-w-xs truncate">{m.notes}</td>
                           <td className="p-4 text-right text-xs font-black text-slate-900">
                              {formatCurrency(item?.quantity * (item?.price || 0))}
                           </td>
                        </tr>
                      );
                   }) : (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                           Aucun retour enregistré.
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
  );
}
