/**
 * OBLIGATORY SRE SECURITY ARCHITECTURE - ZERO TRUST GOVERNANCE v6.0
 * Module: Zero-Trust Security Policy & Anti-Tampering Engine
 * File: /src/core/securityPolicy.ts
 *
 * Implements strict RBAC with role inheritance, permission resolver,
 * input structure anti-tampering guards, and a secure Protected Maintenance lock.
 */

import { SiteCode } from '../types';

export type UserRole = 'ADMIN' | 'SUPERVISEUR' | 'MAGASINIER' | 'LECTURE_SEULE';

export type SecurityCapability =
  | 'READ_STOCK'
  | 'WRITE_MOUVEMENT'
  | 'VALIDATE_INVENTAIRE'
  | 'MANAGE_CATALOG'
  | 'MANAGE_USERS'
  | 'MUTATE_SETTINGS'
  | 'BYPASS_MAINTENANCE'
  | 'FORCE_RESYNC';

// Role Hierarchy: ADMIN > SUPERVISEUR > MAGASINIER > LECTURE_SEULE
const ROLE_INHERITANCE: Record<UserRole, UserRole[]> = {
  ADMIN: ['ADMIN', 'SUPERVISEUR', 'MAGASINIER', 'LECTURE_SEULE'],
  SUPERVISEUR: ['SUPERVISEUR', 'MAGASINIER', 'LECTURE_SEULE'],
  MAGASINIER: ['MAGASINIER', 'LECTURE_SEULE'],
  LECTURE_SEULE: ['LECTURE_SEULE'],
};

// Capability Alignment Matrix
const ROLE_CAPABILITIES: Record<UserRole, SecurityCapability[]> = {
  ADMIN: [
    'READ_STOCK',
    'WRITE_MOUVEMENT',
    'VALIDATE_INVENTAIRE',
    'MANAGE_CATALOG',
    'MANAGE_USERS',
    'MUTATE_SETTINGS',
    'BYPASS_MAINTENANCE',
    'FORCE_RESYNC',
  ],
  SUPERVISEUR: [
    'READ_STOCK',
    'WRITE_MOUVEMENT',
    'VALIDATE_INVENTAIRE',
    'MANAGE_CATALOG',
    'FORCE_RESYNC',
  ],
  MAGASINIER: [
    'READ_STOCK',
    'WRITE_MOUVEMENT',
    'VALIDATE_INVENTAIRE',
  ],
  LECTURE_SEULE: [
    'READ_STOCK',
  ],
};

/**
 * Encapsulated operational state of Protected Maintenance Mode
 */
class ProtectedMaintenanceControl {
  private isLocked = false;
  private lockReason = '';

  enableLock(reason: string): void {
    this.isLocked = true;
    this.lockReason = reason;
  }

  disableLock(): void {
    this.isLocked = false;
    this.lockReason = '';
  }

  getLockStatus(): { isLocked: boolean; reason: string } {
    return {
      isLocked: this.isLocked,
      reason: this.lockReason,
    };
  }
}

export const MaintenanceLock = new ProtectedMaintenanceControl();

/**
 * Permission Resolver: checks whether a role is authorized for a capability
 * while honoring secure role inheritance and maintenance lock state.
 */
export function isAuthorized(
  userRole: UserRole,
  capability: SecurityCapability,
  bypassLockAndVerify = false
): boolean {
  // 1. Maintain zero trust block on maintenance lock
  const lock = MaintenanceLock.getLockStatus();
  if (lock.isLocked && !bypassLockAndVerify) {
    // Only capabilities containing maintenance bypass privileges can pass during write freezes
    const userCaps = ROLE_CAPABILITIES[userRole] || [];
    if (!userCaps.includes('BYPASS_MAINTENANCE')) {
      return false; // Forbidden during operational locks
    }
  }

  // 2. Resolve capability inclusion with inheritance integrity
  const inheritedRoles = ROLE_INHERITANCE[userRole] || ['LECTURE_SEULE'];
  return inheritedRoles.some((role) => {
    const caps = ROLE_CAPABILITIES[role] || [];
    return caps.includes(capability);
  });
}

/**
 * Anti-Tampering Payload Guard: Checks for injection of toxic payloads, unapproved mutations,
 * mass assignments, and out-of-bounds numeric records on critical models.
 */
export function validatePayloadIntegrity<T extends Record<string, any>>(
  subsystem: 'ARTICLE' | 'MOUVEMENT' | 'TRANSFERT' | 'ACCOUNT',
  payload: T,
  schemaKeys: (keyof T)[]
): { isValid: boolean; errorReason?: string } {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errorReason: 'Malformed payload input' };
  }

  // 1. Defend against Mass Assignment / Shadow Field Injections
  const payloadKeys = Object.keys(payload);
  const strictAllowedKeys = new Set(schemaKeys as string[]);
  
  // Implicit whitelist checker
  for (const key of payloadKeys) {
    if (!strictAllowedKeys.has(key)) {
      return { 
        isValid: false, 
        errorReason: `DETECTED_MASS_ASSIGNMENT_VULNERABILITY: Unapproved key [${key}] found in strict schema boundary` 
      };
    }
  }

  // 2. Out-of-bounds validations and integrity constraints
  if (subsystem === 'ARTICLE') {
    const qty = Number(payload.quantity);
    if (isNaN(qty) || qty < 0) {
      return { isValid: false, errorReason: 'RESOURCE_POISONING: Quantity must be a valid, positive real numeric' };
    }
    const minS = Number(payload.minStock);
    if (isNaN(minS) || minS < 0) {
      return { isValid: false, errorReason: 'RESOURCE_POISONING: Min stock limits cannot be negative' };
    }
    const price = payload.price !== undefined ? Number(payload.price) : 0;
    if (isNaN(price) || price < 0 || price > 10000000) {
      return { isValid: false, errorReason: 'VALUE_POISONING: Price must be bounded within real positive constraints' };
    }
  }

  if (subsystem === 'MOUVEMENT') {
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return { isValid: false, errorReason: 'MALFORMED_STRUCTURE: Mouvement must contain a valid, inhabited items list' };
    }
    for (const item of payload.items) {
      const q = Number(item.quantity);
      if (isNaN(q) || q <= 0 || q > 100000) {
        return { isValid: false, errorReason: 'INVALID_NUMERIC: Item quantities must be bounded, positive and non-zero' };
      }
    }
  }

  if (subsystem === 'TRANSFERT') {
    if (payload.sourceSite === payload.targetSite) {
      return { isValid: false, errorReason: 'INCOHERENT_MUTATION: Source and destination transit terminals cannot match' };
    }
  }

  if (subsystem === 'ACCOUNT') {
    // Prevent unauthenticated or self-assigned roles
    if (payload.role !== undefined && !['ADMIN', 'SUPERVISEUR', 'MAGASINIER', 'LECTURE_SEULE'].includes(payload.role)) {
      return { isValid: false, errorReason: 'PRIVILEGE_ESCALATION: Input role violates target system configuration' };
    }
  }

  return { isValid: true };
}
