import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  setDoc,
  onSnapshot,
  db
} from '../lib/db';
import { BannerNotification, BannerView, SiteCode, UserRole } from '../types';

export const bannerService = {
  // 1. Subscribe to banners with client-side targeting filtration
  subscribeToBanners(
    userSite: SiteCode,
    userRole: UserRole,
    callback: (banners: BannerNotification[]) => void
  ): () => void {
    const bannersCol = collection(db, 'bannerNotifications');
    return onSnapshot(bannersCol, (snapshot) => {
      const allBanners: BannerNotification[] = [];
      snapshot.forEach((doc) => {
        allBanners.push({ id: doc.id, ...doc.data() } as BannerNotification);
      });

      const now = new Date();
      const filtered = allBanners.filter((banner) => {
        // Must be active
        if (banner.status !== 'ACTIVE') return false;

        // Check date range
        const start = banner.startDate ? new Date(banner.startDate) : new Date(0);
        const end = banner.endDate ? new Date(banner.endDate) : new Date(9999999999999);
        if (now < start || now > end) return false;

        // Check site matching
        const matchesSite =
          !banner.targetSites ||
          banner.targetSites.length === 0 ||
          banner.targetSites.includes(userSite) ||
          banner.targetSites.includes('ALL');

        // Check role matching
        const matchesRole =
          !banner.targetRoles ||
          banner.targetRoles.length === 0 ||
          banner.targetRoles.includes(userRole) ||
          banner.targetRoles.includes('ALL');

        return matchesSite && matchesRole;
      });

      callback(filtered);
    });
  },

  // 2. Create a new banner notification
  async createBanner(banner: Omit<BannerNotification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const nowStr = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'bannerNotifications'), {
      ...banner,
      createdAt: nowStr,
      updatedAt: nowStr
    });
    return docRef.id;
  },

  // 3. Update an existing banner notification
  async updateBanner(id: string, updates: Partial<BannerNotification>): Promise<void> {
    const bannerRef = doc(db, 'bannerNotifications', id);
    await updateDoc(bannerRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  // 4. Dismiss a banner notification
  async dismissBanner(
    bannerId: string,
    userId: string,
    userName: string,
    userSite: SiteCode,
    userRole: UserRole
  ): Promise<void> {
    const nowStr = new Date().toISOString();
    const viewId = `${bannerId}_${userId}`;
    const viewRef = doc(db, 'bannerViews', viewId);
    const viewSnap = await getDoc(viewRef);

    if (viewSnap.exists()) {
      await updateDoc(viewRef, {
        dismissedAt: nowStr,
        updatedAt: nowStr
      });
    } else {
      const newView: BannerView = {
        id: viewId,
        bannerId,
        userId,
        userName,
        userSite,
        userRole,
        viewedAt: nowStr,
        dismissedAt: nowStr
      };
      await setDoc(viewRef, newView);
    }
  },

  // 5. Record that a banner has been viewed
  async recordBannerView(
    bannerId: string,
    userId: string,
    userName: string,
    userSite: SiteCode,
    userRole: UserRole
  ): Promise<void> {
    const viewId = `${bannerId}_${userId}`;
    const viewRef = doc(db, 'bannerViews', viewId);
    const viewSnap = await getDoc(viewRef);

    if (!viewSnap.exists()) {
      const nowStr = new Date().toISOString();
      const newView: BannerView = {
        id: viewId,
        bannerId,
        userId,
        userName,
        userSite,
        userRole,
        viewedAt: nowStr
      };
      await setDoc(viewRef, newView);
    }
  }
};
