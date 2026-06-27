/**
 * -------------------------------------------------------------------------
 * CATALOG DATA HUB (MASTER CATALOG)
 * -------------------------------------------------------------------------
 * This file serves as the centralized hub for all equipment sub-catalogs.
 * It combines the 5 individual, verified, and deduplicated sub-catalogs:
 * 
 * 1. ST2G (Cummins QSB4.5) - 284 items
 * 2. ST2D (Deutz F6L-912W) - 284 items
 * 3. ST7 (Cummins QSB6.7) - 315 items
 * 4. T23 (Montabert T23) - 155 items
 * 5. T28 (Montabert T28) - 155 items
 * 
 * Total count: 1193 items.
 * 
 * This refactoring reduces the file size from ~425KB to ~2KB and prevents
 * data duplication across the codebase.
 * -------------------------------------------------------------------------
 */

import { CatalogItem } from './types';
import { ST2G_CATALOG } from './catalogDataST2G';
import { ST2D_CATALOG } from './catalogDataST2D';
import { ST7_CATALOG } from './catalogDataST7';
import { T23_CATALOG } from './catalogDataT23';
import { T28_CATALOG } from './catalogDataT28';

// Master catalog version
export const CATALOG_VERSION = '15.2';

// Master catalog combining all verified sub-catalogs — NO DUPLICATES
export const MASTER_CATALOG: CatalogItem[] = [
  ...ST2G_CATALOG,
  ...ST2D_CATALOG,
  ...ST7_CATALOG,
  ...T23_CATALOG,
  ...T28_CATALOG,
];

// Helper: total count
export const TOTAL_CATALOG_ITEMS = MASTER_CATALOG.length;

// Helper: get catalog by equipment family
export const getCatalogByFamily = (family: string): CatalogItem[] => {
  return MASTER_CATALOG.filter(item => item.compatibility?.includes(family));
};

// Backward compatibility — if old code imports CATALOG from catalogData
export const CATALOG = MASTER_CATALOG;
