import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import hydrominesLogo from '../../assets/images/hydromines_logo.webp';

interface PageLoadingProps {
  isLoaded?: boolean;
  onComplete?: () => void;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ isLoaded = false, onComplete }) => {
  const [progress, setProgress] = useState(1);
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  const isLoadedRef = useRef(isLoaded);
  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  useEffect(() => {
    // Show a polite, reassuring waiting message if database/network load takes more than 2 seconds
    const messageTimer = setTimeout(() => {
      setShowSlowMessage(true);
    }, 2000);

    let current = 1;
    const timer = setInterval(() => {
      const isLoadedVal = isLoadedRef.current;
      
      if (isLoadedVal) {
        // If background data is loaded, finish instantly to 100%
        if (current < 100) {
          current = Math.min(100, current + Math.floor(Math.random() * 15) + 12);
          setProgress(current);
        }
      } else {
        // If not loaded yet, quickly progress up to 98% and crawl/hold
        if (current < 98) {
          current = Math.min(98, current + Math.floor(Math.random() * 6) + 4);
          setProgress(current);
        } else if (current < 99) {
          current = 99;
          setProgress(99);
        }
      }

      if (current >= 100) {
        clearInterval(timer);
        if (onComplete) {
          // Subtle delay for visual feedback of reaching 100%
          setTimeout(onComplete, 220);
        }
      }
    }, 30);

    return () => {
      clearTimeout(messageTimer);
      clearInterval(timer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[9999] select-none font-sans" id="hydromines-app-loader">
      <div className="flex flex-col items-center max-w-sm px-6 text-center">
        {/* Animated logo entry */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mb-6"
        >
          {/* Subtle elegant corporate halo backing */}
          <div className="absolute inset-0 bg-sky-100 rounded-full blur-2xl opacity-25 mix-blend-multiply scale-75 animate-pulse" />
          
          <img
            src={hydrominesLogo}
            alt="Hydromines Logo"
            referrerPolicy="no-referrer"
            className="w-28 h-28 md:w-32 md:h-32 object-contain relative z-10 select-none pointer-events-none"
          />
        </motion.div>

        {/* Dynamic counter percentage */}
        <div className="text-center mb-3">
          <span className="text-4xl md:text-5xl font-mono font-black text-slate-900 tracking-tight">
            {progress}%
          </span>
        </div>

        {/* High-fidelity color track */}
        <div className="w-56 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4 relative">
          <motion.div
            className="h-full bg-gradient-to-r from-[#38bdf8] via-[#eab308] to-[#991b1b]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Pure minimalist loading caption */}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
          Chargement Hydromines
        </p>

        {/* Polite status message for slower operations */}
        {showSlowMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-6 text-center max-w-xs"
          >
            <p className="text-xs text-slate-500 font-sans font-medium tracking-wide leading-relaxed animate-pulse">
              Veuillez patienter... L'Espace Magasinier Hydromines s'ouvrira dans quelques instants.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PageLoading;
