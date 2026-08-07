// Registre centralisé des écouteurs pour éviter les fuites de mémoire et dédoubler les abonnements
const activeListeners = new Map<string, () => void>();

export const snapshotManager = {
  registerListener(key: string, unsubscribe: () => void): void {
    // Si un abonnement avec la même clé est déjà actif, on l'arrête avant d'enregistrer le nouveau
    const existing = activeListeners.get(key);
    if (existing) {
      try {
        existing();
      } catch (err) {
        console.warn(`[snapshotManager] Erreur désabonnement listener ${key}:`, err);
      }
    }
    activeListeners.set(key, unsubscribe);
  },

  unsubscribe(key: string): void {
    const existing = activeListeners.get(key);
    if (existing) {
      try {
        existing();
      } catch (err) {
        console.warn(`[snapshotManager] Erreur désabonnement listener ${key}:`, err);
      }
      activeListeners.delete(key);
    }
  },

  clearAllListeners(): void {
    activeListeners.forEach((unsubscribe, key) => {
      try {
        unsubscribe();
      } catch (err) {
        console.warn(`[snapshotManager] Erreur désabonnement global (${key}):`, err);
      }
    });
    activeListeners.clear();
  },

  markCollectionSaved(colName: string): void {
    try {
      const raw = localStorage.getItem('hydromines_snapshot_state');
      const state = raw ? JSON.parse(raw) : { collections: {} };
      state.collections[colName] = new Date().toISOString();
      try {
        localStorage.setItem('hydromines_snapshot_state', JSON.stringify(state));
      } catch (e) {
        // En cas d'erreur de quota localStorage, on purge les entrées corrompues ou obsolètes et on réessaye
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k.includes('_corrupted_')) {
              localStorage.removeItem(k);
            }
          }
          localStorage.setItem('hydromines_snapshot_state', JSON.stringify(state));
        } catch {}
      }
      // Émettre un custom event pour que useInitialSnapshot le capte
      window.dispatchEvent(new CustomEvent('hydromines:collection-saved', {
        detail: { collection: colName }
      }));
    } catch {}
  },

  getSnapshot(): { collections: Record<string, string>; lastFullSync: string | null } {
    try {
      const raw = localStorage.getItem('hydromines_snapshot_state');
      if (!raw) return { collections: {}, lastFullSync: null };
      const state = JSON.parse(raw);
      const critical = ['articles', 'mouvements', 'transferts', 'catalog'];
      const dates = critical
        .map(c => state.collections[c])
        .filter(Boolean)
        .map(d => new Date(d).getTime());
      const lastFullSync = dates.length === critical.length
        ? new Date(Math.min(...dates)).toISOString()
        : null;
      return { collections: state.collections || {}, lastFullSync };
    } catch {
      return { collections: {}, lastFullSync: null };
    }
  },

  isFullSnapshotAvailable(): boolean {
    return this.getSnapshot().lastFullSync !== null;
  },

  getSnapshotAgeMinutes(): number | null {
    const { lastFullSync } = this.getSnapshot();
    if (!lastFullSync) return null;
    return Math.round((Date.now() - new Date(lastFullSync).getTime()) / 60000);
  },

  formatSnapshotDate(isoDate: string | null): string {
    if (!isoDate) return 'Jamais';
    const d = new Date(isoDate);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString('fr-MA', { 
      hour: '2-digit', minute: '2-digit' 
    });
    if (isToday) return `Aujourd'hui à ${time}`;
    return d.toLocaleDateString('fr-MA', { 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    }) + ` à ${time}`;
  }
};
