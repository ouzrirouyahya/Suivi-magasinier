import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth } from './firebase';
import { Timestamp } from 'firebase/firestore';

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
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
 * Recursively converts Firestore Timestamp instances to ISO strings for UI compatibility
 */
export function serializeFirestoreData<T>(data: T): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Timestamp or duck-typed Timestamp objects as primitives
  if (typeof data === "object") {
    if (typeof (data as any).toDate === "function") {
      try {
        return (data as any).toDate().toISOString();
      } catch (e) {
        // Fall back to other checks
      }
    }
    if (typeof (data as any).seconds === "number" && typeof (data as any).nanoseconds === "number") {
      try {
        return new Date((data as any).seconds * 1000).toISOString();
      } catch (e) {
        // Fall back to other checks
      }
    }
  }

  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item));
  }

  if (typeof data === 'object') {
    // Preserve other complex objects
    if (data.constructor && data.constructor !== Object && data.constructor !== Array) {
      return data;
    }

    const result: any = {};
    Object.keys(data as any).forEach(key => {
      result[key] = serializeFirestoreData((data as any)[key]);
    });
    return result;
  }

  return data;
}

/**
 * Generates a cryptographically secure UUID
 */
export function generateSecureUUID(): string {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
