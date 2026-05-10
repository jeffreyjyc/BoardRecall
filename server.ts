import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for Chrome Extension support
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // We check multiple common names for the Gemini API key
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  const DEFAULT_GEMINI_API_KEY = envKey.trim().replace(/^["']|["']$/g, '');
  
  if (!DEFAULT_GEMINI_API_KEY) {
    console.warn("--- SERVER WARNING ---");
    console.warn("No default GEMINI_API_KEY found in .env or environment.");
    console.warn("Available environment keys:", Object.keys(process.env).filter(k => k.includes("API") || k.includes("KEY")));
    console.warn("-----------------------");
  } else {
    console.log(`[Server] Default Gemini API Key loaded (Length: ${DEFAULT_GEMINI_API_KEY.length}, Prefix: ${DEFAULT_GEMINI_API_KEY.substring(0, 4)}...)`);
  }

  // Health check for diagnostic purposes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      envKeyPresent: !!DEFAULT_GEMINI_API_KEY,
      envKeyLength: DEFAULT_GEMINI_API_KEY ? DEFAULT_GEMINI_API_KEY.length : 0,
      envKeyPrefix: DEFAULT_GEMINI_API_KEY ? DEFAULT_GEMINI_API_KEY.substring(0, 4) : null,
      serverTime: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV
    });
  });

  app.post("/api/gemini", async (req, res) => {
    try {
      const { 
        type, 
        payload, 
        customSettings, 
        systemInstruction,
        responseSchema
      } = req.body;

      // Extract and trim the key. Prefer custom key if provided and not empty.
      let apiKeyToUse = "";
      let keySource = "";

      if (customSettings?.geminiApiKey && typeof customSettings.geminiApiKey === 'string' && customSettings.geminiApiKey.trim() !== '') {
        apiKeyToUse = customSettings.geminiApiKey.trim().replace(/^["']|["']$/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
        keySource = "User-Provided (Override)";
      } else if (DEFAULT_GEMINI_API_KEY) {
        apiKeyToUse = DEFAULT_GEMINI_API_KEY;
        keySource = "Server-Default";
      }

      if (!apiKeyToUse) {
        return res.status(400).json({ error: "Gemini API Key is missing. Please add it in Settings." });
      }

      const modelName = customSettings?.geminiModel || "gemini-2.0-flash";
      console.log(`[AI Request] ${new Date().toISOString()} | Source: ${keySource} | Model: ${modelName} | Type: ${type}`);

      const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
      
      // Prepare parts for the prompt
      let parts: any[] = [];
      if (payload.images && payload.images.length > 0) {
        parts.push({ text: payload.prompt });
        for (const img of payload.images) {
          const [mimeHeader, data] = img.split(";base64,");
          const mimeType = mimeHeader.split(":")[1] || "image/png";
          parts.push({
            inlineData: {
              mimeType,
              data,
            },
          });
        }
      } else {
        parts.push({ text: payload.prompt });
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.1,
          topP: 0.95,
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from AI (no text returned).");
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Gemini Proxy Error Details:", error);
      
      // Specially handle invalid API key errors for better UX
      const errorMsg = error.message || "";
      if (errorMsg.includes("API key not valid") || error.status === "INVALID_ARGUMENT" || error.code === 400) {
        return res.status(401).json({ 
          error: "The Gemini API key is invalid. Please check your settings or environment configuration.",
          details: "API_KEY_INVALID",
          technical: errorMsg
        });
      }

      res.status(500).json({ 
        error: error.message || "An error occurred during the AI request.",
        details: error.stack 
      });
    }
  });

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
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
