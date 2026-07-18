import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import hydrominesLogo from '../../assets/images/hydromines_logo.png';

interface PageLoadingProps {
  onComplete?: () => void;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    let currentProgress = 1;
    // Smooth loading over ~1.2 seconds (approx. 12ms * 100 steps = 1200ms)
    const timer = setInterval(() => {
      currentProgress += 1;
      if (currentProgress >= 100) {
        setProgress(100);
        clearInterval(timer);
        if (onComplete) {
          // Graceful offset so the user clearly sees 100% before transition
          setTimeout(onComplete, 200);
        }
      } else {
        setProgress(currentProgress);
      }
    }, 12);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[9999] select-none font-sans" id="hydromines-app-loader">
      <div className="flex flex-col items-center max-w-sm px-6 text-center">
        {/* Soft, beautiful entering transition for the Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mb-6"
        >
          {/* Elegant ambient light backing */}
          <div className="absolute inset-0 bg-sky-100 rounded-full blur-2xl opacity-30 mix-blend-multiply scale-75 animate-pulse" />
          
          <img
            src={hydrominesLogo}
            alt="Hydromines"
            referrerPolicy="no-referrer"
            className="w-28 h-28 md:w-32 md:h-32 object-contain relative z-10 select-none pointer-events-none"
          />
        </motion.div>

        {/* Digital Percentage Display */}
        <div className="text-center mb-3">
          <span className="text-4xl md:text-5xl font-mono font-black text-slate-900 tracking-tight">
            {progress}%
          </span>
        </div>

        {/* Corporate Identity Progress Track (Sky Blue -> Gold -> Red) */}
        <div className="w-56 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-gradient-to-r from-[#38bdf8] via-[#eab308] to-[#991b1b]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading Tagline */}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
          Chargement Hydromines
        </p>
      </div>
    </div>
  );
};

export default PageLoading;
