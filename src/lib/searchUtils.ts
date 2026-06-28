import { Article } from '../types';

const SYNONYM_MAP: Record<string, string[]> = {
  perfo: ["perforateur", "marteau", "rotation", "drill"],
  perforateur: ["perfo", "marteau", "rotation", "drill"],
  taillant: ["retrac", "button", "bit", "crown", "tige", "forage", "perforateur", "couronne"],
  retrac: ["taillant"],
  tige: ["taillant"],
  epi: ["gant", "casque", "lunette", "combinaison", "protection", "masque", "chaussure", "masa", "s3"],
  gant: ["epi"],
  casque: ["epi"],
  lunettes: ["epi"],
  lunette: ["epi"],
  cummins: ["moteur"],
  moteur: ["cummins", "qsk"],
};

export function normalizeSearchString(val: string): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchArticleSearch(article: Article, queryText: string): boolean {
  if (!queryText || queryText.trim() === '') return true;

  const terms = queryText.trim().split(/\s+/).map(normalizeSearchString).filter(Boolean);
  if (terms.length === 0) return true;

  const searchableFields = [
    article.designation,
    article.ref,
    (article as any).reference || '',
    article.category || '',
    article.functionalCategory || '',
    article.subCategory || '',
    article.component || '',
    article.subComponent || '',
    article.location || '',
    article.notes || '',
    (article as any).commonName || '',
    ...((article as any).searchTags || [])
  ].map(normalizeSearchString);

  return terms.every(term => {
    // Direct matches in any fields
    const directMatch = searchableFields.some(field => field.includes(term));
    if (directMatch) return true;

    // Check synonym matches
    const synonyms = SYNONYM_MAP[term] || [];
    return synonyms.some(syn => {
      const normSyn = normalizeSearchString(syn);
      return searchableFields.some(field => field.includes(normSyn));
    });
  });
}
