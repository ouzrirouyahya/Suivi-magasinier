
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { SiteCode } from '../types';

export const reportService = {
  saveReport: async (site: SiteCode, type: string, data: any) => {
    return addDoc(collection(db, 'reports'), {
      site,
      type,
      generatedAt: new Date().toISOString(),
      data,
      timestamp: serverTimestamp()
    });
  },

  getLatestReports: async (site: SiteCode, limitCount: number = 20) => {
    const q = query(
      collection(db, 'reports'),
      where('site', '==', site),
      orderBy('generatedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
