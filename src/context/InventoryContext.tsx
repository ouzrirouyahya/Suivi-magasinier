import React, { createContext, useContext, ReactNode } from 'react';
import { Article, PriceHistoryEntry, CatalogItem } from '../types';
import { useInventory as useInventoryMaster } from '../hooks/useInventory';

export interface CatalogUsageStats {
  catalogItem: CatalogItem;
  isUsed: boolean;
  movementCount: number;
  totalQuantityOut: number;
  sitesUsing: string[];
  isInHydrominesCatalog: boolean;
  lastUsedDate: string | null;
}

/**
 * Calculates the new Weighted Average Cost Price (PMP) and tracks price history.
 */
export function calculatePriceUpdates(
  article: Article,
  inputQty: number,
  inputUnitPrice: number,
  mouvementId: string,
  userEmail?: string,
  dateString?: string
): { price: number; lastPurchasePrice: number; priceHistory: PriceHistoryEntry[] } {
  const currentQty = article.quantity || 0;
  const currentPMP = article.price || 0;
  const date = dateString || new Date().toISOString();

  const safeInputPrice = Math.max(0, inputUnitPrice);
  const safeInputQty = Math.max(0, inputQty);

  let newPMP = currentPMP;

  if (safeInputQty <= 0) {
    return {
      price: currentPMP,
      lastPurchasePrice: safeInputPrice > 0 ? safeInputPrice : (article.lastPurchasePrice || currentPMP),
      priceHistory: article.priceHistory || []
    };
  }

  if (currentQty <= 0) {
    newPMP = safeInputPrice;
  } else {
    const totalValue = (currentQty * currentPMP) + (safeInputQty * safeInputPrice);
    const totalQty = currentQty + safeInputQty;
    newPMP = totalQty > 0 ? totalValue / totalQty : safeInputPrice;
  }

  newPMP = Math.round(newPMP * 100) / 100;

  const existingHistory = article.priceHistory || [];
  
  const purchaseEntry: PriceHistoryEntry = {
    date,
    price: safeInputPrice,
    type: 'ACHAT',
    quantityAttached: safeInputQty,
    mouvementId,
    userEmail
  };

  const pmpEntry: PriceHistoryEntry = {
    date,
    price: newPMP,
    type: 'PMP',
    quantityAttached: currentQty + safeInputQty,
    mouvementId,
    userEmail
  };

  return {
    price: newPMP,
    lastPurchasePrice: safeInputPrice,
    priceHistory: [...existingHistory, purchaseEntry, pmpEntry]
  };
}

type InventoryContextType = ReturnType<typeof useInventoryMaster>;
const InventoryContext = createContext<InventoryContextType | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const value = useInventoryMaster();

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextType {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
