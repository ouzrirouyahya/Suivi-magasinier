import { describe, it, expect } from 'vitest';

let testCounter = 0;
const generateReference = (prefix: string, site: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  
  testCounter = (testCounter + 1) % 10000;
  const rand = testCounter.toString().padStart(4, '0');
  
  return `${prefix}/${site}/${year}${month}-${ts}${rand}`;
};

describe('generateReference — unicité des références de bons', () => {

  it('doit générer 1000 références toutes uniques', () => {
    const refs = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      refs.add(generateReference('BE', 'SMI'));
    }
    expect(refs.size).toBe(1000);
  });

  it('format correct pour BE/SMI', () => {
    const ref = generateReference('BE', 'SMI');
    expect(ref.startsWith('BE/SMI/')).toBe(true);
  });

  it('format correct pour BS/OUMEJRANE', () => {
    const ref = generateReference('BS', 'OUMEJRANE');
    expect(ref.startsWith('BS/OUMEJRANE/')).toBe(true);
  });

  it('doit contenir un séparateur tiret', () => {
    const ref = generateReference('BE', 'SMI');
    const parts = ref.split('/');
    expect(parts[2]).toContain('-');
  });
});
