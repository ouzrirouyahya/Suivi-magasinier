import { describe, it, expect } from 'vitest';

// Réplication de la logique pure de movements.service.ts
const calculateNewQty = (
  currentQty: number,
  itemQty: number,
  type: string
): number => {
  const isAdjustment = type === 'AJUSTEMENT';
  const isAddition = type === 'ENTREE' || 
                     type === 'TRANSFERT_IN' || 
                     type === 'RETOUR';
  return isAdjustment
    ? itemQty
    : isAddition
      ? currentQty + itemQty
      : currentQty - itemQty;
};

describe('Calcul quantité — logique de stock', () => {

  describe('AJUSTEMENT', () => {
    it('doit SET la quantité absolue, pas soustraire', () => {
      expect(calculateNewQty(50, 47, 'AJUSTEMENT')).toBe(47);
    });
    it('stock vide (0) est légal pour AJUSTEMENT', () => {
      expect(calculateNewQty(100, 0, 'AJUSTEMENT')).toBe(0);
    });
    it('doit ignorer le stock actuel complètement', () => {
      expect(calculateNewQty(0, 200, 'AJUSTEMENT')).toBe(200);
    });
  });

  describe('ENTREE', () => {
    it('doit additionner au stock actuel', () => {
      expect(calculateNewQty(50, 10, 'ENTREE')).toBe(60);
    });
    it('entree sur stock vide', () => {
      expect(calculateNewQty(0, 25, 'ENTREE')).toBe(25);
    });
  });

  describe('SORTIE', () => {
    it('doit soustraire du stock actuel', () => {
      expect(calculateNewQty(50, 10, 'SORTIE')).toBe(40);
    });
  });

  describe('RETOUR', () => {
    it('doit additionner comme une entrée', () => {
      expect(calculateNewQty(50, 3, 'RETOUR')).toBe(53);
    });
  });

  describe('TRANSFERT_IN', () => {
    it('doit additionner', () => {
      expect(calculateNewQty(20, 5, 'TRANSFERT_IN')).toBe(25);
    });
  });
});
