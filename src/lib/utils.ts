import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth } from './firebase';
import { Timestamp } from './db';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null) {
  const safe = Number(amount);
  const validAmount = isNaN(safe) ? 0 : safe;
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(validAmount);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function generateId() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: isDev 
        ? auth.currentUser?.uid 
        : auth.currentUser?.uid 
          ? auth.currentUser.uid.slice(0, 8) + '***' 
          : null,
      email: isDev 
        ? auth.currentUser?.email 
        : auth.currentUser?.email 
          ? auth.currentUser.email.replace(/(.{2}).*@/, '$1***@') 
          : null,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      ...(isDev && {
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
        })) || []
      })
    },
    operationType,
    path
  }

  if (operationType === OperationType.LIST) {
    logger.warn('[Firestore Sync Warning] Non-blocking list query failed:', errInfo);
    return;
  }

  throw new Error(JSON.stringify(errInfo));
}

/**
 * Removes undefined properties from an object recursively to ensure Firestore compatibility.
 * Safely preserves Firestore Timestamps, Dates, and special complex objects (like FieldValues).
 */
export function cleanObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Timestamp) {
    return obj as unknown as T;
  }

  if (obj instanceof Date) {
    return obj as unknown as T;
  }

  // Preserve Firestore FieldValue and other special/internal objects
  if (obj.constructor && obj.constructor !== Object && obj.constructor !== Array) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    Object.keys(obj as any).forEach(key => {
      const value = (obj as any)[key];
      if (value !== undefined) {
        result[key] = cleanObject(value);
      }
    });
    return result;
  }

  return obj;
}

/**
 * Recursively converts Firestore Timestamp instances and native Dates to ISO strings for UI compatibility
 */
export function serializeFirestoreData(data: any): any {
  if (data === null || data === undefined) return data;

  // Firestore Timestamp (object with seconds + nanoseconds or toDate function)
  if (typeof data === 'object') {
    if (typeof data.toDate === 'function') {
      try {
        return data.toDate().toISOString();
      } catch (e) {
        // Fallback
      }
    }
    if ('seconds' in data && 'nanoseconds' in data && typeof data.seconds === 'number') {
      return new Date(data.seconds * 1000).toISOString();
    }
  }

  // Date JavaScript native
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Arrays : recursif
  if (Array.isArray(data)) {
    return data.map(serializeFirestoreData);
  }

  // Primitives : retourner directement
  if (typeof data !== 'object') return data;

  // Preserve complex custom objects
  if (data.constructor && data.constructor !== Object && data.constructor !== Array) {
    return data;
  }

  // Objets : récursif sur toutes les clés
  const result: any = {};
  for (const key of Object.keys(data)) {
    result[key] = serializeFirestoreData(data[key]);
  }
  return result;
}

/**
 * Standardisation : generateId() utilise déjà crypto.randomUUID() de manière sécurisée.
 * generateSecureUUID() est conservé comme alias pour la compatibilité existante, mais est déprécié.
 * Veuillez utiliser generateId() pour toute nouvelle création d'identifiants.
 */
export function generateSecureUUID(): string {
  return generateId();
}

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  warn: (...args: any[]) => isDev && console.warn(...args),
  error: (...args: any[]) => console.error(...args), // errors toujours visibles
  info: (...args: any[]) => isDev && console.info(...args),
};

