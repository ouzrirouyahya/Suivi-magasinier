import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { snapshotManager } from '../lib/snapshotManager';

export function OfflineBanner() {
  const { isOnline, isSyncing } = useOfflineSync();
  const snapshot = snapshotManager.getSnapshot();
  const hasSnapshot = snapshotManager.isFullSnapshotAvailable();

  // If we are online and not syncing, do not show the banner to save screen space
  if (isOnline && !isSyncing) return null;

  return (
    <div 
      id="offline-banner"
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-2.5 flex items-center justify-center gap-2 transition-all duration-300 bg-slate-900 border-t border-slate-800 text-white shadow-2xl"
    >
      {!isOnline ? (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-400">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>Mode hors ligne — Les données seront synchronisées automatiquement</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
            <Database className="w-3 h-3 text-slate-450 flex-shrink-0" />
            {hasSnapshot ? (
              <span>
                {'📦 Données du : '}
                <span className="font-black text-white">
                  {snapshotManager.formatSnapshotDate(snapshot.lastFullSync)}
                </span>
                <span className="text-amber-400 ml-1">
                  — Vous travaillez sur ces données
                </span>
              </span>
            ) : (
              <span className="text-amber-400 font-medium">
                ⚠️ Aucune sauvegarde — Connexion requise pour le premier chargement
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2.5">
          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            ● Connecté
          </span>
          <span className="text-slate-600 text-xs">•</span>
          <span className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Database className="w-3 h-3" />
            {hasSnapshot
              ? `Sauvegarde : ${snapshotManager.formatSnapshotDate(snapshot.lastFullSync)}`
              : 'Chargement initial en cours...'}
          </span>
        </div>
      )}
    </div>
  );
}

export default OfflineBanner;
