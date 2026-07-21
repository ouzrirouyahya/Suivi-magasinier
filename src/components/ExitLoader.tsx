import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { useInventory } from '../context/InventoryContext';
import hydrominesLogo from '../assets/images/hydromines_logo.webp';

interface ExitLoaderProps {
  onComplete: () => void;
}

export const ExitLoader: React.FC<ExitLoaderProps> = ({ onComplete }) => {
  const { currentUser } = useInventory();
  const [statusText, setStatusText] = useState('Chiffrement des journaux d\'activité...');

  useEffect(() => {
    // 2-second sequence
    const t1 = setTimeout(() => {
      setStatusText('Déconnexion de la base de données sécurisée...');
    }, 600);

    const t2 = setTimeout(() => {
      setStatusText('Session close. Libération de l\'environnement...');
    }, 1300);

    const t3 = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const rawName = auth.currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || '';
  const formattedName = rawName
    ? rawName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    : "Collaborateur";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ 
        opacity: 0,
        scale: 1.02,
        filter: 'blur(10px)',
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
      }}
      className="fixed inset-0 z-[99999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden font-sans"
    >
      <style>{`
        .water-wave-exit-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, #032d4a 0%, #020617 80%);
          overflow: hidden;
        }

        .ambient-caustic-exit {
          position: absolute;
          width: 140%;
          height: 140%;
          top: -20%;
          left: -20%;
          background-image: 
            radial-gradient(circle at 70% 30%, rgba(56, 189, 248, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 25% 70%, rgba(14, 165, 233, 0.05) 0%, transparent 50%);
          filter: blur(40px);
          animation: caustic-swirl-exit 8s ease-in-out infinite alternate;
        }

        @keyframes caustic-swirl-exit {
          0% { transform: rotate(0deg) scale(1); }
          100% { transform: rotate(-5deg) scale(1.05); }
        }

        .exit-glow-line {
          width: 220px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #38bdf8, transparent);
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.8);
          animation: pulse-glow-line 1.5s ease-in-out infinite alternate;
        }

        @keyframes pulse-glow-line {
          0% { opacity: 0.4; width: 180px; }
          100% { opacity: 1; width: 240px; }
        }
      `}</style>

      {/* Background layer */}
      <div className="water-wave-exit-bg">
        <div className="ambient-caustic-exit" />
      </div>

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center select-none">
        
        {/* Logo breathing out */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <div className="relative p-5 bg-slate-900/50 backdrop-blur-md rounded-full border border-sky-500/10 shadow-xl flex items-center justify-center">
            <img 
              src={hydrominesLogo} 
              alt="Hydromines Logo" 
              className="w-16 h-16 object-contain opacity-80"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        {/* Closing salutation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-1 mb-6"
        >
          <h3 className="text-lg font-black text-slate-300 tracking-wide uppercase font-sans">
            À bientôt, Monsieur
          </h3>
          <p className="text-sky-400/90 font-mono text-[11px] uppercase tracking-widest font-black">
            {formattedName}
          </p>
        </motion.div>

        {/* Minimal pulse line */}
        <div className="exit-glow-line mb-6" />

        {/* Exit loader status text */}
        <div className="h-6 flex items-center justify-center">
          <motion.p
            key={statusText}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.25 }}
            className="text-[9px] text-slate-500 font-mono tracking-widest uppercase font-bold"
          >
            {statusText}
          </motion.p>
        </div>
      </div>

      {/* Corner HUD lines */}
      <div className="absolute top-6 left-6 w-6 h-6 border-t border-l border-sky-500/10 pointer-events-none" />
      <div className="absolute top-6 right-6 w-6 h-6 border-t border-r border-sky-500/10 pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-6 h-6 border-b border-l border-sky-500/10 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-6 h-6 border-b border-r border-sky-500/10 pointer-events-none" />
    </motion.div>
  );
};
