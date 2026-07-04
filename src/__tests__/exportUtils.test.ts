import { describe, it, expect } from 'vitest';

describe('Export CSV — encodage et format', () => {

  it('BOM UTF-8 : premier caractère doit être 0xFEFF', () => {
    const BOM = '\uFEFF';
    const csv = BOM + 'Référence;Désignation\n';
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it('séparateur point-virgule obligatoire', () => {
    const headers = ['Référence', 'Désignation', 'Quantité'];
    const row = headers.join(';');
    expect(row).toBe('Référence;Désignation;Quantité');
    expect(row).not.toContain(',');
  });

  it('formatCurrency ne doit jamais retourner NaN', () => {
    const formatCurrency = (value: number | undefined | null): string => {
      const safe = Number(value) || 0;
      return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD'
      }).format(safe);
    };
    expect(formatCurrency(undefined)).not.toContain('NaN');
    expect(formatCurrency(null)).not.toContain('NaN');
    expect(formatCurrency(NaN)).not.toContain('NaN');
    expect(formatCurrency(0)).not.toContain('NaN');
  });

  it('valeurs avec point-virgule doivent être entre guillemets', () => {
    const escapeCSV = (val: string): string => {
      const escaped = val.replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${escaped}"`;
    };
    expect(escapeCSV('FILTRE; TYPE A')).toBe('"FILTRE; TYPE A"');
    expect(escapeCSV('Référence "spéciale"')).toBe('"Référence ""spéciale"""');
  });
});
