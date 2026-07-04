import { describe, it, expect } from 'vitest';

// Test logique AJUSTEMENT — le bug le plus dangereux
describe('Calcul quantité — logique de stock', () => {
  
  const calculateNewQty = (
    currentQty: number,
    itemQty: number,
    type: string
  ): number => {
    const isAdjustment = type === 'AJUSTEMENT';
    const isAddition = type === 'ENTREE' || type === 'TRANSFERT_IN' || type === 'RETOUR';
    return isAdjustment
      ? itemQty
      : isAddition
        ? currentQty + itemQty
        : currentQty - itemQty;
  };

  it('AJUSTEMENT doit SET la quantité absolue', () => {
    expect(calculateNewQty(50, 47, 'AJUSTEMENT')).toBe(47);
    expect(calculateNewQty(100, 0, 'AJUSTEMENT')).toBe(0); // stock vide légal
    expect(calculateNewQty(0, 200, 'AJUSTEMENT')).toBe(200);
  });

  it('ENTREE doit additionner', () => {
    expect(calculateNewQty(50, 10, 'ENTREE')).toBe(60);
  });

  it('SORTIE doit soustraire', () => {
    expect(calculateNewQty(50, 10, 'SORTIE')).toBe(40);
  });

  it('RETOUR doit additionner', () => {
    expect(calculateNewQty(50, 3, 'RETOUR')).toBe(53);
  });
});
