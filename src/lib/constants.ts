// src/lib/constants.ts

export const SITE_CODES = [
  'SMI',
  'OUMEJRANE', 
  'KOUDIA',
  'BOU-AZZER',
  'OUANSIMI'
] as const;

export const ALL_SITES_OPTION = 'ALL' as const;

export const ALL_SITES = [...SITE_CODES, ALL_SITES_OPTION] as const;

export type SiteCode = typeof ALL_SITES[number];

export const SITE_LABELS: Record<SiteCode, string> = {
  'SMI': 'SMI — Imiter (Principal)',
  'OUMEJRANE': 'Oumejrane',
  'KOUDIA': 'Koudia',
  'BOU-AZZER': 'Bou-Azzer',
  'OUANSIMI': 'Ouansimi',
  'ALL': 'Tous les chantiers',
};
