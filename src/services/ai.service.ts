import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const aiService = {
  async generateSummary(text: string): Promise<string> {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Veuillez résumer le texte suivant lié à la gestion minière Hydromines :\n\n${text}`,
      });
      return response.text || '';
    } catch (err) {
      console.error('Gemini API call failed:', err);
      return 'Impossible de générer le résumé (clé API non configurée ou erreur réseau).';
    }
  }
};
