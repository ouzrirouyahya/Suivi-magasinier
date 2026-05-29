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
          className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-50 text-slate-800 overflow-y-auto flex flex-col"
        >
          {/* Elegant light technical grid & soft ambient glows */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#fff_70%,transparent_100%)] opacity-40 pointer-events-none" />
          <div className="absolute inset-0 bg-radial-at-c from-sky-100/30 via-slate-50 to-slate-50 pointer-events-none" />

          {/* Soft, beautiful brand light leaks */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-red-505/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />

          {/* Full Page Content Container */}
          <div className="relative flex-1 flex flex-col justify-between p-4 md:p-8 lg:p-10 max-w-5xl mx-auto w-full z-50">
            
            {/* Header / Logo section */}
            <div className="flex flex-col items-center text-center pt-2 md:pt-4 space-y-4">
              {/* Logo with pulsing live operational border outside */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="relative p-3 bg-white rounded-2xl border border-slate-200 shadow-md"
              >
                <img 
                  src={hydrominesLogo} 
                  alt="HYDROMINES" 
                  className="w-[90px] h-[90px] md:w-[110px] md:h-[110px] object-contain select-none"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-3 right-3 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse shadow-[0_0_8px_#10b981]" />
              </motion.div>

              {/* Aesthetic light beam bar separator */}
              <div className="relative w-full max-w-xl h-[1.5px]">
                <div className="absolute inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
                <motion.div 
                  initial={{ left: '-20%' }}
                  animate={{ left: '120%' }}
                  transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                  className="absolute top-0 h-[1.5px] w-1/3 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[1px]"
                />
              </div>

              {/* Header Titles with pristine typography */}
              <div className="space-y-3 px-4 max-w-3xl">
                <motion.h1 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-base md:text-xl font-black tracking-[0.25em] text-slate-900 uppercase font-sans"
                >
                  HYDROMINES
                </motion.h1>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-xs sm:text-sm md:text-base font-bold tracking-wide text-slate-700 font-sans border border-slate-250 bg-white/95 py-2.5 px-6 rounded-lg inline-block shadow-sm leading-relaxed"
                >
                  Bienvenue sur votre espace de gestion de stock. Un outil simple, pensé par et pour le terrain.
                </motion.h2>
              </div>

              {/* Status Badges Row */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-2 md:gap-3 text-[10px] md:text-xs font-mono font-bold tracking-widest uppercase"
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-200/80 text-sky-700 rounded-lg shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                  SÉCURITÉ ACTIVE
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200/80 text-rose-700 rounded-lg shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  SYNCHRONISATION CONTRÔLÉE
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 text-emerald-700 rounded-lg shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" style={{ animationDuration: '1.5s' }} />
                  VALIDATION CONTINUE
                </div>
              </motion.div>
            </div>

            {/* Central Content Area (Compact spacing for total vertical fitting) */}
            <div className="my-4 md:my-5 space-y-4 max-w-4xl mx-auto w-full">
              
              {/* Primary High-Contrast Statement */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7 }}
                className="text-center space-y-3 px-4"
              >
                <p className="text-base md:text-lg lg:text-xl font-extrabold text-slate-900 leading-tight font-sans">
                  « Bienvenue sur votre plateforme de gestion d’inventaire Hydromines »
                </p>
                <p className="text-slate-700 text-sm md:text-base lg:text-lg max-w-3xl mx-auto leading-relaxed font-medium">
                  Nous avons conçu une plateforme unique pour simplifier la vie de vos magasins. Plus de papier, plus de doutes : vous gardez un œil en temps réel sur tout votre matériel pour assurer la continuité de vos opérations en toute sérénité.
                </p>
              </motion.div>

              {/* Grid with Details boxes */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.7 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-4"
              >
                {/* Main Information list - 7 Cols */}
                <div className="md:col-span-7 bg-white border border-slate-200 p-5 md:p-6 rounded-xl space-y-4 shadow-sm">
                  <h3 className="text-sm md:text-base font-black text-sky-600 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
                    <Activity className="w-5 h-5 text-sky-500" />
                    Suivi Magasinier de Bout en Bout
                  </h3>
                  
                  <ul className="space-y-4 text-xs sm:text-sm md:text-[15px] text-slate-705 font-medium leading-relaxed">
                    <li className="flex items-start gap-2.5">
                      <span className="text-cyan-500 font-extrabold text-base md:text-lg select-none">•</span>
                      <span><strong>Flux de Stock Complets</strong> : Enregistrez vos entrées de marchandises, vos sorties vers les machines, vos transferts entre dépôts, vos retours et vos ravitaillements en quelques clics.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-500 font-extrabold text-base md:text-lg select-none">•</span>
                      <span><strong>Tout votre Matériel est Couvert</strong> : Une gestion unifiée pour votre parc d'engins, vos têtes de perforateurs, l'ensemble des consommables du quotidien et vos équipements de protection (EPI).</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-cyan-500 font-extrabold text-base md:text-lg select-none">•</span>
                      <span><strong>Analyses & Graphiques</strong> : Visualisez instantanément vos consommations et l'état de votre stock via des tableaux de bord clairs et interactifs pour anticiper vos besoins.</span>
                    </li>
                  </ul>
                </div>

                {/* Sub-Audits/Safety disclaimer - 5 Cols */}
                <div className="md:col-span-12 lg:col-span-5 bg-slate-50 border border-slate-200 p-5 md:p-6 rounded-xl flex flex-col justify-between space-y-4 shadow-inner">
                  <div className="space-y-3">
                    <h3 className="text-[11px] md:text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
                      Une Fiabilité Absolue grâce aux Catalogues
                    </h3>
                    <div className="space-y-3">
                      {/* Interactive glowing banner for premium look */}
                      <div className="relative inline-block overflow-hidden bg-slate-900 text-white font-extrabold text-[10px] md:text-xs tracking-wider px-3 py-1.5 rounded-md shadow-sm">
                        Fini la Saisie Manuelle !
                        <motion.span 
                          className="absolute inset-0 w-[60px] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                          initial={{ left: '-100%' }}
                          animate={{ left: '250%' }}
                          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                        />
                      </div>
                      <p className="text-xs md:text-sm text-slate-800 leading-relaxed font-semibold">
                        Nous avons intégré les catalogues officiels directement dans le système. Plus besoin de recopier de longues références complexes à la main au risque de vous tromper. Vous sélectionnez la pièce exacte et standardisée en un clic. Vos données restent propres, cohérentes et 100% fiables pour des inventaires parfaits.
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <p className="text-[11px] md:text-xs text-sky-600 font-medium leading-relaxed">
                      * Une plateforme moderne conçue avec l'humain au cœur du système pour éliminer les erreurs de stock.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer and Launch CTA */}
            <div className="space-y-4 pb-2">
              {/* Grand CTA Button */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="flex justify-center"
              >
                <button
                  id="hydromines-viewer-modal-btn-confirm"
                  onClick={handleClose}
                  className="w-full max-w-lg py-4 px-8 rounded-xl transition-all duration-300 font-extrabold text-xs md:text-sm uppercase tracking-widest flex items-center justify-center gap-2 group relative overflow-hidden bg-gradient-to-r from-blue-600 via-sky-600 to-emerald-600 hover:opacity-95 text-white cursor-pointer active:scale-[0.985] shadow-[0_10px_25px_rgba(2,132,199,0.15)] border border-sky-500/10"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                  <span>Ouvrir l'Espace de Gestion</span>
                  <ChevronRight className="w-5 h-5 text-white transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </motion.div>

              {/* Solid Horizontal line */}
              <div className="h-[1px] bg-slate-200 w-full" />

              {/* Corporate Sub-Footer */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-center font-mono space-y-1 select-none"
              >
                <div className="text-xs font-semibold text-slate-600">
                  HYDROMINES 2026 - Suivi magasinier V 1
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
