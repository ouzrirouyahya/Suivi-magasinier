import { describe, it, expect } from 'vitest';

const generateReference = (prefix: string, site: string, timeOffset = 0): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ts = (Date.now() + timeOffset).toString(36).toUpperCase().slice(-4);
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefix}/${site}/${year}${month}-${ts}${rand}`;
};

describe('generateReference — unicité des références de bons', () => {
  
  it('doit générer 1000 références toutes uniques', () => {
    const refs = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      refs.add(generateReference('BE', 'SMI', i));
    }
    expect(refs.size).toBe(1000);
  });

  it('doit respecter le format attendu', () => {
    const ref = generateReference('BS', 'OUMEJRANE');
    expect(ref).toMatch(/^BS\/OUMEJRANE\/\d{6}-[A-Z0-9]{8}$/);
  });
});
