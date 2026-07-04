import { doc, setDoc, type Transaction, db } from '../lib/db';
import { auth } from '../lib/firebase';
import { generateSecureUUID, cleanObject } from '../lib/utils';

export const auditService = {
  async logAction(action: string, details: string, site: any, userRole: string, amount: number = 0): Promise<void> {
    const id = generateSecureUUID();
    const deviceInfo = typeof navigator !== 'undefined' ? `${navigator.userAgent} (${navigator.language || 'fr'})` : 'Unknown client environment';
    await setDoc(doc(db, 'auditLogs', id), cleanObject({
      id, 
      timestamp: new Date().toISOString(), 
      userEmail: auth.currentUser?.email || 'Système',
      site, 
      action, 
      details, 
      amount,
      userId: auth.currentUser?.uid || 'system_service_account',
      userRole,
      deviceInfo,
      sourcePlatform: 'HydroMines Web Application Core'
    }));
  },

  logActionTx(transaction: Transaction, action: string, details: string, site: any, userRole: string, amount: number = 0): void {
    const id = generateSecureUUID();
    const deviceInfo = typeof navigator !== 'undefined' ? `${navigator.userAgent} (${navigator.language || 'fr'})` : 'Unknown client environment';
    transaction.set(doc(db, 'auditLogs', id), cleanObject({
      id, 
      timestamp: new Date().toISOString(), 
      userEmail: auth.currentUser?.email || 'Système',
      site, 
      action, 
      details, 
      amount,
      userId: auth.currentUser?.uid || 'system_service_account',
      userRole,
      deviceInfo,
      sourcePlatform: 'HydroMines Web Application Core'
    }));
  }
};
