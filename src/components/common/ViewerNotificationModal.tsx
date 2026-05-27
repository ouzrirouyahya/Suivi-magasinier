import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, X, ChevronRight, Activity, Cpu, Database, CheckCircle2 } from 'lucide-react';
import hydrominesLogo from '../../assets/images/hydromines_logo.png';

interface ViewerNotificationModalProps {
  onDismiss?: () => void;
}

export const ViewerNotificationModal: React.FC<ViewerNotificationModalProps> = ({ onDismiss }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initProgress, setInitProgress] = useState(0);

  useEffect(() => {
    // Show only in viewer mode and if not dismissed in the current session
    const isViewer = localStorage.getItem('hydromines_viewer_mode') === 'true';
    const isDismissed = sessionStorage.getItem('hydromines_viewer_notice_dismissed') === 'true';

    if (isViewer && !isDismissed) {
      // Small graceful delay to let the page render majestically first
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Simulate an ultra-slick cinematic system initialization progress bar
  useEffect(() => {
    if (isOpen) {
      setInitProgress(0);
      const startTime = Date.now();
      const duration = 1800; // 1.8 seconds clean animation
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        setInitProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 30);
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);

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
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
        >
          {/* Backdrop Click Dismiss (Saves progress) */}
          <div className="absolute inset-0 transition-opacity bg-radial-at-c from-slate-950/20 via-slate-950/50 to-slate-955/90 cursor-default" onClick={handleClose} />

          {/* Animated Modal Card (Ultra Modern Light Industrial Corporate Panel) */}
          <motion.div
            id="hydromines-viewer-modal-card"
            initial={{ opacity: 0, scale: 0.94, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 140 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-[0_32px_80px_rgba(15,23,42,0.18),inset_0_1px_1px_rgba(255,255,255,1)] overflow-hidden text-left z-50 flex flex-col"
          >
            {/* Top split vibrant technical border: Red (Hydromines) and Sky Blue (Hydromines) */}
            <div className="absolute top-0 left-0 right-0 h-[4px] flex z-[60]">
              <div className="w-1/2 bg-gradient-to-r from-sky-400 to-sky-500" />
              <div className="w-1/2 bg-gradient-to-r from-red-500 to-red-600" />
            </div>

            {/* Left border line: sky blue */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-sky-400 to-sky-500 z-[60]" />

            {/* Right border line: red */}
            <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-red-500 to-red-600 z-[60]" />

            {/* Subtle light glow backdrop behind logo */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button / Top Right */}
            <button
              id="hydromines-viewer-modal-close"
              onClick={handleClose}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all duration-200 border border-transparent hover:border-slate-200/50 z-[60]"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Content container with responsive spacing */}
            <div className="p-6 md:p-8 space-y-6">
              
              {/* Logo & Fine horizontal separator line */}
              <div className="flex flex-col items-center text-center space-y-4 pt-4">
                {/* Logo Fade In */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
                  className="relative p-2 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm"
                >
                  <img 
                    src={hydrominesLogo} 
                    alt="HYDROMINES" 
                    className="w-[110px] h-[110px] object-contain select-none"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle pulsing green light inside logo back border to represent "active system" */}
                  <span className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                </motion.div>

                {/* Fine luminescent horizontal line */}
                <div className="relative w-full h-[1px]">
                  <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  <motion.div 
                    initial={{ left: '-10%' }}
                    animate={{ left: '110%' }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    className="absolute top-0 h-[1.5px] w-1/4 bg-blue-500/40 blur-[1px]"
                  />
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center space-y-2 select-none">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-sm md:text-base font-extrabold tracking-wider text-slate-800 uppercase leading-snug px-4 font-sans"
                >
                  HYDROMINES — INITIALISATION DE L’ENVIRONNEMENT OPÉRATIONNEL
                </motion.h2>
              </div>

              {/* Status Badges Row (Using corporate brand colors: Red, Sky Blue, and Emerald) */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap justify-center gap-3 text-[10px] font-mono font-bold tracking-wider"
              >
                <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-100 text-sky-700 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  SÉCURITÉ ACTIVE
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-100 text-red-700 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  SYNCHRONISATION CONTRÔLÉE
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  VALIDATION CONTINUE
                </div>
              </motion.div>

              {/* Main Body Text (Professional explanation) */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="space-y-4 text-xs md:text-sm text-slate-600 font-sans leading-relaxed text-left md:text-justify px-2 md:px-4"
              >
                <p className="font-bold text-slate-800">
                  Les systèmes centraux sont actuellement en phase de déploiement progressif et de validation avancée.
                </p>
                <p>
                  La plateforme Hydromines fonctionne actuellement à 50% de son architecture cible, dans le cadre d’une intégration technique contrôlée destinée à garantir la stabilité, la cohérence des données et la fiabilité opérationnelle avant ouverture complète.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-2.5 mt-4 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-2 mb-2 select-none uppercase tracking-wider text-[11px] text-sky-750">
                    <Activity className="w-4 h-4 text-sky-500" />
                    Processus de Qualification Technique :
                  </div>
                  <ul className="space-y-1.5 text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-sky-500 font-bold select-none">•</span>
                      <span>l’intégration des modules stratégiques,</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold select-none">•</span>
                      <span>la synchronisation intelligente des données,</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-500 font-bold select-none">•</span>
                      <span>l’optimisation des performances cloud,</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold select-none">•</span>
                      <span>le déploiement des routines de traçabilité,</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-500 font-bold select-none">•</span>
                      <span>ainsi que les validations de sécurité et de conformité système.</span>
                    </li>
                  </ul>
                </div>

                <p className="text-slate-500 pt-1 text-xs italic">
                  La mise en exploitation complète de la plateforme sera finalisée prochainement après validation des derniers environnements techniques.
                </p>
              </motion.div>

              {/* Progress Bar Loader Container (Cinematic Tech Loading Sequence) */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="space-y-2 px-2 md:px-4"
              >
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 tracking-widest uppercase">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-500 animate-spin" style={{ animationDuration: '3s' }} />
                    SYSTEM INITIALIZATION
                  </span>
                  <span className="font-bold text-slate-700">{Math.round(initProgress)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-red-500 rounded-full"
                    style={{ width: `${initProgress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
              </motion.div>

              {/* Fine Separator Line before Footer */}
              <div className="h-[1px] bg-slate-100 border-b border-transparent mx-2 md:mx-4" />

              {/* Bottom Footer Description */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center font-mono space-y-1 select-none"
              >
                <div className="text-[10px] font-bold text-slate-800 tracking-widest uppercase">
                  Hydromines Engineering Division
                </div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest">
                  Operational Systems • Cloud Infrastructure • Industrial Intelligence
                </div>
              </motion.div>

              {/* Action Button */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, type: 'spring' }}
                className="pt-2 px-2 md:px-4"
              >
                <button
                  id="hydromines-viewer-modal-btn-confirm"
                  onClick={handleClose}
                  disabled={initProgress < 95}
                  className={`w-full py-3.5 px-6 rounded-xl transition-all duration-300 font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 group relative overflow-hidden ${
                    initProgress < 95 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/80' 
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-[0_12px_28px_-10px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_32px_-8px_rgba(37,99,235,0.5)] cursor-pointer active:scale-[0.99] border border-blue-400/10'
                  }`}
                >
                  {/* Fluid light reflection overlay on hover */}
                  <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                  
                  <span>Accéder à la Plateforme</span>
                  <ChevronRight className="w-4 h-4 text-white transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
