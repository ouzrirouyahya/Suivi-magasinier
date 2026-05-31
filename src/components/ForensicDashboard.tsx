/**
 * OBLIGATORY SRE RUNTIME ENFORCEMENT - PCV v2.0 & FORENSIC OBSERVABILITY v5.0
 * Module: Live Forensic Dashboard & Terminal
 * File: /src/components/ForensicDashboard.tsx
 */

import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { getForensicLogs, clearAllForensicLogs, estimateLocalStorageQuotas } from '../core/forensicJournal';
import {
  ShieldAlert,
  Terminal,
  Database,
  RefreshCw,
  Download,
  Trash2,
  Cpu,
  Unplug,
  HardDrive,
  Activity,
  CheckCircle2,
  Clock,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'sonner';

export default function ForensicDashboard() {
  const {
    articles,
    lastSnapshotTimestamp,
    retryQueue,
    dlq,
    rcglResult,
    collectSystemMetrics,
    exportForensic,
    forceRunQueue,
    currentUser,
    maintenanceMode,
    maintenanceReason,
    toggleMaintenanceLock,

    // SRE Snapshot Recovery & Integrity Engine v7.0 exports
    ledgerEntries,
    snapshots,
    triggerDeepScan,
    triggerRollback,
    triggerSKURollback,
    saveManualStateSnapshot,
    importEmergencyBackup,
    reconstructStateFromLedger,

    // Multi-site SRE transfers and quality v9.0
    transferts,
    approveTransfert,
    completeTransfert,
    closeTransfert,
    networkQuality
  } = useInventory();

  const isAdminUser = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const [logs, setLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [storage, setStorage] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'METRICS' | 'LOGS' | 'RECOVERY' | 'RECONCILIATION'>('METRICS');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lockInputReason, setLockInputReason] = useState('Audit de sécurité exceptionnel - Magasin de surface verrouillé.');

  // SRE Multi-Site Reconciliation cockpit states v9.0
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [disputeQuantities, setDisputeQuantities] = useState<Record<string, number>>({});
  const [disputeReasonMsg, setDisputeReasonMsg] = useState('');
  const [closeReasonMsg, setCloseReasonMsg] = useState('');
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false);

  // SRE Cockpit States v7.0
  const [skuRollbackTarget, setSkuRollbackTarget] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [scanSite, setScanSite] = useState('Surface_Nord');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [backupFileContent, setBackupFileContent] = useState<any>(null);
  const [isReconstructing, setIsReconstructing] = useState(false);

  const fetchLiveTelemetry = () => {
    setLogs(getForensicLogs().reverse());
    setMetrics(collectSystemMetrics());
    setStorage(estimateLocalStorageQuotas());
  };

  useEffect(() => {
    fetchLiveTelemetry();
    // 3s interval for high frequency mission-critical cockpit updates
    const interval = setInterval(fetchLiveTelemetry, 3000);
    return () => clearInterval(interval);
  }, [lastSnapshotTimestamp, retryQueue, dlq, rcglResult]);

  const handleForceExecute = async () => {
    setIsRefreshing(true);
    toast.info("Déclenchement forcé de la synchronisation...");
    try {
      await forceRunQueue();
      toast.success("Demande de traitement transmise.");
    } catch {
      toast.error("Échec du forçage de synchronisation.");
    } finally {
      setIsRefreshing(false);
      fetchLiveTelemetry();
    }
  };

  const handleExportJson = () => {
    try {
      const dataStr = exportForensic();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hydromines_forensic_snap_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Export forensic généré avec succès !");
    } catch (err) {
      toast.error("Échec de la génération de l'export JSON.");
    }
  };

  const handleClearLogs = () => {
    if (window.confirm("Voulez-vous vraiment vider le journal forensic ? Cette action n'efface ni la queue ni la DLQ.")) {
      clearAllForensicLogs();
      fetchLiveTelemetry();
      toast.success("Journal d'audit réinitialisé.");
    }
  };

  if (!metrics || !storage) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-3 text-emerald-500" />
        Acquisition des signaux télémétriques...
      </div>
    );
  }

  const confidencePct = Math.round(metrics.confidenceScore * 100);
  const hasAlerts = metrics.unresolvedAlerts.length > 0;

  return (
    <div className="bg-slate-950 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden text-slate-100 font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-wider uppercase">COCKPIT DE SURVEILLANCE & OBSERVABILITÉ</h2>
              <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                PCV v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Supervision forensic autonome des terminaux du magasin HydroMines</p>
          </div>
        </div>

        {/* TOP LEVEL ACTION RIG */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleForceExecute}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 active:bg-sky-500/30 text-sky-400 border border-sky-500/20 rounded-lg text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            SYNCHRONISER FORCE
          </button>
          
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-mono uppercase tracking-wider transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORTER SNAPSHOT
          </button>

          <button
            onClick={handleClearLogs}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/15 border border-slate-800 rounded-lg transition-all"
            title="Vider le journal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SYSTEM HEALTH CARDS GRID */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-slate-900">
        
        {/* CONFIDENCE CARD */}
        <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs uppercase tracking-wider font-mono">Confiance Snapshot</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-white">{confidencePct}%</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                metrics.confidenceMode === 'NORMAL' ? 'bg-emerald-500/10 text-emerald-400' :
                metrics.confidenceMode === 'DEGRADED' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {metrics.confidenceMode}
              </span>
            </div>
            {/* PROGRESS BAR */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  metrics.confidenceScore > 0.8 ? 'bg-emerald-500' :
                  metrics.confidenceScore >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* QUEUE DEPTH CARD */}
        <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs uppercase tracking-wider font-mono">Pression File (FIFO)</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono tracking-tight text-white">{metrics.queueDepth}</span>
              <span className="text-xs text-slate-500">en attente</span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Retry Pressure: {metrics.retryPressure} / {metrics.queueDepth * 5} attempts
            </p>
          </div>
        </div>

        {/* DEAD LETTER QUEUE (DLQ) CARD */}
        <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs uppercase tracking-wider font-mono">Corruption (DLQ)</span>
            <ShieldAlert className={`w-4 h-4 ${metrics.dlqCount > 0 ? 'text-red-500 animate-bounce' : 'text-slate-500'}`} />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black font-mono tracking-tight ${metrics.dlqCount > 0 ? 'text-red-500' : 'text-white'}`}>
                {metrics.dlqCount}
              </span>
              <span className="text-xs text-slate-500">défaillances insolubles</span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              {metrics.dlqCount > 0 ? 'Action Manuelle SRE Requise' : 'Aucune dérive isolante'}
            </p>
          </div>
        </div>

        {/* LOCAL STORAGE QUOTA */}
        <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs uppercase tracking-wider font-mono">Quota Storage</span>
            <HardDrive className="w-4 h-4 text-amber-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono tracking-tight text-white">{metrics.localStoragePctUsed}%</span>
              <span className="text-xs text-slate-500">de 5MB</span>
            </div>
            {/* QUOTA METER */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${storage.isPressionHigh ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, metrics.localStoragePctUsed)}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* GLOBAL MAINTENANCE LOCK PANEL */}
      <div className="mx-6 mb-6 p-5 bg-slate-900 border border-slate-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${maintenanceMode ? 'bg-amber-500/10 text-amber-500 border border-amber-500/25' : 'bg-slate-800/50 text-slate-400 border border-slate-800'}`}>
            {maintenanceMode ? <Lock className="w-6 h-6 animate-pulse" /> : <Unlock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black font-mono tracking-wider uppercase">VERROU D'ÉCRITURE CENTRALISE (PROTECTED MAINTENANCE)</h3>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                maintenanceMode ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {maintenanceMode ? 'SÉCURISÉ / BLOQUÉ' : 'NOMINAL / ACCÈS LIBRE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Le verrouillage global SRE empêche toute modification d'article, mouvement ou transfert par les magasiniers de surface. Seuls les administrateurs cloud peuvent modifier les registres pendant un gel de sécurité.
            </p>
            {maintenanceMode && (
              <p className="text-xs text-amber-400 font-bold font-mono mt-1.5">
                Raison active : "{maintenanceReason || 'Lock manuel de sécurité'}"
              </p>
            )}
          </div>
        </div>

        {/* ADMIN TRIGGER RIG */}
        {isAdminUser ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {!maintenanceMode && (
              <input
                type="text"
                value={lockInputReason}
                onChange={(e) => setLockInputReason(e.target.value)}
                placeholder="Spécifier un motif de maintenance..."
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-amber-500 placeholder-slate-700 transition-all w-full sm:w-64"
              />
            )}
            <button
              onClick={() => toggleMaintenanceLock(!maintenanceMode, lockInputReason)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider font-mono border transition-all ${
                maintenanceMode 
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 text-emerald-400 border-emerald-500/20' 
                  : 'bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/35 text-red-400 border-red-500/20'
              }`}
            >
              {maintenanceMode ? 'DÉVERROUILLER SYSTÈME' : 'ACTIVER GEL IMMÉDIAT'}
            </button>
          </div>
        ) : (
          <div className="text-right text-[10px] font-mono text-slate-500 uppercase tracking-widest shrink-0">
            Contrôle SRE réservé aux Administrateurs
          </div>
        )}
      </div>

      {/* SUBSYSTEM SIGNALS STATS RIG */}
      <div className="px-6 py-4 bg-slate-900/20 border-b border-slate-900 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 uppercase">Dernière Sync OK:</span>
            <span className="text-slate-200">
              {metrics.lastSuccessfulSync > 0 ? new Date(metrics.lastSuccessfulSync).toLocaleTimeString() : 'N/A'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 uppercase">Âge Snapshot:</span>
            <span className="text-slate-200">
              {metrics.ageOfLastSnapshotMs !== Infinity ? `${Math.round(metrics.ageOfLastSnapshotMs / 1000)}s` : 'Jamais'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 uppercase">Fréquence/Throttle:</span>
            <span className="text-yellow-400">{metrics.currentThrottleRateMs}ms</span>
          </div>
        </div>

        {/* STORM FLAG */}
        <div className="flex items-center gap-2 font-black uppercase">
          {metrics.reconnectStormStatus ? (
            <span className="flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1 rounded text-[10px] animate-pulse">
              <Unplug className="w-3.5 h-3.5" /> RECONNECT STORM ACTIVE
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Réseau Stable / Calme
            </span>
          )}
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="border-b border-slate-900 flex">
        <button
          onClick={() => setActiveTab('METRICS')}
          className={`px-5 py-3 border-b-2 text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'METRICS' ? 'border-emerald-500 text-slate-100 bg-slate-900/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Signal Alertes & Classification ({metrics.unresolvedAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-5 py-3 border-b-2 text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'LOGS' ? 'border-emerald-500 text-slate-100 bg-slate-900/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Journal Forensic ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('RECOVERY')}
          className={`px-5 py-3 border-b-2 text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'RECOVERY' ? 'border-amber-500 text-slate-100 bg-slate-900/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Restauration & Ledger SRE ({snapshots.length})
        </button>
        <button
          onClick={() => setActiveTab('RECONCILIATION')}
          className={`px-5 py-3 border-b-2 text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'RECONCILIATION' ? 'border-sky-500 text-slate-100 bg-slate-900/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Coordination Multi-Sites ({transferts.length})
        </button>
      </div>
 
      {/* TAB CONTENT */}
      <div className="p-6 overflow-y-auto font-mono text-xs">
        {activeTab === 'METRICS' ? (
          <div className="space-y-4 max-h-[450px]">
            <div className="text-slate-300 font-bold uppercase tracking-wide border-b border-slate-900 pb-2">
              Audits de Cohérence Sécurisée & Diagnostics SRE
            </div>
            
            {metrics.unresolvedAlerts.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <div className="font-bold">ZÉRO ANOMALIE LOGIQUE DÉTECTÉE</div>
                  <div className="text-[11px] text-slate-400">Tous les processus sont en cours d'exécution de manière fluide. Les dérives de snapshot sont nominalement traitées.</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {metrics.unresolvedAlerts.map((alert: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-red-400">
                    <ShieldAlert className="w-4 h-4 animate-bounce shrink-0" />
                    <div>
                      <div className="font-bold uppercase text-[11px] tracking-wide text-red-300">{alert}</div>
                      <div className="text-[10px] text-slate-400">
                        {alert.includes('STORE_STORM') ? 'Le throttle ralentit la queue suite à micro-coupure réseau répétée.' :
                         alert.includes('DLQ') ? 'Une exception fatale bloque certains paquets. Un superviseur humain doit inspecter le registre DLQ.' :
                         'Le cockpit SRE a restreint certains traitements.'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-lg space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-black">STATUT PCV CLASSIFICATION</div>
                <div className="text-slate-200">Catégorie : <span className="text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded ml-1 bg-emerald-500/5 uppercase">{rcglResult.classification}</span></div>
                <p className="text-[10px] text-slate-500 pt-1">
                  Les drifts de latence mineurs (classifiés NETWORK_DRIFT) ne bloquent pas le magasinier de surface.
                </p>
              </div>
 
              <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-lg space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-black">REGISTRES RECUPERATION</div>
                <div className="text-slate-200">Reconstructions Idempotentes: <span className="text-white ml-1 font-bold">{metrics.recentRecoveriesCount}</span></div>
                <p className="text-[10px] text-slate-500 pt-1">
                  Nombre de fois où des transactions ont été dédupliquées sans corrompre le stock central.
                </p>
              </div>
            </div>
 
          </div>
        ) : activeTab === 'LOGS' ? (
          <div className="space-y-2 max-h-[450px]">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Journal d'opération vide. Aucune trace enregistrée.
              </div>
            ) : (
              logs.map((log: any) => {
                const clock = new Date(log.timestamp).toLocaleTimeString();
                return (
                  <div key={log.forensicId} className="border-b border-slate-900 pb-2 flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-600 shrink-0 select-none">[{clock}]</span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-1 py-0.1 shrink-0 rounded ${
                      log.severity === 'CRITICAL' ? 'bg-red-500 text-slate-950' : 
                      log.severity === 'ERROR' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      log.severity === 'WARN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-slate-850 text-slate-400'
                    }`}>
                      {log.severity}
                    </span>
                    <span className="text-emerald-400 font-bold shrink-0">[{log.subsystem}]</span>
                    <div className="text-slate-300 break-all flex-grow">
                      {log.message}
                      {log.metadata && (
                        <span className="text-[10px] block font-normal text-slate-500 italic mt-0.5 font-mono">
                          Payload metadata: {JSON.stringify(log.metadata)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* DISASTER RECOVERY & SRE BLOCKCHAIN TAB PANEL */
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-amber-400 font-bold uppercase text-xs tracking-wide">CONSOLE DE RÉSILIENCE AVANCÉE (SRE DISASTER COCKPIT)</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Reconstruisez des balances endommagées, restaurez des snapshots temporels ou lancez des scans de cohérence cryptographique profonds.
                </p>
              </div>

              {/* MANUAL SNAPSHOT TRIGGER */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  value={newSnapshotLabel}
                  onChange={(e) => setNewSnapshotLabel(e.target.value)}
                  placeholder="Label du snapshot manuel..."
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-200 outline-none focus:border-amber-500 placeholder-slate-700 w-full md:w-48"
                />
                <button
                  onClick={() => {
                    saveManualStateSnapshot(newSnapshotLabel);
                    setNewSnapshotLabel('');
                  }}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-bold uppercase transition-all shrink-0"
                >
                  CRÉER SNAPSHOT
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* PANEL 1: DEEP INNER CONFLICT SCAN */}
              <div className="bg-slate-900/30 border border-slate-850/80 p-5 rounded-2xl space-y-4">
                <div className="border-b border-slate-900 pb-3">
                  <span className="text-emerald-400 uppercase tracking-wider font-bold text-[11px] block">1. Diagnostique & Analyse Cohérence</span>
                  <span className="text-[10px] text-slate-500">Moteur d'Intégrité HydroMines</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px] tracking-wide uppercase">Site d'Audit:</span>
                    <select
                      value={scanSite}
                      onChange={(e) => setScanSite(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 font-mono outline-none"
                    >
                      <option value="Surface_Nord">Surface Nord</option>
                      <option value="Surface_Sud">Surface Sud</option>
                      <option value="Mine_Galerie_4">Mine Galerie 4</option>
                      <option value="Foret_Est_Depot_3">Forêt Est Dépôt 3</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setIsScanning(true);
                      toast.info(`Démarrage du scan de cohérence profonde sur ${scanSite}...`);
                      setTimeout(() => {
                        const res = triggerDeepScan(scanSite);
                        setScanResult(res);
                        setIsScanning(false);
                        if (res.isCorrupted) toast.error("Corruption logique identifiée !");
                        else toast.success("Aucune corruption détectée.");
                      }, 1000);
                    }}
                    disabled={isScanning}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    {isScanning ? 'ANALYSE EN COURS...' : 'LANCER SCAN PROFOND'}
                  </button>

                  {/* SCAN RESULT VIEW */}
                  {scanResult ? (
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 text-[11px] leading-relaxed">
                      <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                        <span className="font-bold text-slate-300">Rapport de scan :</span>
                        <span className={`font-black font-mono text-[10px] px-2 py-0.5 rounded ${
                          scanResult.isCorrupted ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {scanResult.isCorrupted ? 'CORROMPU' : 'SAIN'}
                        </span>
                      </div>

                      <div className="space-y-1.5 break-all">
                        <div className="text-slate-450 flex justify-between">
                          <span className="text-slate-500">Score de conformité:</span>
                          <span className={`font-bold ${scanResult.diagnosticScore > 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                            {scanResult.diagnosticScore}/100
                          </span>
                        </div>
                        <div className="text-slate-450 flex justify-between">
                          <span className="text-slate-500">Chaîne de Blocs:</span>
                          <span className={scanResult.isLedgerChainValid ? "text-emerald-400" : "text-rose-400"}>
                            {scanResult.isLedgerChainValid ? "✓ Intidés / Hachage OK" : "✗ Brisure détectée"}
                          </span>
                        </div>
                        <div className="text-slate-450 flex justify-between">
                          <span className="text-slate-500">Générations Orphelines:</span>
                          <span className="text-slate-200">{scanResult.orphanedMovementsCount}</span>
                        </div>
                        <div className="text-slate-450 flex justify-between">
                          <span className="text-slate-500">Gaps Temporels:</span>
                          <span className="text-slate-200">{scanResult.chronologicalGapsCount}</span>
                        </div>
                        <div className="text-slate-455 flex justify-between">
                          <span className="text-slate-500">Abus Sous-écoulement:</span>
                          <span className="text-slate-200">{scanResult.quantityUnderflowsCount}</span>
                        </div>
                      </div>

                      {scanResult.isCorrupted && (
                        <div className="p-2 border border-red-500/25 bg-red-500/5 text-red-400 text-[10px] rounded leading-relaxed">
                          <strong>Alerte :</strong> {scanResult.corruptionReport}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-slate-950/40 border border-slate-900 text-slate-600 rounded-xl">
                      Aucun audit actif. Démarrez l'inspecteur pour afficher le diagnostic.
                    </div>
                  )}
                </div>
              </div>

              {/* PANEL 2: ROLLBACK CONTROL TOWER */}
              <div className="bg-slate-900/30 border border-slate-850/80 p-5 rounded-2xl space-y-4">
                <div className="border-b border-slate-900 pb-3">
                  <span className="text-amber-400 uppercase tracking-wider font-bold text-[11px] block">2. Temporal States / Rollback Engine</span>
                  <span className="text-[10px] text-slate-500">Restauration Complète ou SKU Sélective</span>
                </div>

                <div className="space-y-4">
                  {/* SELECTIVE SKU RESTORE RIG */}
                  <div className="p-3 bg-slate-950 border border-slate-850/90 rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-450 font-black tracking-wide uppercase block">Rollback SKU Sélectif</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={skuRollbackTarget}
                        onChange={(e) => setSkuRollbackTarget(e.target.value)}
                        placeholder="Réf SKU (ex: DISJ-400)..."
                        className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono outline-none placeholder-slate-700 flex-grow"
                      />
                      <select
                        value={selectedSnapshotId}
                        onChange={(e) => setSelectedSnapshotId(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-400 outline-none w-28"
                      >
                        <option value="">-- Snapshot --</option>
                        {snapshots.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.label.slice(0, 15)}...
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        if (!skuRollbackTarget || !selectedSnapshotId) {
                          toast.error("Veuillez spécifier le SKU et le Snapshot ciblé.");
                          return;
                        }
                        triggerSKURollback(skuRollbackTarget, selectedSnapshotId);
                        setSkuRollbackTarget('');
                      }}
                      className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-400 border border-amber-500/25 rounded font-bold text-[10px] uppercase tracking-wider transition-all"
                    >
                      EXÉCUTER RESTAURATION SKU
                    </button>
                  </div>

                  {/* SNAPSHOTS LIST FEED */}
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    <span className="text-[10px] text-slate-450 font-black tracking-wide uppercase block">Historique Snapshots Globaux</span>
                    {snapshots.length === 0 ? (
                      <div className="text-slate-600 text-center py-4 italic">Aucun point de reprise existant.</div>
                    ) : (
                      snapshots.map((s: any) => {
                        const dateStr = new Date(s.timestamp).toLocaleTimeString();
                        return (
                          <div key={s.id} className="p-2 border border-slate-850 bg-slate-950/40 hover:bg-slate-950 rounded flex items-center justify-between text-[10px]">
                            <div>
                              <span className="font-bold text-slate-300 block">{s.label}</span>
                              <span className="text-[9px] text-slate-500 italic">ID: {s.id.slice(0, 8)}... | {dateStr} | {s.articleCount} Articles</span>
                            </div>

                            {isAdminUser && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Voulez-vous vraiment restaurer TOUT l'inventaire au point: "${s.label}"?`)) {
                                    triggerRollback(s.id);
                                  }
                                }}
                                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded font-black font-mono"
                              >
                                RESTORE
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* PANEL 3: IMMUTABLE LEDGER & RECONSTRUCT PANIC */}
              <div className="bg-slate-900/30 border border-slate-850/80 p-5 rounded-2xl space-y-4">
                <div className="border-b border-slate-900 pb-3">
                  <span className="text-orange-400 uppercase tracking-wider font-bold text-[11px] block font-mono">3. Ledger Immuable (Blockchain Audit)</span>
                  <span className="text-[10px] text-slate-500">Append-Only Forensic Ledger</span>
                </div>

                <div className="space-y-4">
                  {/* PANIC REPLAY TRIGGER */}
                  {isAdminUser && (
                    <button
                      onClick={async () => {
                        if (window.confirm("CRITICAL PANIC OVERWRITE : Vous allez écraser l'état actuel de la base d'articles pour recalculer l'intégralité des stocks en rejouant chronologiquement la Blockchain de Ledger. Continuer ?")) {
                          setIsReconstructing(true);
                          try {
                            await reconstructStateFromLedger();
                          } finally {
                            setIsReconstructing(false);
                          }
                        }
                      }}
                      disabled={isReconstructing}
                      className="w-full py-2 bg-orange-600/15 hover:bg-orange-600/25 active:bg-orange-600/35 text-orange-400 border border-orange-500/30 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all animate-pulse"
                    >
                      {isReconstructing ? 'REPLAY ET CONSOLIDATION...' : 'PANIQUE: RECONSTRUIRE PAR LEDGER'}
                    </button>
                  )}

                  {/* IMPORT EXPORT SECURE BACKUPS */}
                  <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                    <span className="text-[10px] text-slate-450 font-black uppercase block tracking-wide">Backups d'Urgence (Intégrité)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          try {
                            const rawLedgerString = localStorage.getItem('hydromines_immutable_ledger') || '[]';
                            const backupObj = {
                              appId: 'hydromines-industrial',
                              createdAt: new Date().toISOString(),
                              articles: articles,
                              ledger: JSON.parse(rawLedgerString)
                            };
                            const dataStr = JSON.stringify(backupObj, null, 2);
                            const blob = new Blob([dataStr], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `hydromines_backup_SRE_${Date.now()}.json`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            toast.success("Sauvegarde d'intégrité exportée !");
                          } catch (err: any) {
                            toast.error(`Échec export: ${err.message}`);
                          }
                        }}
                        className="py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-350 border border-slate-800 rounded text-[10px] font-bold uppercase transition-all"
                      >
                        EXPORTER
                      </button>

                      <label className="py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-350 border border-slate-850 rounded text-[10px] font-bold uppercase text-center cursor-pointer transition-all">
                        CHARGER JSON
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async (evt) => {
                              try {
                                const parsed = JSON.parse(evt.target?.result as string);
                                setBackupFileContent(parsed);
                                toast.info("Sauvegarde importée prête pour validation.");
                              } catch {
                                toast.error("Format de sauvegarde JSON invalide.");
                              }
                            };
                            reader.readAsText(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {backupFileContent && (
                      <div className="p-2 border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[10px] rounded space-y-2">
                        <div>
                          <strong>Fichier chargé :</strong> backup ({backupFileContent.articles?.length || 0} art, {backupFileContent.ledger?.length || 0} ledger)
                        </div>
                        <button
                          onClick={async () => {
                            const success = await importEmergencyBackup(backupFileContent);
                            if (success) setBackupFileContent(null);
                          }}
                          className="w-full py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded font-black text-[9px] uppercase tracking-widest transition-all"
                        >
                          VALIDER & CONSOLIDER DANGER
                        </button>
                      </div>
                    )}
                  </div>

                  {/* LEDGER ENTRIES MINI TERMINAL */}
                  <div className="border border-slate-850 bg-slate-950 p-2.5 rounded-lg space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    <span className="text-[9px] text-slate-500 font-black tracking-wide uppercase block">Blockchain Registry Log:</span>
                    {ledgerEntries.length === 0 ? (
                      <div className="text-slate-700 italic text-center py-4 text-[9px]">Ledger vide.</div>
                    ) : (
                      [...ledgerEntries].reverse().map((entry: any) => {
                        const timeStr = new Date(entry.timestamp).toLocaleTimeString();
                        return (
                          <div key={entry.serial} className="border-b border-slate-900 pb-1.5 text-[9px] font-mono leading-relaxed select-all">
                            <span className="text-yellow-600">#{entry.serial}</span>{' '}
                            <span className="text-slate-450 uppercase font-black bg-slate-900 px-1 py-0.2 rounded text-[8px] text-slate-400">{entry.actionType}</span>{' '}
                            <span className="text-slate-600 block text-[8px] italic">{timeStr} | intent: {entry.intentId.slice(0, 10)}...</span>
                            <span className="text-slate-500 block break-all font-light text-[8px]">Hash: {entry.entryHash.slice(0, 16)}...</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'RECONCILIATION' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800/65 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest">Contrôle de Résilience Réseau & Synchronisations</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Détection automatique de la connectivité et adaptation dynamique des temps de replis/cooldowns.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 font-mono">
                <span className="text-slate-500 font-bold">QUALITÉ:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                  networkQuality === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  networkQuality === 'HIGH_LATENCY' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                  networkQuality === 'INTERMITTENT' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse' :
                  networkQuality === 'RECOVERING' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                  'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {networkQuality}
                </span>
                <span className="text-slate-600">| Cooldown: {metrics.currentThrottleRateMs}ms</span>
              </div>
            </div>

            {/* BLOCK 1: BLOCKED TRANSFERS AND INTENTS */}
            <div className="bg-slate-900/30 border border-slate-850/80 p-5 rounded-2xl space-y-4">
              <div className="border-b border-slate-950 pb-2 flex justify-between items-center">
                <div>
                  <span className="text-slate-300 font-bold block">File d'attente FSM Multi-Sites ({retryQueue.length} En attente)</span>
                  <span className="text-[10px] text-slate-500">Isolation cryptographique par SiteID empêchant les rejeux croisés</span>
                </div>
                {retryQueue.length > 0 && isAdminUser && (
                  <button 
                    onClick={handleForceExecute}
                    className="px-2.5 py-1 bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/20 rounded font-black font-mono text-[9px] uppercase tracking-wider"
                  >
                    FORCER PROCESS REPLAY
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {retryQueue.length === 0 ? (
                  <div className="text-slate-600 italic py-4 text-center">Aucune intention de mutation en attente d'exécution.</div>
                ) : (
                  retryQueue.map((item: any) => (
                    <div key={item.id} className="p-2 bg-slate-950 border border-slate-900 rounded flex items-center justify-between text-[10px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold uppercase bg-slate-900 text-slate-350 px-1.5 py-0.2 rounded text-[8px] border border-slate-800">
                            {item.type}
                          </span>
                          <span className="text-slate-400 font-mono">id: {item.id.slice(0, 10)}...</span>
                          <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-1 border border-blue-500/15 rounded uppercase">
                            SITE: {item.siteId || 'ND'}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-505">
                          Créé à: {new Date(item.createdAt).toLocaleString()} | Tentatives : {item.attempts}/5
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 block">Erreurs : {item.lastError || "Connectivité instable"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BLOCK 2: INTER-SITE TRANSFER PIPELINE */}
            <div className="bg-slate-900/30 border border-slate-850/80 p-5 rounded-2xl space-y-4">
              <div className="border-b border-slate-950 pb-2">
                <span className="text-slate-300 font-bold block">Pipeline Logistique Inter-Sites & Litiges</span>
                <span className="text-[10px] text-slate-500">Suivi transactionnel, cohérences quantitatives de convoi, et corrections d'écarts</span>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {transferts.length === 0 ? (
                  <div className="text-slate-700 italic text-center py-6">Aucun transfert inter-site enregistré.</div>
                ) : (
                  [...transferts].reverse().map((t) => {
                    const isSelected = selectedTransferId === t.id;
                    return (
                      <div key={t.id} className={`p-4 rounded-xl border transition-all ${
                        t.status === 'DISPUTED' ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/15' :
                        t.status === 'PENDING_APPROVAL' ? 'bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/15' :
                        t.status === 'IN_TRANSIT' ? 'bg-sky-500/5 hover:bg-sky-500/10 border-sky-500/15' :
                        'bg-slate-950/50 border-slate-850 hover:bg-slate-950'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-bold text-xs">{t.reference}</span>
                              <span className="text-slate-500 font-mono text-[9px]">ID: {t.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono uppercase font-black tracking-wider ${
                                t.status === 'RECEIVED' || t.status === 'RECU' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                t.status === 'PENDING_APPROVAL' ? 'bg-yellow-500/15 text-yellow-405 border border-yellow-500/20 animate-pulse' :
                                t.status === 'IN_TRANSIT' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20' :
                                t.status === 'DISPUTED' ? 'bg-red-500/15 text-red-400 border border-red-500/20 animate-pulse' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {t.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium mt-1">
                              Magasin source : <strong className="text-white">{t.sourceSite}</strong> &rarr; Magasin cible : <strong className="text-white">{t.targetSite}</strong>
                            </div>
                          </div>

                          <div className="text-right text-[10px] text-slate-505">
                            <div>Émis par: {t.expediteur || t.creePar || 'N/A'}</div>
                            <div>Date: {t.dateSaisie ? new Date(t.dateSaisie).toLocaleDateString() : 'N/A'}</div>
                          </div>
                        </div>

                        {/* ITEMS LIST */}
                        <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-900/50">
                          <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider">Bordereau des Articles :</span>
                          {t.items.map((item) => {
                            const discrepancyQty = disputeQuantities[`${t.id}_${item.articleId}`];
                            return (
                              <div key={item.articleId} className="flex justify-between items-center text-[10px] border-b border-slate-900/40 pb-1 last:border-0 last:pb-0">
                                <span className="text-slate-300 font-medium">{item.designation} <span className="text-[9px] text-slate-505">[{item.ref}]</span></span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Expédié: <span className="text-white font-mono font-bold">{item.quantity}</span></span>
                                  {t.status === 'IN_TRANSIT' && isSelected && (
                                    <div className="flex items-center gap-1.5 ml-2">
                                      <span className="text-amber-500 text-[9px] uppercase font-bold">Arrivé:</span>
                                      <input 
                                        type="number" 
                                        min="0"
                                        value={discrepancyQty !== undefined ? discrepancyQty : item.quantity}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          setDisputeQuantities(prev => ({
                                            ...prev,
                                            [`${t.id}_${item.articleId}`]: val
                                          }));
                                        }}
                                        className="w-12 bg-slate-900 border border-slate-750 font-mono text-center text-[10px] h-5 rounded text-white px-1"
                                      />
                                    </div>
                                  )}
                                  
                                  {t.status === 'DISPUTED' && t.receivedItems && (
                                    <span className="text-red-400 px-1 bg-red-500/5 border border-red-500/10 rounded">
                                      Reçu: {t.receivedItems.find((r: any) => r.articleId === item.articleId)?.quantity ?? '?'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* DISPUTE OR EXPEDITION NOTES */}
                        {t.disputeReason && (
                          <div className="mt-2 p-2 bg-rose-950/25 border border-rose-500/10 text-rose-300 rounded text-[10px] leading-relaxed">
                            <strong>Motif du Litige de Réception :</strong> {t.disputeReason}
                          </div>
                        )}
                        {t.notes && (
                          <div className="mt-2 text-slate-500 text-[9px] italic">
                            Notes : {t.notes}
                          </div>
                        )}

                        {/* COCKPIT BUTTON CONTROLS */}
                        <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
                          {t.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={async () => {
                                if (isProcessingTransfer) return;
                                setIsProcessingTransfer(true);
                                try {
                                  await approveTransfert(t.id, currentUser?.name || currentUser?.email || 'Superviseur SRE');
                                } finally {
                                  setIsProcessingTransfer(false);
                                }
                              }}
                              disabled={isProcessingTransfer}
                              className="px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/25 rounded text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Approuver & Lancer l'expédition
                            </button>
                          )}

                          {t.status === 'PENDING_APPROVAL' && isAdminUser && (
                            <button
                              onClick={async () => {
                                const reason = window.prompt("Entrez le motif du rejet / annulation du transfert draft :");
                                if (reason === null) return;
                                if (isProcessingTransfer) return;
                                setIsProcessingTransfer(true);
                                try {
                                  await closeTransfert(t.id, `Annulé en draft: ${reason}`);
                                } finally {
                                  setIsProcessingTransfer(false);
                                }
                              }}
                              disabled={isProcessingTransfer}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 rounded text-[10px] font-bold uppercase transition-all"
                            >
                              Annuler le convoi
                            </button>
                          )}

                          {t.status === 'IN_TRANSIT' && !isSelected && (
                            <button
                              onClick={() => {
                                setSelectedTransferId(t.id);
                                // Prepopulate dispute fields
                                const initQ: Record<string, number> = {};
                                t.items.forEach(i => {
                                  initQ[`${t.id}_${i.articleId}`] = i.quantity;
                                });
                                setDisputeQuantities(initQ);
                                setDisputeReasonMsg('');
                              }}
                              className="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 rounded text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Ouvrir le Formulaire de Réception
                            </button>
                          )}

                          {t.status === 'IN_TRANSIT' && isSelected && (
                            <div className="w-full space-y-3 pt-3 border-t border-slate-900">
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-slate-450 font-mono">Commentaire / Écart (Requis si quantités divergentes) :</label>
                                <textarea
                                  placeholder="Entrez d'éventuels commentaires, des colis abîmés ou des raisons de litige..."
                                  value={disputeReasonMsg}
                                  onChange={(e) => setDisputeReasonMsg(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 focus:border-sky-500 outline-none text-[10px] text-slate-100 placeholder-slate-705 resize-none h-12"
                                />
                              </div>

                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setSelectedTransferId(null)}
                                  className="px-2.5 py-1 text-slate-400 hover:text-white text-[10px] font-bold uppercase"
                                >
                                  Annuler
                                </button>

                                <button
                                  onClick={async () => {
                                    if (isProcessingTransfer) return;
                                    setIsProcessingTransfer(true);
                                    try {
                                      // Construct receivedItems
                                      const receivedItems = t.items.map(item => ({
                                        ...item,
                                        quantity: disputeQuantities[`${t.id}_${item.articleId}`] ?? item.quantity
                                      }));

                                      // Check if there are discrepancies
                                      let hasDiff = false;
                                      t.items.forEach(item => {
                                        const val = disputeQuantities[`${t.id}_${item.articleId}`];
                                        if (val !== undefined && val !== item.quantity) {
                                          hasDiff = true;
                                        }
                                      });

                                      if (hasDiff && !disputeReasonMsg.trim()) {
                                        toast.error("Le motif de litige est obligatoire en cas d'écart quantitatif.");
                                        setIsProcessingTransfer(false);
                                        return;
                                      }

                                      await completeTransfert(
                                        t.id, 
                                        currentUser?.name || currentUser?.email || 'Récepteur SRE',
                                        receivedItems,
                                        disputeReasonMsg.trim() ? disputeReasonMsg : undefined
                                      );

                                      setSelectedTransferId(null);
                                    } finally {
                                      setIsProcessingTransfer(false);
                                    }
                                  }}
                                  disabled={isProcessingTransfer}
                                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded text-[10px] font-black uppercase tracking-wider"
                                >
                                  Signer pour Réception
                                </button>
                              </div>
                            </div>
                          )}

                          {t.status === 'DISPUTED' && isAdminUser && (
                            <div className="w-full pt-3 border-t border-slate-900 flex flex-col md:flex-row md:items-end gap-3 justify-between">
                              <div className="flex-1 space-y-1">
                                <label className="text-[9px] uppercase font-bold text-red-400 font-mono">Arbitrage d'autorité SRE / Motif de clôture forcée :</label>
                                <input
                                  type="text"
                                  placeholder="Entrez la décision, ex: Ajustement d'inventaire validé d'office après vérification physique."
                                  value={closeReasonMsg}
                                  onChange={(e) => setCloseReasonMsg(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 focus:border-red-500 outline-none text-[10px] text-slate-100 placeholder-slate-705"
                                />
                              </div>

                              <button
                                onClick={async () => {
                                  if (!closeReasonMsg.trim()) {
                                    toast.error("Le motif de clôture d'autorité est requis.");
                                    return;
                                  }
                                  if (isProcessingTransfer) return;
                                  setIsProcessingTransfer(true);
                                  try {
                                    await closeTransfert(t.id, closeReasonMsg);
                                    setCloseReasonMsg('');
                                  } finally {
                                    setIsProcessingTransfer(false);
                                  }
                                }}
                                disabled={isProcessingTransfer}
                                className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-450 border border-red-500/20 rounded text-[10px] font-black uppercase tracking-wider transition-all"
                              >
                                Clôturer le Conflit
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
