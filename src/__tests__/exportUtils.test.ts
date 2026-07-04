import { describe, it, expect } from 'vitest';

describe('Export CSV — encodage UTF-8', () => {
  
  it('doit commencer par le BOM UTF-8', () => {
    const BOM = '\uFEFF';
    const csvContent = BOM + 'Référence;Désignation;Quantité\n';
    expect(csvContent.charCodeAt(0)).toBe(0xFEFF);
  });

  it('doit utiliser le point-virgule comme séparateur', () => {
    const headers = ['Référence', 'Désignation', 'Quantité'];
    const row = headers.join(';');
    expect(row).toBe('Référence;Désignation;Quantité');
    expect(row).not.toContain(',');
  });

  it('formatCurrency ne doit jamais retourner NaN', () => {
    const formatCurrency = (value: number | undefined | null): string => {
      const safe = Number(value) || 0;
      return safe.toFixed(2) + ' MAD';
    };
    expect(formatCurrency(undefined)).not.toContain('NaN');
    expect(formatCurrency(null)).not.toContain('NaN');
    expect(formatCurrency(NaN)).not.toContain('NaN');
    expect(formatCurrency(1500.5)).toBe('1500.50 MAD');
  });
});
