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
      } else {
        systemPrompt = `Tu es un expert en planification de ravitaillement gasoil et pièces pour Hydromines. 
        Prédis les besoins pour les 30 prochains jours basés sur l'historique de consommation.
        Si l'article est "Gasoil", sois précis sur le litrage estimé (predictedNeed).
        Pour les autres pièces, base-toi sur la fréquence de changement.
        Réponds uniquement au format JSON.
        Format: { "predictions": [{ "articleId": string, "articleName": string, "predictedNeed": number, "confidence": number, "reasoning": string, "suggestedPurchaseDate": string }] }`;
      }

      const prompt = `Données: ${JSON.stringify(data)}\n\n${systemPrompt}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const responseText = response.text || "";
      
      // Attempt to parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      
      if (!jsonString || jsonString.trim() === "") {
        throw new Error("Gemini returned empty or invalid response");
      }
      
      res.json(JSON.parse(jsonString));
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze data" });
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

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
        },
      });

      // Simple implementation: send the last message but chat could be enhanced with history if needed
      // To strictly follow Chat API from SDK, we should send messages one by one or reconstruct history
      // For now, we take the last user message and the model provides the answer.
      const lastUserMessage = messages[messages.length - 1].content;
      
      const response = await chat.sendMessage({ message: lastUserMessage });
      const responseText = response.text || "Désolé, je n'ai pas pu générer de réponse.";
      
      res.json({ message: responseText });
    } catch (error) {
      res.status(500).json({ error: "Failed to chat with expert" });
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
