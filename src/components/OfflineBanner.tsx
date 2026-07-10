import React, { useState, useEffect } from 'react';
import { 
  WifiOff, 
  Database, 
  ChevronUp, 
  ChevronDown, 
  RefreshCw, 
  AlertTriangle, 
  X, 
  Play, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Wifi, 
  Activity, 
  Zap,
  Info
} from 'lucide-react';
import { useOffline } from '../hooks/useOffline';
import { snapshotManager } from '../lib/snapshotManager';
import { motion, AnimatePresence } from 'motion/react';

function formatOperationType(type: string): string {
  const mapping: Record<string, string> = {
    addMouvement: "Ajout de mouvement",
    saveInventaire: "Sauvegarde d'inventaire",
    addPurchaseRequest: "Demande d'achat (PR)",
    updatePRStatus: "Statut Demande d'achat",
    saveArticle: "Modification d'article",
    deleteArticles: "Suppression d'articles",
    addTransfert: "Création de transfert",
    approveTransfert: "Approbation de transfert",
    expedierTransfert: "Expédition de transfert",
    completeTransfert: "Réception de transfert",
    closeTransfert: "Clôture de transfert",
    addMaintenanceLog: "Rapport de maintenance",
  };
  return mapping[type] || type;
}

function getOperationDetails(type: string, payload: any): string {
  if (!payload) return "Pas de détails disponibles";
  switch (type) {
    case 'addMouvement':
      return `Mouvement ${payload.type || ''} • ${(payload.items || []).length} article(s)`;
    case 'saveInventaire':
      return `Inventaire • ${(payload.items || []).length} ligne(s)`;
    case 'addPurchaseRequest':
      return `PR ${payload.ref || ''} pour ${payload.service || ''}`;
    case 'updatePRStatus':
      return `PR ${payload.id?.substring(0, 8) || ''}... ➔ ${payload.status || ''}`;
    case 'saveArticle':
      return `Ref: ${payload.ref || ''} (${payload.designation || ''})`;
    case 'deleteArticles':
      return `Suppression de ${(payload.ids || []).length} article(s)`;
    case 'addTransfert':
      return `Depuis ${payload.fromSite || ''} vers ${payload.toSite || ''} (${(payload.items || []).length} items)`;
    case 'approveTransfert':
      return `Approbation Transfert ${payload.id?.substring(0, 8) || ''}...`;
    case 'expedierTransfert':
      return `Expédition Transfert ${payload.id?.substring(0, 8) || ''}...`;
    case 'completeTransfert':
      return `Réception Transfert ${payload.id?.substring(0, 8) || ''}...`;
    case 'closeTransfert':
      return `Clôture Transfert ${payload.id?.substring(0, 8) || ''}...`;
    case 'addMaintenanceLog':
      return `Log maintenance • ${payload.equipmentCode || ''}`;
    default:
      return JSON.stringify(payload).substring(0, 60);
  }
}

