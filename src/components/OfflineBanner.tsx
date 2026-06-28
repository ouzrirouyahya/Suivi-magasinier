import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export function OfflineBanner() {
  const { isOnline, isSyncing, lastSync } = useOfflineSync();
  
  if (isOnline && !isSyncing) return null;
  
  return (
    <div 
      id="offline-banner"
      className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
        isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Mode hors ligne — Les données seront synchronisées automatiquement</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Synchronisation en cours...</span>
        </>
      ) : null}
      {lastSync && (
        <span className="text-xs opacity-70 ml-2">
          Dernière sync: {lastSync.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

export default OfflineBanner;
