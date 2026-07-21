import { useState, useMemo } from 'react';
import { CatalogItem } from '../types';
import { logger } from '../lib/utils';
import { MASTER_CATALOG } from '../catalogData';

/**
 * Helper to retrieve catalog items by equipment family.
 * Filters the master catalog based on the selected family.
 */
export const getCatalogByFamily = (family: string): CatalogItem[] => {
  if (family === 'CONSOMMABLES') {
    const results = MASTER_CATALOG.filter(item => 
      item.id.startsWith('for_') || 
      item.suggestedType === 'CONSOMMABLES' || 
      (item.compatibility && (
        item.compatibility.toLowerCase().includes('tous perforateurs') || 
        item.compatibility.toLowerCase().includes('consommables')
      ))
    );
    logger.log(`[getCatalogByFamily] family: CONSOMMABLES, items matching count: ${results.length}`);
    return results;
  }

  const familyMap: Record<string, string> = {
    'ST2G': 'Epiroc Scooptram ST2G',
    'ST2D': 'Epiroc Scooptram ST2D',
    'ST7': 'Epiroc Scooptram ST7',
    'T23': 'Montabert T23',
    'T28': 'Montabert T28',
  };
  const targetCompatibility = familyMap[family];
  if (!targetCompatibility) {
    logger.warn(`[getCatalogByFamily] No compatibility mapping found for family: ${family}`);
    return [];
  }
  const results = MASTER_CATALOG.filter(item => {
    const itemComp = (item.compatibility || '').toLowerCase();
    return itemComp === targetCompatibility.toLowerCase() || itemComp.includes(family.toLowerCase());
  });
  logger.log(`[getCatalogByFamily] family: ${family}, targetCompatibility: ${targetCompatibility}, items matching count: ${results.length}`);
  return results;
};

/**
 * Hook to manage reactive filtering, searching, and family selection
 * over the entire master catalog.
 */
export function useCatalogFilter() {
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredItems = useMemo(() => {
    logger.log('[useCatalogFilter] selectedFamily:', selectedFamily);
    let items = MASTER_CATALOG;
    if (selectedFamily) {
      items = getCatalogByFamily(selectedFamily);
      logger.log('[useCatalogFilter] filtered count by family:', items.length);
    }
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.designation?.toLowerCase().includes(q) ||
        item.reference?.toLowerCase().includes(q) ||
        item.component?.toLowerCase().includes(q)
      );
      logger.log('[useCatalogFilter] filtered count with searchQuery:', items.length);
    }
    return items;
  }, [selectedFamily, searchQuery]);
  
  return { selectedFamily, setSelectedFamily, searchQuery, setSearchQuery, filteredItems };
}

/**
 * Builds a nested category/component hierarchy for the catalog.
 * Defaults to the complete MASTER_CATALOG if no catalog is specified.
 */
export function buildHierarchy(catalog: CatalogItem[] = MASTER_CATALOG) {
  const hierarchy: Record<string, any> = {};
  
  for (const item of catalog) {
    const type = item.suggestedType || 'AUTRES';
    if (!hierarchy[type]) hierarchy[type] = { categories: {} };
    
    const cat = item.functionalCategory || 'Non classé';
    if (!hierarchy[type].categories[cat]) {
      hierarchy[type].categories[cat] = {
        name: cat,
        isLeaf: false,
        subCategories: {}
      };
    }
    
    const subCat = item.subCategory || 'Non spécifié';
    if (!hierarchy[type].categories[cat].subCategories[subCat]) {
      const hasComponents = !!item.component;
      hierarchy[type].categories[cat].subCategories[subCat] = {
        name: subCat,
        isLeaf: !hasComponents,
        components: {}
      };
    }
    
    if (item.component) {
      hierarchy[type].categories[cat].subCategories[subCat].components[item.component] = {
        name: item.component,
        reference: item.reference,
        price: item.price || 0,
        unit: item.unit || 'PIECE',
        criticality: item.criticality || 'MOYENNE',
        isLeaf: true
      };
    }
  }
  
  return hierarchy;
}
