import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SiteCode, UserAccount, UserRole } from '../types';

export const authService = {
  async approveUser(userId: string): Promise<void> {
    await updateDoc(doc(db, 'accounts', userId), {
      status: 'APPROVED',
      active: true,
      updatedAt: new Date().toISOString()
    });
  },

  async rejectUser(userId: string): Promise<void> {
    await updateDoc(doc(db, 'accounts', userId), {
      status: 'REJECTED',
      active: false,
      updatedAt: new Date().toISOString()
    });
  },

  async toggleUser(userId: string, currentActive: boolean): Promise<void> {
    await updateDoc(doc(db, 'accounts', userId), {
      active: !currentActive,
      updatedAt: new Date().toISOString()
    });
  },

  async setUserRole(userId: string, role: UserRole): Promise<void> {
    await updateDoc(doc(db, 'accounts', userId), {
      role,
      updatedAt: new Date().toISOString()
    });
  },

  async setUserAssignedSite(userId: string, site: SiteCode | ''): Promise<void> {
    await updateDoc(doc(db, 'accounts', userId), {
      assignedSite: site || null,
      updatedAt: new Date().toISOString()
    });
  }
};
