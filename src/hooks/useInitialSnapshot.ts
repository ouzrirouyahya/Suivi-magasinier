const CRITICAL_COLLECTIONS = [
  'articles', 'mouvements', 'transferts', 'catalog'
];

export function useInitialSnapshot() {
  // Retours immédiats pour un chargement instantané sans blocage
  return {
    isReady: true,
    isLoadingInitial: false,
    progress: 100,
    loadedCollections: CRITICAL_COLLECTIONS,
    totalCollections: CRITICAL_COLLECTIONS.length,
    error: null as string | null,
  };
}
