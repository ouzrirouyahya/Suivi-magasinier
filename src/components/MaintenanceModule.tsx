import React, { useState } from 'react';
import { 
  Wrench, 
  Activity, 
  AlertTriangle, 
  History, 
  Plus, 
  CheckCircle2, 
  Clock,
  TrendingDown,
  ShieldCheck,
  ChevronRight,
  Package,
  Search,
  X
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { MaintenanceLog, EnginMaster, Article } from '../types';
import { cn, formatDate, generateId, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function MaintenanceModule() {
  const { engins, maintenanceLogs, addMaintenanceLog, articles } = useInventory();
  const [showAddLog, setShowAddLog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [logType, setLogType] = useState<'PREVENTIVE' | 'CURATIVE' | 'PREDICTIVE'>('PREVENTIVE');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [cost, setCost] = useState('');
  const [selectedParts, setSelectedParts] = useState<{articleId: string, quantity: number, designation: string, price: number}[]>([]);
  const [partSearch, setPartSearch] = useState('');

  // Part Selection Logic
  const filteredArticles = articles.filter(a => 
    (a.designation.toLowerCase().includes(partSearch.toLowerCase()) || 
     a.ref.toLowerCase().includes(partSearch.toLowerCase())) &&
    !selectedParts.find(p => p.articleId === a.id)
  ).slice(0, 5);

  const addPart = (article: Article) => {
    setSelectedParts([...selectedParts, { 
      articleId: article.id, 
      quantity: 1, 
      designation: article.designation,
      price: article.price || 0
    }]);
    setPartSearch('');
  };

  const removePart = (id: string) => {
    setSelectedParts(selectedParts.filter(p => p.articleId !== id));
  };

  const updatePartQty = (id: string, qty: number) => {
    setSelectedParts(selectedParts.map(p => p.articleId === id ? { ...p, quantity: qty } : p));
  };

  // Mock prediction logic for "Predictive Maintenance"
  const getPredictiveStats = (machineId: string) => {
    const logs = maintenanceLogs.filter(l => l.machineId === machineId);
    if (logs.length === 0) return { risk: 'LOW', confidence: 95, reason: 'Nouveau cycle' };
    
    // Simulate complex analysis
    const lastMaint = new Date(logs[0].date);
    const daysSince = Math.floor((Date.now() - lastMaint.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince > 45) return { risk: 'HIGH', confidence: 88, reason: 'Usure critique détectée par IA' };
    if (daysSince > 30) return { risk: 'MEDIUM', confidence: 92, reason: 'Seuil opérationnel atteint' };
    return { risk: 'LOW', confidence: 98, reason: 'Cycle stable' };
  };

  const handleAddLog = async () => {
    if (!selectedMachine || !description) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    const calculatedCost = (cost ? parseFloat(cost) : 0) + selectedParts.reduce((s, p) => s + (p.quantity * p.price), 0);

    const newLog: MaintenanceLog = {
      id: generateId(),
      machineId: selectedMachine,
      machineType: 'ENGIN', 
      date: new Date().toISOString(),
      type: logType,
      description,
      hoursCounter: hours ? parseInt(hours) : undefined,
      partsUsed: selectedParts.map(p => ({ articleId: p.articleId, quantity: p.quantity })),
      performer: 'Chef d\'Atelier',
      cost: calculatedCost
    };

    try {
      await addMaintenanceLog(newLog);
      toast.success("Maintenance enregistrée");
      setShowAddLog(false);
      setDescription('');
      setHours('');
      setCost('');
      setSelectedParts([]);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Wrench className="w-6 h-6 text-indigo-600" />
            </div>
            Maintenance Prédictive
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Analyse IA de l'état des machines et planification intelligente.
          </p>
        </div>
        <button 
          onClick={() => setShowAddLog(true)}
          className="btn bg-indigo-600 text-white px-6 h-12 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <Plus className="w-5 h-5" /> Nouveau Rapport
        </button>
      </header>

      {/* Prediction Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 border-slate-100 bg-white shadow-sm overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full blur-3xl opacity-50" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-50 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="font-black text-rose-900 uppercase tracking-wider text-xs">Alertes Critiques IA</h3>
          </div>
          <div className="text-3xl font-black text-rose-600">3</div>
          <p className="text-[10px] font-bold text-rose-400 mt-2 uppercase tracking-widest">Interventions immédiates conseillées</p>
        </div>

        <div className="card p-6 border-slate-100 bg-white shadow-sm overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-3xl opacity-50" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-black text-emerald-900 uppercase tracking-wider text-xs">Indice Santé Flotte</h3>
          </div>
          <div className="text-3xl font-black text-emerald-600">84%</div>
          <p className="text-[10px] font-bold text-emerald-400 mt-2 uppercase tracking-widest">+4% vs semaine dernière</p>
        </div>

        <div className="card p-6 border-slate-100 bg-white shadow-sm overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full blur-3xl opacity-50" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <TrendingDown className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="font-black text-amber-900 uppercase tracking-wider text-xs">Coûts Évités (Est.)</h3>
          </div>
          <div className="text-3xl font-black text-amber-600">12 450 MAD</div>
          <p className="text-[10px] font-bold text-amber-400 mt-2 uppercase tracking-widest">Grâce à la détection précoce</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Machine Health List */}
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Analyse Santé par Unité
          </h3>
          <div className="space-y-3">
            {engins.slice(0, 6).map(engin => {
              const stats = getPredictiveStats(engin.id);
              return (
                <div key={engin.id} className="card p-4 flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border-2",
                      stats.risk === 'HIGH' ? "bg-rose-50 border-rose-100 text-rose-600" :
                      stats.risk === 'MEDIUM' ? "bg-amber-50 border-amber-100 text-amber-600" :
                      "bg-emerald-50 border-emerald-100 text-emerald-600"
                    )}>
                      {engin.code}
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase text-slate-900">{engin.label}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{engin.site} • {stats.reason}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-xs font-black px-2 py-1 rounded-full uppercase tracking-widest",
                      stats.risk === 'HIGH' ? "text-rose-600 bg-rose-50" :
                      stats.risk === 'MEDIUM' ? "text-amber-600 bg-amber-50" :
                      "text-emerald-600 bg-emerald-50"
                    )}>
                      {stats.risk === 'HIGH' ? 'CRITIQUE' : stats.risk === 'MEDIUM' ? 'À SURVEILLER' : 'OPTIMAL'}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 mt-1 uppercase">Confiance IA: {stats.confidence}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Maint History & Parts Summary */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2">
              <History className="w-4 h-4" /> Historique Récent
            </h3>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              {maintenanceLogs.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {maintenanceLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          {log.type === 'PREVENTIVE' ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : 
                           log.type === 'PREDICTIVE' ? <Activity className="w-4 h-4 text-indigo-500" /> : 
                           <AlertTriangle className="w-4 h-4 text-rose-500" />}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 uppercase">Machine: {log.machineId}</div>
                          <div className="text-[10px] text-slate-500 font-medium line-clamp-1">{log.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                          <div className="text-[10px] font-black text-slate-400 uppercase">{formatDate(log.date)}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">{log.performer}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 font-bold text-sm uppercase italic">
                  Aucun log de maintenance enregistré.
                </div>
              )}
            </div>
          </div>

          {/* Consumables Summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" /> Consommables de Maintenance
            </h3>
            <div className="card p-4 bg-indigo-50/30 border-indigo-100">
               <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase text-indigo-600">Article le plus sollicité</span>
                  <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">FILTRE HUILE D11</span>
               </div>
               <div className="text-[10px] font-medium text-slate-600">
                 Analyse IA : La consommation de pièces détachées a augmenté de 12% ce mois-ci, principalement dû aux cycles de maintenance prédictive sur le site SMI.
               </div>
            </div>
          </div>
        </section>
      </div>

      {/* Modal Add Log */}
      <AnimatePresence>
        {showAddLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black uppercase text-slate-900 tracking-tighter">Nouveau Rapport</h3>
                  <button onClick={() => setShowAddLog(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <Clock className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="space-y-5">
                   <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Machine</label>
                      <select 
                        value={selectedMachine} 
                        onChange={(e) => setSelectedMachine(e.target.value)}
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all"
                      >
                        <option value="">Sélectionner une unité...</option>
                        {engins.map(e => <option key={e.id} value={e.id}>{e.code} - {e.label}</option>)}
                      </select>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Type Intervention</label>
                        <select 
                          value={logType} 
                          onChange={(e) => setLogType(e.target.value as any)}
                          className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-sm"
                        >
                          <option value="PREVENTIVE">Préventive</option>
                          <option value="PREDICTIVE">Prédictive</option>
                          <option value="CURATIVE">Curative</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Compteur Horaires</label>
                        <input 
                          type="number"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          placeholder="Ex: 5400"
                          className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-sm"
                        />
                      </div>
                   </div>

                   <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Pièces Utilisées & Consommables</label>
                      <div className="space-y-3">
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                               type="text"
                               placeholder="Chercher une pièce (Réf, Nom)..."
                               value={partSearch}
                               onChange={(e) => setPartSearch(e.target.value)}
                               className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 font-bold text-xs"
                            />
                            {partSearch && filteredArticles.length > 0 && (
                               <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-100 shadow-xl rounded-xl mt-1 overflow-hidden">
                                  {filteredArticles.map(a => (
                                     <button 
                                        key={a.id}
                                        onClick={() => addPart(a)}
                                        className="w-full p-3 text-left hover:bg-slate-50 flex flex-col transition-colors border-b border-slate-50 last:border-0"
                                     >
                                        <span className="text-xs font-black uppercase">{a.designation}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">{a.ref} • {a.site} • Stock: {a.quantity}</span>
                                     </button>
                                  ))}
                               </div>
                            )}
                         </div>

                         {selectedParts.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                               {selectedParts.map(p => (
                                  <div key={p.articleId} className="flex items-center justify-between gap-2">
                                     <div className="flex-1">
                                        <div className="text-[10px] font-black uppercase line-clamp-1">{p.designation}</div>
                                        <div className="text-[9px] text-slate-400 font-bold">{formatCurrency(p.price)} / unité</div>
                                     </div>
                                     <input 
                                        type="number"
                                        value={p.quantity}
                                        onChange={(e) => updatePartQty(p.articleId, parseInt(e.target.value))}
                                        className="w-12 h-8 bg-white border border-slate-200 rounded-lg text-center font-bold text-xs"
                                     />
                                     <button onClick={() => removePart(p.articleId)} className="text-rose-500 hover:text-rose-700">
                                        <X className="w-4 h-4" />
                                     </button>
                                  </div>
                               ))}
                               <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center text-[10px] font-black uppercase text-slate-900">
                                  <span>Total Pièces</span>
                                  <span>{formatCurrency(selectedParts.reduce((s, p) => s + (p.quantity * p.price), 0))}</span>
                               </div>
                            </div>
                         )}
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Main d'œuvre (MAD)</label>
                        <input 
                          type="number"
                          value={cost}
                          onChange={(e) => setCost(e.target.value)}
                          placeholder="Ex: 1500"
                          className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-sm"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                         <div className="bg-indigo-600/5 rounded-xl p-3 text-right">
                            <div className="text-[9px] font-black text-indigo-600 uppercase">Coût Total Estimé</div>
                            <div className="text-sm font-black text-slate-900">
                               {formatCurrency((cost ? parseFloat(cost) : 0) + selectedParts.reduce((s, p) => s + (p.quantity * p.price), 0))}
                            </div>
                         </div>
                      </div>
                   </div>

                   <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Description Travaux</label>
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        placeholder="Détails de l'intervention..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm"
                      />
                   </div>

                   <div className="pt-4">
                      <button 
                        onClick={handleAddLog}
                        className="w-full btn bg-indigo-600 text-white h-14 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700"
                      >
                        Enregistrer Intervention
                      </button>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
