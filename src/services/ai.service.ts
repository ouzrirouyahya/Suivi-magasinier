import { GoogleGenAI } from '@google/genai';
import { logger } from '../lib/utils';

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (!aiInstance) {
    const apiKey = import.meta.env.VITE_GEMINI_KEY;
    if (!apiKey) {
      logger.warn('[AI] Clé Gemini manquante — fonctionnalité IA désactivée.');
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const aiService = {
  /**
   * RECOMMANDATION DE SÉCURITÉ (APPROCHE A) :
   * Pour la production de Hydromines, il est fortement conseillé de migrer ce service
   * vers une fonction Firebase Cloud (ou un proxy backend) afin de ne jamais exposer
   * la clé d'API Gemini dans le bundle client.
   */
  async generateSummary(text: string): Promise<string> {
    try {
      const ai = getAI();
      if (!ai) {
        return 'Résumé IA non disponible (clé VITE_GEMINI_KEY manquante ou non configurée).';
      }
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Veuillez résumer le texte suivant lié à la gestion minière Hydromines :\n\n${text}`,
      });
      return response.text || '';
    } catch (err) {
      logger.error('Gemini API call failed:', err);
      return 'Impossible de générer le résumé (erreur lors de l\'appel à l\'API Gemini ou clé invalide).';
    }
  }
};
