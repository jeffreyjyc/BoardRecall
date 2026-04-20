import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Schema Definitions
  const FLASHCARD_SCHEMA = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        front: { type: Type.STRING },
        back: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["front", "back", "tags"],
    },
  };

  const BOARD_QUESTION_SCHEMA = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        vignette: { type: Type.STRING },
        question: { type: Type.STRING },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              text: { type: Type.STRING },
              isCorrect: { type: Type.BOOLEAN },
              explanation: { type: Type.STRING },
            },
            required: ["label", "text", "isCorrect", "explanation"],
          },
        },
        overallExplanation: { type: Type.STRING },
        sources: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["vignette", "question", "options", "overallExplanation", "sources"],
    },
  };

  // API Routes
  app.post("/api/generate-flashcards", async (req, res) => {
    try {
      const { content, images, instructions, model: requestedModel, existingCards } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Server API Key is not configured." });
      }

      const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
      const modelName = requestedModel || "gemini-2.0-flash";

      const systemInstruction = `
        You are an expert medical educator specializing in USMLE Step 1 and Step 2 board exams.
        Your task is to convert medical board exam questions and their explanations into high-yield, effective flashcards.
        
        GUIDELINES:
        1. Use Anki-style Cloze deletion: {{c1::answer}}. 
        2. If a hint is helpful for a specific blank, include it after a second double-colon: {{c1::answer::hint}}.
        3. Use c2, c3, etc. only if necessary.
        4. Keep one atomic fact per cloze.
        5. The back should provide concise context.
        6. Focus only on high-yield, board-relevant info.
        7. Succinctly summarize.
        8. Ignore metadata/copyright notices.
        ${instructions ? `USER CUSTOM INSTRUCTIONS: ${instructions}` : ""}
        ${existingCards ? `EXISTING CARDS (Do not repeat these): ${JSON.stringify(existingCards.map((c: any) => c.front))}` : ""}
      `;

      const promptParts = [{ text: `Generate flashcards from this content:\n\n${content}` }];
      if (images && images.length > 0) {
        for (const img of images) {
          const [mime, data] = img.split(";base64,");
          promptParts.push({
            inlineData: {
              mimeType: mime.split(":")[1],
              data: data,
            }
          } as any);
        }
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: promptParts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: FLASHCARD_SCHEMA as any,
          temperature: 0.1,
          systemInstruction,
        },
      });

      res.json(JSON.parse(response.text || "[]"));
    } catch (error: any) {
      console.error("Flashcard generation failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-board-questions", async (req, res) => {
    try {
      const { content, model: requestedModel } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Server API Key is not configured." });
      }

      const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
      const modelName = requestedModel || "gemini-2.0-flash";

      const systemInstruction = `
        You are an expert medical board exam question writer for USMLE Step 1 and Step 2.
        Generate board-style clinical vignettes with 5 options (A-E), detailed explanations, and sources.
      `;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: `Original Content:\n${content}` }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: BOARD_QUESTION_SCHEMA as any,
          temperature: 0.1,
          systemInstruction,
        },
      });

      res.json(JSON.parse(response.text || "[]"));
    } catch (error: any) {
      console.error("Board question generation failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
