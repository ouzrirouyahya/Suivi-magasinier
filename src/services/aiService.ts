
import { SiteCode, Article, Mouvement, AgentMaster } from '../types';

export const aiService = {
  analyze: async (type: string, data: any) => {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptType: type, data })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Erreur serveur" }));
      throw new Error(errorData.details || errorData.error || `Erreur ${response.status}`);
    }

    return response.json();
  },

  vision: async (image: string, mode: 'PART_IDENTIFICATION' | 'DAMAGE_ANALYSIS') => {
    const response = await fetch('/api/ai/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mode })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || "Erreur vision");
    }

    return response.json();
  },

  chat: async (messages: any[], context: any) => {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || "Erreur chat");
    }

    return response.json();
  }
};
