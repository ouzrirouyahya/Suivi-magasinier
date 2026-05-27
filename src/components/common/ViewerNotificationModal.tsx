import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShieldCheck, Sparkles, X, ChevronRight, Activity } from 'lucide-react';

interface ViewerNotificationModalProps {
  onDismiss?: () => void;
}

export const ViewerNotificationModal: React.FC<ViewerNotificationModalProps> = ({ onDismiss }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show only in viewer mode and if not dismissed in the current session
    const isViewer = localStorage.getItem('hydromines_viewer_mode') === 'true';
    const isDismissed = sessionStorage.getItem('hydromines_viewer_notice_dismissed') === 'true';

    if (isViewer && !isDismissed) {
      // Small graceful delay to let the page render majestically first
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('hydromines_viewer_notice_dismissed', 'true');
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="hydromines-viewer-modal-backdrop"
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md"
        >
          {/* Backdrop Click Dismiss (Saves progress) */}
          <div className="absolute inset-0" onClick={handleClose} />

          {/* Animated Modal Card */}
          <motion.div
            id="hydromines-viewer-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-[0_24px_64px_rgba(15,23,42,0.18)] border border-slate-100 overflow-hidden text-left z-50 flex flex-col"
          >
            {/* Top Colored Branding Border Accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-emerald-400" />

            {/* Close Button / Top Right */}
            <button
              id="hydromines-viewer-modal-close"
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Content container */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Header Badge & Title */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl shadow-[0_8px_16px_rgba(14,165,233,0.08)] relative overflow-hidden flex-shrink-0">
                  <Activity className="w-6 h-6 animate-pulse" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </div>
                
                <div className="space-y-1 select-none">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-extrabold tracking-widest text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md uppercase">
                      Note Globale Système
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                    HYDROMINES <span className="text-sky-600">ALERT</span>
                  </h2>
                </div>
              </div>

              {/* Status Section Banner */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Statut : Intégration Progressive v2.0
                </div>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  L'infrastructure cloud et les modules automatisés de l'Espace Magasinière font l'objet d'un calibrage technique en continu.
                </p>
              </div>

              {/* Main Body Text (Extremely professional phrasing) */}
              <div className="space-y-4 font-sans">
                <p className="text-sm text-slate-700 font-semibold leading-relaxed">
                  Afin de garantir une précision absolue et un alignement total de la base de données, l'application est actuellement déployée à <span className="text-sky-600 font-bold">95% de sa capacité nominale</span>.
                </p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Nos ingénieurs et architectes cloud intègrent et testent les derniers modules prédictifs de l'IA Hydromines, les routines de rapprochement d'inventaire automatique ainsi que la traçabilité renforcée de bout en bout.
                </p>
                <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Sécurité Active par Certificat</span>
                  </div>
                  <span className="font-mono font-bold uppercase select-none">Bientôt 100% Opérationnel</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-2">
                <button
                  id="hydromines-viewer-modal-btn-confirm"
                  onClick={handleClose}
                  className="w-full py-4 px-6 bg-slate-950 hover:bg-slate-900 text-white rounded-xl shadow-[0_12px_24px_-8px_rgba(15,23,42,0.3)] transition-all duration-200 font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:gap-3 group active:scale-[0.98]"
                >
                  <span>Accéder à l'Espace Supervision</span>
                  <ChevronRight className="w-4 h-4 text-sky-400 transition-transform duration-300 group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {/* Decorative base grid overlay */}
            <div className="absolute bottom-0 right-0 opacity-[0.03] text-slate-950 pointer-events-none -mr-8 -mb-8">
              <svg width="120" height="120" fill="currentColor" viewBox="0 0 100 100">
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
                <rect width="100" height="100" fill="url(#grid)" />
              </svg>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