export function OfflineBanner() {
  const {
    networkQuality,
    isDegradedNetwork,
    retryQueue,
    dlq,
    avgTxDuration,
    txStats,
    forceRunQueue,
    clearDLQ,
    retryDLQItem,
    deleteDLQItem,
    simulateRuleFailure,
    simulateConcurrentConflicts
  } = useOffline();

  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const snapshot = snapshotManager.getSnapshot();
  const hasSnapshot = snapshotManager.isFullSnapshotAvailable();

  // Mettre à jour les décompte des délais de backoff en temps réel
  useEffect(() => {
    if (retryQueue.some(i => i.nextAttemptTime)) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [retryQueue]);

  // Si tout est en ligne, qu'il n'y a pas d'action en cours ou d'erreurs, on n'affiche rien pour désencombrer le bas de l'écran
  if (
    networkQuality === 'ONLINE' && 
    !isDegradedNetwork && 
    retryQueue.length === 0 && 
    dlq.length === 0
  ) {
    return null;
  }

  const handleManualSync = async () => {
    setIsRefreshing(true);
    await forceRunQueue();
    setIsRefreshing(false);
  };

  const activeBackoffsCount = retryQueue.filter(
    item => item.nextAttemptTime && new Date(item.nextAttemptTime).getTime() > now
  ).length;

  return (
    <div id="offline-manager" className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <div className="max-w-4xl mx-auto w-full pointer-events-auto">
        <AnimatePresence initial={false}>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-slate-950 border border-slate-800 text-slate-100 rounded-t-2xl rounded-b-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] md:max-h-[600px] mb-2"
            >
              {/* Header de la console */}
              <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <span className={`block w-2.5 h-2.5 rounded-full ${
                      networkQuality === 'ONLINE' ? 'bg-emerald-500 animate-[pulse_2s_infinite]' :
                      networkQuality === 'HIGH_LATENCY' ? 'bg-amber-500 animate-[pulse_1.5s_infinite]' :
                      networkQuality === 'RECOVERING' ? 'bg-cyan-500 animate-spin border border-t-transparent' :
                      'bg-rose-500 animate-[ping_1.5s_infinite]'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-wider text-white uppercase flex items-center gap-1.5">
                      Console de Synchronisation
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal normal-case">
                        v1.2 Expert
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {networkQuality === 'ONLINE' && 'Connecté au Cloud'}
                      {networkQuality === 'HIGH_LATENCY' && 'Réseau dégradé (Latence élevée)'}
                      {networkQuality === 'OFFLINE' && 'Mode local-first hors-ligne'}
                      {networkQuality === 'RECOVERING' && 'Synchronisation en cours...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleManualSync}
                    disabled={isRefreshing || networkQuality === 'OFFLINE'}
                    className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all ${
                      isRefreshing ? 'animate-spin text-cyan-400' : ''
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    title="Forcer la synchronisation maintenant"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 hover:text-rose-400 text-slate-400 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contenu principal défilable */}
              <div className="p-5 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                
                {/* Ligne d'indicateurs de performance */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-450 uppercase tracking-wider block font-bold">État Connexion</span>
                    <span className={`text-xs font-black mt-1 block uppercase ${
                      networkQuality === 'ONLINE' ? 'text-emerald-400' :
                      networkQuality === 'HIGH_LATENCY' ? 'text-amber-400' :
                      networkQuality === 'RECOVERING' ? 'text-cyan-400' :
                      'text-rose-400'
                    }`}>
                      {networkQuality === 'ONLINE' ? 'Excellente' :
                       networkQuality === 'HIGH_LATENCY' ? 'Dégradée' :
                       networkQuality === 'RECOVERING' ? 'Restauration' :
                       'Hors Ligne'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-450 uppercase tracking-wider block font-bold">File d'attente</span>
                    <span className="text-sm font-black text-white mt-1 block">
                      {retryQueue.length} <span className="text-[10px] text-slate-400 font-normal">action(s)</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-450 uppercase tracking-wider block font-bold">File d'erreurs (DLQ)</span>
                    <span className={`text-sm font-black mt-1 block ${dlq.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {dlq.length} <span className="text-[10px] text-slate-400 font-normal">action(s)</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-450 uppercase tracking-wider block font-bold">Temps Sync Moyen</span>
                    <span className="text-sm font-black text-violet-400 mt-1 block">
                      {avgTxDuration > 0 ? `${Math.round(avgTxDuration)} ms` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* File de Synchronisation Active */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Actions en attente ({retryQueue.length})
                    </h4>
                    {activeBackoffsCount > 0 && (
                      <span className="text-[10px] bg-amber-950/40 text-amber-400 border border-amber-900 px-2 py-0.5 rounded-full animate-pulse">
                        {activeBackoffsCount} en temporisation (backoff)
                      </span>
                    )}
                  </div>

                  {retryQueue.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 bg-slate-900/20">
                      Toutes les données locales sont synchronisées en temps réel.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                      {retryQueue.map((item, index) => {
                        const isBackingOff = item.nextAttemptTime && new Date(item.nextAttemptTime).getTime() > now;
                        const secondsLeft = isBackingOff 
                          ? Math.ceil((new Date(item.nextAttemptTime!).getTime() - now) / 1000)
                          : 0;

                        return (
                          <div 
                            key={item.intentId || index} 
                            className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition-all bg-slate-900/40 hover:bg-slate-900/80 ${
                              isBackingOff ? 'border-amber-900/40 bg-amber-950/5' : 'border-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="p-1 rounded bg-slate-800 mt-0.5 text-[9px] font-black text-cyan-400 tracking-wide uppercase">
                                {item.retryCount > 0 ? `R:${item.retryCount}/${item.maxRetries}` : 'PRET'}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-white block">
                                  {formatOperationType(item.type)}
                                </span>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                  {getOperationDetails(item.type, item.payload)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 justify-end text-right">
                              {isBackingOff ? (
                                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-900/45">
                                  <Clock className="w-3 h-3 animate-spin" />
                                  Nouvel essai dans {secondsLeft}s
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-900/30">
                                  Prêt à synchroniser
                                </span>
                              )}
                              <span className="text-[9.5px] text-slate-500 font-mono">
                                {new Date(item.nextAttemptTime || Date.now()).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Dead Letter Queue (DLQ) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Actions échouées - DLQ ({dlq.length})
                    </h4>
                    {dlq.length > 0 && (
                      <button 
                        onClick={clearDLQ}
                        className="text-[10px] text-rose-400 hover:text-white px-2.5 py-1 rounded bg-rose-950/30 border border-rose-900 hover:bg-rose-900 transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Vider tout le DLQ
                      </button>
                    )}
                  </div>

                  {dlq.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 bg-slate-900/20">
                      Aucun échec permanent détecté dans l'historique de synchronisation.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                      {dlq.map((item, index) => (
                        <div 
                          key={item.intentId || index} 
                          className="p-3.5 rounded-xl border border-rose-950 bg-rose-950/10 flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white">
                                  {formatOperationType(item.type)}
                                </span>
                                <span className="text-[9px] bg-rose-950 border border-rose-800 text-rose-400 px-1.5 py-0.2 rounded font-black">
                                  ÉCHEC {item.retryCount}/{item.maxRetries}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-350 block mt-1">
                                {getOperationDetails(item.type, item.payload)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => retryDLQItem(item)}
                                className="p-1.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 hover:bg-emerald-800 hover:text-white transition-all"
                                title="Forcer la retransmission immédiatement"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteDLQItem(item)}
                                className="p-1.5 rounded bg-slate-900 border border-slate-850 text-slate-400 hover:bg-rose-900 hover:text-white transition-all"
                                title="Supprimer l'action"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 text-[11px] font-mono text-rose-300 border border-rose-950/50 break-words">
                            <span className="font-bold text-rose-400">Erreur : </span>
                            {item.lastError || "Réseau déconnecté durant le traitement."}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Panel de Simulation Experts */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    Outils experts et simulations de pannes
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Ces boutons simulent des conditions réelles de production pour tester la résilience transactionnelle de l'application et les retransmissions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={simulateRuleFailure}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-rose-950/45 hover:text-rose-300 text-slate-350 border border-slate-700/50 hover:border-rose-900 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Simuler échec de règles (Firestore)
                    </button>
                    <button
                      onClick={simulateConcurrentConflicts}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-amber-950/45 hover:text-amber-300 text-slate-350 border border-slate-700/50 hover:border-amber-900 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Simuler conflit de concurrence
                    </button>
                  </div>
                </div>

              </div>

              {/* Pied de la console */}
              <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-450" />
                  Sauvegarde locale disponible : {hasSnapshot ? (
                    <span className="font-bold text-slate-200">
                      {snapshotManager.formatSnapshotDate(snapshot.lastFullSync)}
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold">Inexistante (En ligne requise)</span>
                  )}
                </span>
                <span className="text-[10.5px]">
                  ID: <span className="font-mono text-slate-300 uppercase">8a211b3e</span>
                </span>
              </div>
            </motion.div>
          ) : (
            /* Banner réduite de base */
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-slate-950/95 border border-slate-800 backdrop-blur-md rounded-2xl shadow-xl px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-white pointer-events-auto cursor-pointer"
              onClick={() => setIsOpen(true)}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className={`flex h-3 w-3 relative`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      networkQuality === 'ONLINE' ? 'bg-emerald-400' :
                      networkQuality === 'HIGH_LATENCY' ? 'bg-amber-400' :
                      networkQuality === 'RECOVERING' ? 'bg-cyan-400' :
                      'bg-rose-400'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      networkQuality === 'ONLINE' ? 'bg-emerald-500' :
                      networkQuality === 'HIGH_LATENCY' ? 'bg-amber-500' :
                      networkQuality === 'RECOVERING' ? 'bg-cyan-500' :
                      'bg-rose-500'
                    }`} />
                  </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3 text-center md:text-left">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    {networkQuality === 'OFFLINE' && 'Mode local-first actif'}
                    {networkQuality === 'ONLINE' && 'Connexion rétablie'}
                    {networkQuality === 'HIGH_LATENCY' && 'Latence élevée détectée'}
                    {networkQuality === 'RECOVERING' && 'Synchronisation active...'}
                  </span>
                  
                  {networkQuality === 'OFFLINE' ? (
                    <span className="text-xs text-amber-400 flex items-center gap-1 justify-center md:justify-start font-medium">
                      <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                      Données conservées localement dans IndexedDB
                    </span>
                  ) : networkQuality === 'RECOVERING' ? (
                    <span className="text-xs text-cyan-400 flex items-center gap-1 justify-center md:justify-start font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Transmission de la file d'attente...
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 flex items-center gap-1 justify-center md:justify-start">
                      <Database className="w-3.5 h-3.5" />
                      Sauvegarde : {snapshotManager.formatSnapshotDate(snapshot.lastFullSync)}
                    </span>
                  )}
                </div>
              </div>

              {/* Badges d'actions de la banner de base */}
              <div className="flex items-center gap-3">
                {retryQueue.length > 0 && (
                  <span className="text-xs bg-cyan-950 border border-cyan-800 text-cyan-400 font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                    <Clock className="w-3 h-3" />
                    {retryQueue.length} en attente
                  </span>
                )}

                {dlq.length > 0 && (
                  <span className="text-xs bg-rose-950 border border-rose-800 text-rose-400 font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 animate-[bounce_1.5s_infinite]" />
                    {dlq.length} échec(s)
                  </span>
                )}

                <span className="text-xs text-indigo-400 hover:text-white font-bold bg-indigo-950/40 hover:bg-indigo-900 border border-indigo-900 px-3 py-1 rounded-full transition-all flex items-center gap-1">
                  Console d'administration
                  <ChevronUp className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OfflineBanner;
