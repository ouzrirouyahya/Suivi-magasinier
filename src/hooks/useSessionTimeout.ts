import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../stores/auth.store';
import { toast } from 'sonner';

const TIMEOUT_DURATIONS = {
  SUPER_ADMIN: 60 * 60 * 1000,   // 60 min
  ADMIN: 60 * 60 * 1000,          // 60 min
  MAGASINIER: 30 * 60 * 1000,     // 30 min (terrain)
  RESPONSABLE_CHANTIER: 45 * 60 * 1000,
};
const WARNING_BEFORE = 2 * 60 * 1000; // Avertir 2min avant

export function useSessionTimeout() {
  const { currentUser } = useAuthStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResetRef = useRef<number>(0);

  const resetTimeout = useCallback(() => {
    if (!currentUser) return;
    lastResetRef.current = Date.now();
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    const duration = TIMEOUT_DURATIONS[currentUser.role as keyof typeof TIMEOUT_DURATIONS] 
      || TIMEOUT_DURATIONS.MAGASINIER;

    // Avertissement 2 minutes avant
    warningRef.current = setTimeout(() => {
      toast.warning('⚠️ Déconnexion automatique dans 2 minutes pour inactivité', {
        duration: 10000,
        action: { label: 'Rester connecté', onClick: resetTimeout }
      });
    }, duration - WARNING_BEFORE);

    // Déconnexion automatique
    timeoutRef.current = setTimeout(async () => {
      toast.error('Session expirée — reconnectez-vous');
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Erreur lors de la déconnexion automatique:', err);
      }
    }, duration);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => {
      const now = Date.now();
      // Throttle de 10 secondes pour éviter de surcharger l'évent loop avec mousemove / scroll
      if (now - lastResetRef.current < 10000) return;
      resetTimeout();
    };

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimeout(); // Démarrer le timer

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [currentUser, resetTimeout]);
}
