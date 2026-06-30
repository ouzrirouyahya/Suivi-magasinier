import { useState, useEffect, useCallback, useRef } from 'react';
import { bannerService } from '../services/banner.service';
import { useAuthStore } from '../stores/auth.store';
import { BannerNotification } from '../types';

export function useBanners() {
  const { currentUser, currentSite } = useAuthStore();
  const [banners, setBanners] = useState<BannerNotification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const viewedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.id || (currentUser as any).uid;
    const unsub = bannerService.subscribeToBanners(
      currentSite,
      currentUser.role,
      (activeBanners) => {
        setBanners(activeBanners);
        // Enregistrer les vues pour les nouvelles bannières
        activeBanners.forEach((b) => {
          if (!viewedRef.current.has(b.id)) {
            viewedRef.current.add(b.id);
            bannerService.recordBannerView(
              b.id,
              userId,
              currentUser.name,
              currentSite,
              currentUser.role
            );
          }
        });
      }
    );
    return unsub;
  }, [currentUser, currentSite]);

  const dismiss = useCallback(async (bannerId: string) => {
    if (!currentUser) return;
    const userId = currentUser.id || (currentUser as any).uid;
    await bannerService.dismissBanner(
      bannerId,
      userId,
      currentUser.name,
      currentSite,
      currentUser.role
    );
    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
    setCurrentIndex(0);
  }, [currentUser, currentSite]);

  const next = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, banners.length - 1));
  }, [banners.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  return {
    banners,
    currentBanner: banners[currentIndex] || null,
    currentIndex,
    total: banners.length,
    dismiss,
    next,
    prev
  };
}
