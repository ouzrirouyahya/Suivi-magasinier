import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, ChevronRight, Volume2, Info, AlertTriangle } from 'lucide-react';
import { useCommunication } from '../hooks/useCommunication';
import { useInventory } from '../context/InventoryContext';
import { MessagePriority } from '../types';

export default function BannerNotificationView() {
  const { currentUser } = useInventory();
  const { activeBanners, bannerViews, viewBanner } = useCommunication();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Filter out banners that the current user has already dismissed
  const nonDismissedBanners = activeBanners.filter(banner => {
    const hasBeenDismissed = bannerViews.some(view => view.bannerId === banner.id && view.dismissedAt);
    return !hasBeenDismissed;
  });

  const activeBanner = nonDismissedBanners[currentBannerIndex];

  // Track initial view when banner becomes active
  useEffect(() => {
    if (activeBanner && currentUser) {
      // Log simple impression/view
      viewBanner(activeBanner.id, false);
    }
  }, [activeBanner, currentUser, viewBanner]);

  if (!activeBanner || !currentUser) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    viewBanner(activeBanner.id, true); // Log dismissal
    
    // Switch to next banner if available
    if (currentBannerIndex < nonDismissedBanners.length - 1) {
      setCurrentBannerIndex(prev => prev + 1);
    } else {
      setCurrentBannerIndex(0);
    }
  };

  const getPriorityStyle = (p: MessagePriority) => {
    const config = {
      LOW: {
        bg: 'bg-slate-900',
        text: 'text-white',
        accent: 'text-slate-400',
        border: 'border-slate-800'
      },
      NORMAL: {
        bg: 'bg-sky-500',
        text: 'text-white',
        accent: 'text-sky-200',
        border: 'border-sky-600'
      },
      HIGH: {
        bg: 'bg-amber-500',
        text: 'text-white',
        accent: 'text-amber-100',
        border: 'border-amber-600'
      },
      URGENT: {
        bg: 'bg-rose-600',
        text: 'text-white',
        accent: 'text-rose-100',
        border: 'border-rose-700 animate-pulse'
      }
    };
    return config[p];
  };

  const style = getPriorityStyle(activeBanner.priority);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`w-full ${style.bg} ${style.text} border-b ${style.border} px-4 py-3 shadow-md relative z-40 transition-all duration-300`}
      >
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-1.5 rounded-lg bg-white/10 shrink-0 ${style.accent}`}>
              <Megaphone className="w-4 h-4" />
            </div>
            
            <div className="min-w-0">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-white/15 rounded mr-2">
                {activeBanner.priority}
              </span>
              <span className="font-black text-xs uppercase tracking-wider mr-1.5">
                {activeBanner.title}
              </span>
              <span className={`text-xs ${style.accent} font-medium tracking-wide truncate md:inline hidden`}>
                • {activeBanner.body}
              </span>
              <span className={`text-xs ${style.accent} font-medium tracking-wide md:hidden block mt-0.5`}>
                {activeBanner.body}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {nonDismissedBanners.length > 1 && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-1 rounded">
                {currentBannerIndex + 1}/{nonDismissedBanners.length} Annonces
              </span>
            )}

            {activeBanner.dismissible && (
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/80 hover:text-white"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
