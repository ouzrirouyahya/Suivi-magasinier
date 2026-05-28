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
          className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 text-white overflow-y-auto flex flex-col"
        >
          {/* Immersive cinematic grid & ambient radial glow backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
          <div className="absolute inset-0 bg-radial-at-c from-sky-950/20 via-slate-950/80 to-slate-950 pointer-events-none" />

          {/* Glowing brand-colored light leaks */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />

          {/* Full Page Content Container */}
          <div className="relative flex-1 flex flex-col justify-between p-6 md:p-12 lg:p-16 max-w-5xl mx-auto w-full z-50">
            
            {/* Header / Logo section */}
            <div className="flex flex-col items-center text-center pt-4 md:pt-8 space-y-6">
              {/* Logo with pulsing live operational border */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="relative p-4 bg-slate-900/90 rounded-2xl border-2 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              >
                <img 
                  src={hydrominesLogo} 
                  alt="HYDROMINES" 
                  className="w-[130px] h-[130px] md:w-[150px] md:h-[150px] object-contain select-none"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-4 right-4 w-4 h-4 rounded-full bg-emerald-500 border-4 border-slate-900 animate-pulse shadow-[0_0_12px_#10b981]" />
              </motion.div>

              {/* Aesthetic light beam bar */}
              <div className="relative w-full max-w-2xl h-[2px]">
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />
                <motion.div 
                  initial={{ left: '-20%' }}
                  animate={{ left: '120%' }}
                  transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                  className="absolute top-0 h-[2px] w-1/3 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[1px]"
                />
              </div>

              {/* Header Titles */}
              <div className="space-y-3 px-4">
                <motion.h1 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-lg md:text-2xl font-black tracking-[0.2em] text-slate-100 uppercase font-sans"
                >
                  HYDROMINES
                </motion.h1>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-sm md:text-base font-bold tracking-[0.15em] text-slate-400 uppercase font-sans border border-slate-800/80 bg-slate-900/60 py-2 px-6 rounded-lg inline-block"
                >
                  Initialisation de l’Environnement Opérationnel
                </motion.h2>
              </div>

              {/* Large Status Badges Row */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-3 md:gap-4 text-xs font-mono font-bold tracking-widest uppercase"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-sky-500/30 text-sky-400 rounded-lg shadow-[0_4px_12px_rgba(56,189,248,0.05)]">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  SÉCURITÉ ACTIVE
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-red-500/30 text-rose-400 rounded-lg shadow-[0_4px_12px_rgba(239,68,68,0.05)]">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  SYNCHRONISATION CONTRÔLÉE
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-emerald-500/30 text-emerald-400 rounded-lg shadow-[0_4px_12px_rgba(16,185,129,0.05)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" style={{ animationDuration: '1.5s' }} />
                  VALIDATION CONTINUE
                </div>
              </motion.div>
            </div>

            {/* Central Content Area (Enlarged with great contrast) */}
            <div className="my-8 md:my-12 space-y-8 max-w-4xl mx-auto w-full">
              
              {/* Primary High-Contrast Statement */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7 }}
                className="text-center space-y-4 px-4"
              >
                <p className="text-lg md:text-2xl lg:text-3xl font-extrabold text-white leading-tight font-sans">
                  « Les systèmes centraux sont actuellement en phase de déploiement progressif et de validation avancée. »
                </p>
                <p className="text-slate-300 text-base md:text-lg lg:text-xl font-medium max-w-3xl mx-auto leading-relaxed">
                  La plateforme Hydromines fonctionne à <span className="text-cyan-400 font-extrabold underline decoration-cyan-400/40 underline-offset-4">50% de son architecture cible</span>, dans le cadre d’une intégration technique contrôlée destinée à garantir la stabilité, la cohérence industrielle des données et la fiabilité opérationnelle totale avant l'ouverture complète du réseau.
                </p>
              </motion.div>

              {/* Grid with Details boxes */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.7 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6"
              >
                {/* Main Information list - 7 Cols */}
                <div className="md:col-span-7 bg-slate-900/70 border-2 border-slate-800 p-6 md:p-8 rounded-2xl space-y-4 shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:border-slate-700/80 transition-all duration-300">
                  <h3 className="text-sm md:text-base font-black text-sky-400 flex items-center gap-3 uppercase tracking-widest">
                    <Activity className="w-5 h-5 text-sky-400" />
                    Processus de Qualification Technique :
                  </h3>
                  
                  <ul className="space-y-3.5 text-sm md:text-base text-slate-300 font-medium">
                    <li className="flex items-start gap-3">
                      <span className="text-cyan-400 font-extrabold text-lg select-none">•</span>
                      <span>L'intégration sécurisée de l'ensemble des modules stratégiques.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-rose-450 font-extrabold text-lg select-none">•</span>
                      <span>La synchronisation intelligente et isolée des données d'inventaires.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-cyan-400 font-extrabold text-lg select-none">•</span>
                      <span>L'optimisation des flux de performance cloud en conditions extrêmes.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-rose-450 font-extrabold text-lg select-none">•</span>
                      <span>Le déploiement minutieux des routines de traçabilité d'audits.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-cyan-400 font-extrabold text-lg select-none">•</span>
                      <span>Les validations exhaustives de sécurité, d'accès et de conformité système.</span>
                    </li>
                  </ul>
                </div>

                {/* Sub-Audits/Safety disclaimer - 5 Cols */}
                <div className="md:col-span-5 bg-slate-900/40 border border-slate-800/80 p-6 md:p-8 rounded-2xl flex flex-col justify-between space-y-4 shadow-[inset_0_1px_10px_rgba(0,0,0,0.4)]">
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
                      Notice d'Accès Provisoire
                    </h3>
                    <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-sans">
                      L'environnement est configuré en mode <strong className="text-slate-200">Démonstrateur Interactif</strong>. Les opérations de modification d'écriture sur les documents critiques sont encadrées par des systèmes de simulation sécurisés.
                    </p>
                  </div>
                  <div className="border-t border-slate-800/80 pt-4">
                    <p className="text-xs text-rose-400 italic font-medium leading-relaxed">
                      * La mise en exploitation nominale globale sera finalisée après validation des derniers jalons techniques et réglementaires de l'infrastructure SRE.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Progress Bar Container */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="space-y-3 bg-slate-900/30 p-6 rounded-2xl border border-slate-900"
              >
                <div className="flex justify-between items-center text-xs font-mono text-slate-400 tracking-widest uppercase">
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4.5 h-4.5 text-sky-450 animate-spin" style={{ animationDuration: '4s' }} />
                    INITIALISATION SYSTÈMES ET SERVICES
                  </span>
                  <span className="font-bold text-slate-200 text-sm">{Math.round(initProgress)}%</span>
                </div>
                <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-red-500 rounded-full"
                    style={{ width: `${initProgress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            </div>

            {/* Footer and Launch CTA */}
            <div className="space-y-8 pb-4">
              {/* Grand CTA Button */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="flex justify-center"
              >
                <button
                  id="hydromines-viewer-modal-btn-confirm"
                  onClick={handleClose}
                  disabled={initProgress < 95}
                  className={`w-full max-w-xl py-4.5 px-8 rounded-xl transition-all duration-300 font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-3 group relative overflow-hidden shadow-2xl ${
                    initProgress < 95 
                      ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-650 via-sky-600 to-emerald-650 hover:opacity-95 text-white cursor-pointer active:scale-[0.985] shadow-[0_15px_35px_rgba(2,132,199,0.25)] border border-sky-400/10'
                  }`}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                  <span>Accéder à la Plateforme Pilote</span>
                  <ChevronRight className="w-5 h-5 text-white transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </motion.div>

              {/* Solid Horizontal line */}
              <div className="h-[1px] bg-slate-900 w-full" />

              {/* Corporate Sub-Footer */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-center font-mono space-y-2 select-none"
              >
                <div className="text-xs font-black text-slate-300 tracking-[0.2em] uppercase">
                  HYDROMINES ENGINEERING DIVISION
                </div>
                <div className="text-[10px] text-slate-505 uppercase tracking-[0.15em] leading-normal max-w-2xl mx-auto">
                  Operational Systems • Cloud Infrastructure SRE • Industrial Intelligence Services
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
