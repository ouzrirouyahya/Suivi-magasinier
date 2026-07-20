import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { doc, setDoc, deleteDoc, db } from '../lib/db';

export function usePresence() {
  const currentUser = useAuthStore((s) => s.currentUser);

  useEffect(() => {
    if (!currentUser?.id) return;

    const userId = currentUser.id;

    const sendHeartbeat = async () => {
      try {
        await setDoc(doc(db, 'presence', userId), {
          lastHeartbeatAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        // Silencieux
      }
    };

    // Envoyer immédiatement au montage
    sendHeartbeat();

    // Démarrer l'intervalle toutes les 60 secondes
    const intervalId = setInterval(sendHeartbeat, 60000);

    return () => {
      clearInterval(intervalId);
      // Supprimer le document de présence
      deleteDoc(doc(db, 'presence', userId)).catch(() => {
        // Silencieux
      });
    };
  }, [currentUser?.id]);
}
