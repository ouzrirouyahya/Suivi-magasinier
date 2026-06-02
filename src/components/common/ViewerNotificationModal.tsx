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
          className="fixed inset-0 z-[9999] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          {/* Main Card with elegant border and premium shadows */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
            className="w-full max-w-4xl bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] relative my-auto animate-in zoom-in-95 duration-200"
          >
            {/* Elegant light technical grid inside the card */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#fff_70%,transparent_100%)] opacity-30 pointer-events-none" />
            
            {/* Ambient glows inside of card */}
            <div className="absolute top-0 left-1/4 w-80 h-80 bg-sky-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Scrollable Container for all the rich texts */}
            <div className="relative flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 sm:space-y-8 scrollbar-thin">
              
              {/* Header: Logo, Brand & Badges */}
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Logo and online status tag */}
                <div className="relative p-2.5 bg-white rounded-2xl border border-slate-150 shadow-sm inline-block">
                  <img 
                    src={hydrominesLogo} 
                    alt="HYDROMINES" 
                    className="w-16 h-16 object-contain select-none"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse shadow-[0_0_8px_#10b981]" />
                </div>

                {/* Subtitle brand name mapping */}
                <div className="space-y-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-[0.25em] text-slate-900 uppercase">
                    HYDROMINES
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-700 max-w-xl leading-relaxed uppercase tracking-wider border border-slate-200 bg-slate-50/50 py-2 px-5 rounded-lg inline-block shadow-sm">
                    Bienvenue sur votre espace de gestion de stock. Un outil simple, pensé par et pour le terrain.
                  </h2>
                </div>

                {/* Status Badges Row (as requested) */}
                <div className="flex flex-wrap justify-center gap-2 text-[10px] md:text-xs font-mono font-bold tracking-wider uppercase">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-150 text-sky-700 rounded-lg shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    SÉCURITÉ ACTIVE
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-150 text-rose-700 rounded-lg shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    SYNCHRONISATION CONTRÔLÉE
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-150 text-emerald-700 rounded-lg shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    VALIDATION CONTINUE
                  </span>
                </div>
              </div>

              {/* Main descriptive block */}
              <div className="space-y-3 text-center px-2">
                <p className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 leading-tight">
                  « Bienvenue sur votre plateforme de gestion d’inventaire Hydromines »
                </p>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-bold max-w-2xl mx-auto uppercase tracking-wide">
                  Nous avons conçu une plateforme unique pour simplifier la vie de vos magasins. Plus de papier, plus de doutes : vous gardez un œil en temps réel sur tout votre matériel pour assurer la continuité de vos opérations en toute sérénité.
                </p>
              </div>

              {/* Core features block in a 2-column or tight format */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-left">
                
                {/* Panel 1 - 7 cols on medium+ screens */}
                <div className="md:col-span-7 bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl space-y-4 shadow-sm relative overflow-hidden">
                  <h3 className="text-xs sm:text-sm font-black text-sky-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Activity className="w-5 h-5 text-sky-500 shrink-0" />
                    Suivi Magasinier de Bout en Bout
                  </h3>
                  <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 font-bold leading-normal uppercase tracking-wide">
                    <li className="flex items-start gap-2">
                      <span className="text-sky-500 font-black text-sm select-none mt-0.5">•</span>
                      <span><strong>Flux de Stock Complets</strong> : Enregistrez vos entrées de marchandises, sorties, transferts, retours et ravitaillements en quelques clics.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-500 font-black text-sm select-none mt-0.5">•</span>
                      <span><strong>Matériel Couvert</strong> : Une gestion unifiée pour votre parc d'engins, vos têtes de perforateurs, consommables et EPI.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-500 font-black text-sm select-none mt-0.5">•</span>
                      <span><strong>Analyses & Graphiques</strong> : Visualisez vos consommations et l'état de votre stock via des tableaux de bord interactifs.</span>
                    </li>
                  </ul>
                </div>

                {/* Panel 2 - 5 cols on medium+ screens */}
                <div className="md:col-span-5 bg-slate-50/80 border border-slate-200 p-5 sm:p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-inner relative overflow-hidden">
                  <div className="space-y-3">
                    <h3 className="text-[10px] sm:text-xs font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200/50 pb-2">
                      Une Fiabilité Absolue
                    </h3>
                    <div className="space-y-3">
                      {/* Floating glowing banner restored! */}
                      <div className="relative inline-block overflow-hidden bg-slate-900 text-white font-extrabold text-[9px] sm:text-[11px] tracking-wider px-3 py-1.5 rounded-lg shadow-sm">
                        FINI LA SAISIE MANUELLE !
                        <motion.span 
                          className="absolute inset-0 w-[60px] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                          initial={{ left: '-100%' }}
                          animate={{ left: '250%' }}
                          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                        />
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-bold uppercase tracking-wider">
                        Nous avons intégré les catalogues officiels directement dans le système. Plus besoin de recopier de longues références complexes à la main au risque de vous tromper. Vous sélectionnez la pièce exacte et standardisée en un clic.
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200/60 pt-3">
                    <p className="text-[10px] sm:text-xs text-sky-600 font-bold leading-normal uppercase tracking-wide">
                      * Une plateforme moderne conçue pour éliminer les erreurs de stock.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grand CTA Button (Compact but high contrast & sticky-feeling on bottom) */}
              <div className="pt-2">
                <button
                  id="hydromines-viewer-modal-btn-confirm"
                  onClick={handleClose}
                  className="w-full h-14 rounded-2xl transition-all duration-300 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 group relative overflow-hidden bg-gradient-to-r from-sky-600 via-blue-600 to-emerald-600 text-white cursor-pointer active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                  <span>Ouvrir l'Espace de Gestion</span>
                  <ChevronRight className="w-5 h-5 text-white transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>

              {/* Light Separator */}
              <div className="h-[1px] bg-slate-200/60 w-full" />

              {/* Corporate Sub-Footer restored! */}
              <div className="text-center space-y-2 select-none">
                <p className="text-xs text-slate-600 font-bold uppercase tracking-wide max-w-xl mx-auto leading-relaxed">
                  La plateforme est actuellement déployée à <span className="text-sky-600 font-black">50% de ses capacités</span> pour cette phase pilote. Notre équipe prépare activement la version <span className="text-emerald-600 font-black">100% opérationnelle</span> !
                </p>
                <div className="text-[10px] sm:text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
                  HYDROMINES 2026 - SUIVI MAGASINIER V1
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
