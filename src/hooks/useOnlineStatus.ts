import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, db } from '../lib/db';

export function useOnlineStatus() {
  const [presenceData, setPresenceData] = useState<Record<string, string>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // S'abonner via onSnapshot à la collection presence
  useEffect(() => {
    const presenceRef = collection(db, 'presence');
    const unsubscribe = onSnapshot(presenceRef, (snapshot) => {
      const data: Record<string, string> = {};
      snapshot.forEach((doc) => {
        const lastHeartbeatAt = doc.data().lastHeartbeatAt;
        if (lastHeartbeatAt) {
          data[doc.id] = lastHeartbeatAt;
        }
      });
      setPresenceData(data);
    }, (error) => {
      console.error('[useOnlineStatus] Error fetching presence:', error);
    });

    return () => unsubscribe();
  }, []);

  // Fonction pour recalculer le Set des utilisateurs en ligne
  const recalculateOnline = useCallback((data: Record<string, string>) => {
    const now = Date.now();
    const activeIds = new Set<string>();
    
    Object.entries(data).forEach(([userId, lastHeartbeatAt]) => {
      const heartbeatTime = new Date(lastHeartbeatAt).getTime();
      if (now - heartbeatTime < 90000) { // 90 secondes
        activeIds.add(userId);
      }
    });
    
    setOnlineUserIds(activeIds);
  }, []);

  // Recalculer quand presenceData change
  useEffect(() => {
    recalculateOnline(presenceData);
  }, [presenceData, recalculateOnline]);

  // Recalculer toutes les 15 secondes
  useEffect(() => {
    const intervalId = setInterval(() => {
      recalculateOnline(presenceData);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [presenceData, recalculateOnline]);

  const isOnline = useCallback((userId: string) => {
    return onlineUserIds.has(userId);
  }, [onlineUserIds]);

  return { isOnline };
}
