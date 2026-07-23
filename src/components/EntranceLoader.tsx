import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { useInventory } from '../context/InventoryContext';
import hydrominesLogo from '../assets/images/hydromines_logo.webp';

interface EntranceLoaderProps {
  onComplete: () => void;
}

export const EntranceLoader: React.FC<EntranceLoaderProps> = ({ onComplete }) => {
  const { currentUser } = useInventory();
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Établissement de la liaison sécurisée...');
  const [greetingVisible, setGreetingVisible] = useState(false);

  useEffect(() => {
    // Show greeting slightly after the intro loads
    const greetTimer = setTimeout(() => {
      setGreetingVisible(true);
    }, 400);

    // Dynamic progress flow reaching 100% in ~2.8 seconds
    const duration = 2700;
    const intervalTime = 30;
    const totalSteps = duration / intervalTime;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      // Custom easing curve to make the progress feel organic (slowing down towards 100%)
      const ratio = currentStep / totalSteps;
      const easedRatio = 1 - Math.pow(1 - ratio, 3); // Cubic ease out
      const currentProgress = Math.min(Math.round(easedRatio * 100), 100);
      
      setProgress(currentProgress);

      if (currentProgress < 20) {
        setStatusText('Chiffrement du canal de données...');
      } else if (currentProgress < 45) {
        setStatusText('Mise en cache locale du stock actif (IndexedDB)...');
      } else if (currentProgress < 70) {
        setStatusText('Indexation du catalogue Hydromines...');
      } else if (currentProgress < 90) {
        setStatusText('Téléchargement de la télémétrie des forages...');
      } else {
        setStatusText('Cockpit opérationnel. Accès autorisé.');
      }

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 350); // Small pause at 100% for high-end feel
      }
    }, intervalTime);

    return () => {
      clearTimeout(greetTimer);
      clearInterval(interval);
    };
  }, [onComplete]);

  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    let greeting = "Bonjour";
    if (hour >= 12 && hour < 18) {
      greeting = "Bon après-midi";
    } else if (hour >= 18 || hour < 5) {
      greeting = "Bonsoir";
    }

    const rawName = auth.currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || '';
    
    // Format name with capital first letters
    const formattedName = rawName
      ? rawName
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
      : "Collaborateur";

    return `${greeting} Monsieur, ${formattedName}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 1.05,
        filter: 'blur(8px)',
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
      }}
      className="fixed inset-0 z-[99999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden font-sans"
    >
      {/* Dynamic styles for wave simulation and liquid animation */}
      <style>{`
        .water-wave-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, #0c4a6e 0%, #020617 80%);
          overflow: hidden;
        }

        /* Ambient caustics effect (sun rays in water) */
        .ambient-caustic {
          position: absolute;
          width: 140%;
          height: 140%;
          top: -20%;
          left: -20%;
          background-image: 
            radial-gradient(circle at 30% 20%, rgba(56, 189, 248, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 75% 80%, rgba(14, 165, 233, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(3, 105, 161, 0.06) 0%, transparent 60%);
          filter: blur(40px);
          animation: caustic-swirl 12s ease-in-out infinite alternate;
        }

        @keyframes caustic-swirl {
          0% { transform: rotate(0deg) scale(1); }
          100% { transform: rotate(10deg) scale(1.1); }
        }

        /* Twinkling ambient stars */
        .twinkle-star {
          position: absolute;
          width: 2px;
          height: 2px;
          background-color: #38bdf8;
          border-radius: 50%;
          opacity: 0;
          animation: star-fade 4s ease-in-out infinite;
        }

        @keyframes star-fade {
          0%, 100% { opacity: 0; transform: scale(0.6); }
          50% { opacity: 0.85; transform: scale(1.3); }
        }

        /* Premium liquid progress wave bar container */
        .liquid-container {
          position: relative;
          width: 320px;
          height: 38px;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(56, 189, 248, 0.35);
          box-shadow: 
            0 0 15px rgba(2, 132, 199, 0.1),
            inset 0 0 10px rgba(0, 0, 0, 0.6);
          border-radius: 9999px;
          overflow: hidden;
          padding: 3px;
        }

        /* Animated internal waves inside the loading bar */
        .liquid-fill {
          position: relative;
          height: 100%;
          background: linear-gradient(to right, #0284c7, #38bdf8, #bae6fd);
          border-radius: 9999px;
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.7);
          transition: width 0.1s linear;
          overflow: hidden;
        }

        .liquid-wave {
          position: absolute;
          top: -120%;
          left: 50%;
          width: 200%;
          height: 200%;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 38%;
          transform: translate(-50%, 0) rotate(0deg);
          animation: wave-spin 5s linear infinite;
          pointer-events: none;
        }

        .liquid-wave-secondary {
          position: absolute;
          top: -125%;
          left: 48%;
          width: 210%;
          height: 210%;
          background: rgba(56, 189, 248, 0.18);
          border-radius: 42%;
          transform: translate(-50%, 0) rotate(0deg);
          animation: wave-spin-reverse 4s linear infinite;
          pointer-events: none;
        }

        @keyframes wave-spin {
          from { transform: translate(-50%, 0) rotate(0deg); }
          to { transform: translate(-50%, 0) rotate(360deg); }
        }

        @keyframes wave-spin-reverse {
          from { transform: translate(-50%, 0) rotate(360deg); }
          to { transform: translate(-50%, 0) rotate(0deg); }
        }

        /* Subtle sound wave/breathe effect for logo */
        .logo-breathe {
          animation: logo-glow-breathe 2.5s ease-in-out infinite alternate;
        }

        @keyframes logo-glow-breathe {
          0% { filter: drop-shadow(0 0 5px rgba(56, 189, 248, 0.2)) scale(0.98); }
          100% { filter: drop-shadow(0 0 25px rgba(14, 165, 233, 0.65)) scale(1.02); }
        }
      `}</style>

      {/* Background layer */}
      <div className="water-wave-bg">
        <div className="ambient-caustic" />
        
        {/* Particle Stars */}
        <div className="twinkle-star" style={{ top: '15%', left: '20%', animationDelay: '0.2s' }} />
        <div className="twinkle-star" style={{ top: '25%', left: '75%', animationDelay: '1.5s' }} />
        <div className="twinkle-star" style={{ top: '40%', left: '10%', animationDelay: '0.8s' }} />
        <div className="twinkle-star" style={{ top: '65%', left: '85%', animationDelay: '2.2s' }} />
        <div className="twinkle-star" style={{ top: '80%', left: '30%', animationDelay: '3.1s' }} />
        <div className="twinkle-star" style={{ top: '50%', left: '60%', animationDelay: '1.1s' }} />
      </div>

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center select-none">
        
        {/* HYDROMINES LOGO */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="relative p-7 bg-slate-900/40 backdrop-blur-md rounded-full border border-sky-500/20 shadow-2xl logo-breathe flex items-center justify-center">
            <img 
              src={hydrominesLogo} 
              alt="Hydromines Logo" 
              className="w-24 h-24 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        {/* WELCOME GREETING WITH USER NAME */}
        <AnimatePresence>
          {greetingVisible && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-1.5 mb-8"
            >
              <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase font-sans drop-shadow-md">
                {getGreetingMessage()}
              </h2>
              <p className="text-sky-400 font-mono text-[10px] uppercase tracking-widest font-black opacity-90">
                Initialisation de votre session sécurisée
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PREMIUM LIQUID PROGRESS CONTAINER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex flex-col items-center w-full"
        >
          <div className="liquid-container">
            <div className="liquid-fill" style={{ width: `${progress}%` }}>
              <div className="liquid-wave" />
              <div className="liquid-wave-secondary" />
              
              {/* Highlight flash in front of filling bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[pulse_1.5s_infinite]" />
            </div>

            {/* Float percentage indicator */}
            <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white font-mono drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)]">
              {progress}%
            </div>
          </div>

          {/* Downloading / Loading status text */}
          <div className="mt-4 h-6 flex items-center justify-center">
            <motion.p
              key={statusText}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-[10px] md:text-xs text-slate-400 font-mono tracking-widest uppercase font-bold"
            >
              {statusText}
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Decorative premium corner accents simulating a high-tech console HUD */}
      <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-sky-500/20 pointer-events-none" />
      <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-sky-500/20 pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-sky-500/20 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-sky-500/20 pointer-events-none" />
    </motion.div>
  );
};
