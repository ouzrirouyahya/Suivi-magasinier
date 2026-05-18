import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Helper for retries with fallback model support
  const withRetry = async (fn: (model: string) => Promise<any>, retries = 3, delay = 1000) => {
    const models = ["gemini-3-flash-preview", "gemini-3.1-pro-preview"];
    let lastError: any = null;

    for (const model of models) {
      for (let i = 0; i < retries; i++) {
        try {
          return await fn(model);
        } catch (error: any) {
          lastError = error;
          const errorMessage = error?.message || String(error);
          const isQuotaError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');
          const isNotFoundError = errorMessage.includes('404') || errorMessage.includes('NOT_FOUND');
          const isTransient = errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE') || isQuotaError || isNotFoundError;
          
          if (!isTransient) throw error;
          
          if ((isQuotaError || isNotFoundError) && model === models[0]) {
            console.warn(`Model ${model} failed (${isNotFoundError ? 'Not Found' : 'Quota'}), attempting fallback to ${models[1]}...`);
            break; // Break retry loop to switch model
          }

          console.warn(`Gemini API busy/quota (${model}) (attempt ${i + 1}/${retries}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    throw lastError;
  };

  // AI Analysis Endpoint
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      }

      const { data, promptType } = req.body;
      
      let systemPrompt = "";
      if (promptType === 'ANOMALIES') {
        systemPrompt = `Tu es un expert en audit de consommation de carburant (Gasoil) et maintenance minière pour Hydromines. 
        Analyse les mouvements et détecte des anomalies comme:
        - Surconsommation de gasoil par rapport aux heures machine / engin
        - Vols de gasoil suspectés (baisses brutales de stock sans sortie correspondante ou sorties trop fréquentes)
        - Fréquence de maintenance anormale
        - Incohérences techniques
        Réponds uniquement au format JSON.
        Format: { "anomalies": [{ "id": string, "type": "GASOIL_OVERCONSUMPTION" | "SUSPECTED_THEFT" | "MAINTENANCE_ANOMALY", "severity": "CRITICAL" | "HIGH" | "MEDIUM", "description": string, "suggestedAction": string, "machineId": string }] }`;
      } else if (promptType === 'FINANCIAL_REPORT') {
        systemPrompt = `Tu es un expert en optimisation financière minière (Cost Control). 
        Analyse les données pour identifier "Où l'on perd de l'argent" (Pertes financières).
        Inclus:
        - Surstockage (capital dormant)
        - Pièces à rotation nulle (obsolescence)
        - Consommations excessives par engin
        - Manques à gagner dus aux ruptures de stock
        - Score de santé financière (HEALTH_SCORE) sur 100
        Réponds uniquement au format JSON.
        Format: { "healthScore": number, "financialLeaks": [{ "id": string, "title": string, "estimatedLoss": string, "impact": "CRITICAL" | "HIGH" | "MEDIUM", "description": string, "recommendation": string }] }`;
      } else if (promptType === 'FRAUD_DETECTION') {
        systemPrompt = `Tu es une unité d'élite d'audit (type FBI) spécialisée dans la fraude logistique.
        Analyse les mouvements et le comportement des utilisateurs pour détecter :
        - 'Saisie Flash' : Plusieurs mouvements complexes créés en moins d'une minute par le même utilisateur (soupçon de remplissage fictif).
        - 'Vampirisme de stock' : Sorties répétitives de petites quantités qui cachent un vol important.
        - 'Séquences de Mensonge' : Mouvements annulés puis recréés avec des bénéficiaires différents.
        - 'Profils Suspects' : Utilisateurs dont les ratios de pertes sont 30% supérieurs à la moyenne.
        Réponds en JSON uniquement.
        Format: { "fraudScore": number, "threats": [{ "id": string, "type": "CRITICAL" | "SUSPICIOUS", "logic": string, "evidence": string, "userConcerned": string }] }`;
      } else if (promptType === 'MECHANIC_PERFORMANCE') {
        systemPrompt = `Tu es un expert en gestion de flotte et capital humain pour Hydromines.
        Analyse la liste des agents fournie et leurs consommations d'articles dans les mouvements (en utilisant le champ 'beneficiaire').
        Compare les agents (mécaniciens / opérateurs) :
        - Qui consomme le plus de pièces détachées par rapport au volume d'activité ?
        - Y a-t-il des anomalies de montage suspectées (ex: 3 filtres pour le même engin en 1 semaine) ?
        - Détecte les "Top Performers".
        Réponds uniquement au format JSON.
        Format: { "agentInsights": [{ "id": string, "agentName": string, "score": number, "analysis": string, "anomalies": string[], "strengths": string[] }] }`;
      } else if (promptType === 'COMPLIANCE') {
        systemPrompt = `Tu es un auditeur de conformité pour Hydromines. 
        Vérifie la rigueur de saisie et les procédures dans les données fournies :
        - CRITIQUE : Sorties (type: SORTIE) dont le champ 'beneficiaire' est vide ou absent. C'est le problème n°1 à corriger.
        - Mouvements hors heures habituelles (nuit/weekend).
        - Articles de type 'EPI' ou 'OUTILS' sans bénéficiaire nominatif.
        - Transferts sans site de destination clair.
        Réponds uniquement au format JSON.
        Format: { "complianceIssues": [{ "id": string, "issue": string, "severity": "HIGH" | "MEDIUM" | "LOW", "affectedDocument": string, "reason": string }] }`;
      } else if (promptType === 'PROCUREMENT') {
        systemPrompt = `Tu es un planificateur d'approvisionnement stratégique pour Hydromines.
        Analyse les stocks actuels et suggère un plan d'achat :
        - Articles proches du point de commande.
        - Anticipation des besoins (Simbas, Jumbos).
        - Optimisation des frais de transport (groupage de commandes).
        Réponds uniquement au format JSON.
        Format: { "procurementPlan": [{ "id": string, "articleName": string, "suggestedQty": number, "priority": "URGENT" | "NORMAL" | "LOW", "estimatedCost": string, "reasoning": string }] }`;
      } else {
        systemPrompt = `Tu es un expert en planification de ravitaillement gasoil et pièces pour Hydromines. 
        Prédis les besoins pour les 30 prochains jours basés sur l'historique de consommation.
        Si l'article est "Gasoil", sois précis sur le litrage estimé (predictedNeed).
        Pour les autres pièces, base-toi sur la fréquence de changement.
        Réponds uniquement au format JSON.
        Format: { "predictions": [{ "articleId": string, "articleName": string, "predictedNeed": number, "confidence": number, "reasoning": string, "suggestedPurchaseDate": string }] }`;
      }

      const prompt = `Données: ${JSON.stringify(data)}\n\n${systemPrompt}`;
      
      const response = await withRetry((modelName) => ai.models.generateContent({
        model: modelName,
        contents: prompt
      }));
      
      const responseText = response.text || "";
      
      // Attempt to parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      
      if (!jsonString || jsonString.trim() === "") {
        throw new Error("Gemini returned empty or invalid response");
      }
      
      res.json(JSON.parse(jsonString));
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      res.status(500).json({ 
        error: "Échec de l'analyse AI", 
        details: error?.message || String(error)
      });
    }
  });

  // AI Vision Endpoint
  app.post("/api/ai/vision", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      }

      const { image, mode } = req.body; // image is base64 encoded
      
      let systemPrompt = "";
      if (mode === 'PART_IDENTIFICATION') {
        systemPrompt = "Identifie cette pièce détachée minière. Donne son nom technique, son utilité et si possible une référence standard (ex: Filtre, Flexible, Roulement).";
      } else if (mode === 'DAMAGE_ANALYSIS') {
        systemPrompt = "Analyse cette pièce ou cet équipement pour détecter des signes d'usure, de casse, de fuite ou de corrosion. Donne un avis technique sur l'urgence du remplacement.";
      } else {
        systemPrompt = "Décris ce que tu vois dans le cadre d'une exploitation minière.";
      }

      const response = await withRetry((modelName) => ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image.split(',')[1] || image
                }
              }
            ]
          }
        ]
      }));

      res.json({ result: response.text });
    } catch (error: any) {
      console.error("AI Vision Error:", error);
      res.status(500).json({ error: "Échec de l'analyse vision", details: error?.message });
    }
  });

  // AI Chat Expert Endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      }

      const { messages, context } = req.body;
      
      const systemInstruction = `Tu es l'Expert Gemini d'Hydromines, spécialisé dans la maintenance des équipements miniers souterrains et la gestion de magasin.
      Ton expertise inclut :
      - Les engins de forage (Jumbos, Simbas).
      - Les perforateurs Montabert (modèles T23 et T28).
      - La logistique de stock pour sites miniers isolés.
      - Les procédures de sécurité et de réception de pièces.

      Contexte actuel du magasin :
      ${JSON.stringify(context)}

      Réponds de manière professionnelle, précise et technique. Si un magasinier demande des détails sur une pièce, utilise le contexte du magasin fourni pour lui répondre sur sa disponibilité ou sa référence.
      Sois concis mais d'une aide précieuse.`;

      const lastUserMessage = messages[messages.length - 1].content;
      
      const response = await withRetry((modelName) => {
        const chat = ai.chats.create({
          model: modelName,
          config: {
            systemInstruction,
          },
        });
        return chat.sendMessage({ message: lastUserMessage });
      });

      const responseText = response.text || "Désolé, je n'ai pas pu générer de réponse.";
      
      res.json({ message: responseText });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ 
        error: "Erreur de communication avec l'IA", 
        details: error?.message || String(error) 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
  });
}

startServer();
