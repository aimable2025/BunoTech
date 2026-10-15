import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Server-side Gemini API endpoint for BUNO Tech Premium AI Assistant
  app.post('/api/ai/assistant', async (req, res) => {
    try {
      const { prompt, taskCategory, history } = req.body;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'Veuillez fournir une instruction ou une question valide.' });
      }

      const safePrompt = prompt.trim().slice(0, 8000);
      const safeCategory = typeof taskCategory === 'string' ? taskCategory.slice(0, 100) : 'Assistance générale';

      const systemInstruction = `Tu es l'Assistant IA professionnel de la plateforme "AIMABLE MAOMBI BUNOTI — BUNO TECH" (BUNO Tech Premium).
Aimable Maombi Bunoti est un informaticien polyvalent, développeur, formateur et consultant en solutions numériques (RDC / International).
Catégorie demandée : ${safeCategory}.
Tes missions :
- Rédaction professionnelle (lettres administratives, demandes d'emploi/stage, procès-verbaux, notes de service, rapports d'activité ou de formation, CV).
- Correction orthographique, grammaticale et amélioration stylistique.
- Résumé clair et structuré de textes ou documents.
- Explication pédagogique de concepts informatiques (Windows, Word, Excel, PowerPoint, réseaux, cybersécurité, programmation web/mobile, bases de données).
- Aide au dépannage informatique et conseil en transformation numérique pour particuliers, ONG et entreprises.
Réponds toujours de manière claire, structurée, directement exploitable et professionnelle en français (ou dans la langue demandée par l'utilisateur).`;

      let fullContents = safePrompt;
      if (Array.isArray(history) && history.length > 0) {
        const formattedHistory = history
          .slice(-6)
          .map((msg: { role?: string; text?: string }) => `${msg.role === 'user' ? 'Client' : 'Assistant BUNO Tech'}: ${String(msg.text || '').slice(0, 1500)}`)
          .join('\n\n');
        fullContents = `Historique récent de la conversation :\n${formattedHistory}\n\nNouvelle demande du client (${safeCategory}) :\n${safePrompt}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const outputText = response.text || 'Aucune réponse générée.';
      return res.json({ text: outputText });
    } catch (error) {
      console.error('Gemini API Error:', error);
      const message = error instanceof Error ? error.message : 'Erreur interne lors de la communication avec le serveur IA.';
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BUNO Tech Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
