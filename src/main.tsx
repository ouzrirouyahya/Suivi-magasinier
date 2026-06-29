import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { InventoryProvider } from './context/InventoryContext.tsx';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

// Enregistrement du Service Worker pour un support Offline complet et performant
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[Service Worker] Enregistré avec succès ! Scope:', registration.scope);
        
        // Enregistrer la synchronisation d'arrière-plan si prise en charge
        if ('sync' in registration) {
          (registration as any).sync.register('hydromines-sync')
            .then(() => console.log('[Service Worker] Synchronisation d\'arrière-plan enregistrée avec succès !'))
            .catch((err: any) => console.warn('[Service Worker] Échec d\'enregistrement de la synchro d\'arrière-plan :', err));
        }
      })
      .catch((error) => {
        console.error('[Service Worker] Échec de l\'enregistrement :', error);
      });
  });

  // Écouter les notifications de synchronisation d'arrière-plan pour déclencher la réconciliation
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'BACKGROUND_SYNC_TRIGGERED') {
      console.log('[Service Worker] Notification de synchronisation d\'arrière-plan reçue !');
      window.dispatchEvent(new CustomEvent('sw-sync-triggered'));
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary componentName="App">
      <InventoryProvider>
        <Toaster position="top-right" richColors closeButton />
        <App />
      </InventoryProvider>
    </ErrorBoundary>
  </StrictMode>,
);
