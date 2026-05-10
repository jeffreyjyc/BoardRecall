import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: 'env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for Chrome Extension support
  app.use(cors({
    origin: (origin, callback) => {
      // Allow all origins, including chrome-extension://
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  }));
  
  // Handle preflight requests
  app.options('*', cors() as any);
  
  app.use(express.json({ limit: '10mb' }));

  // We check multiple common names for the Gemini API key
  // prioritize GEMINI_API_KEY as it's the standard for this environment
  const envKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || "";
  const DEFAULT_GEMINI_API_KEY = envKey.trim().replace(/^["']|["']$/g, '');
  
  console.log("--- Server Environment Check ---");
  console.log(`Node ENV: ${process.env.NODE_ENV}`);
  if (!DEFAULT_GEMINI_API_KEY) {
    console.warn("WARNING: No default GEMINI_API_KEY found in process.env or .env");
    console.log("Available related keys:", Object.keys(process.env).filter(k => k.includes("API") || k.includes("KEY") || k.includes("GEMINI")));
  } else {
    console.log(`Gemini API Key loaded successfully. Length: ${DEFAULT_GEMINI_API_KEY.length}, Prefix: ${DEFAULT_GEMINI_API_KEY.substring(0, 4)}...`);
  }
  console.log("-------------------------------");

  // Health check for diagnostic purposes
  app.get("/api/health", (req, res) => {
    // List ALL keys present in process.env (values hidden)
    const allEnvKeys = Object.keys(process.env).sort();
    
    // Check if .env file exists and was loaded
    const dotEnvCheck = !!process.env.GEMINI_API_KEY || !!process.env.VITE_GEMINI_API_KEY;

    res.json({ 
      status: "ok", 
      envKeyPresent: !!DEFAULT_GEMINI_API_KEY,
      envKeyLength: DEFAULT_GEMINI_API_KEY ? DEFAULT_GEMINI_API_KEY.length : 0,
      envKeyPrefix: DEFAULT_GEMINI_API_KEY ? DEFAULT_GEMINI_API_KEY.substring(0, 4) : null,
      dotEnvLoaded: dotEnvCheck,
      availableEnvVars: allEnvKeys,
      serverTime: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      message: DEFAULT_GEMINI_API_KEY ? "Server is configured with an API key." : "Server is missing an API key. Check AI Studio Settings or .env file.",
      corsOrigin: req.headers.origin || "none"
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
