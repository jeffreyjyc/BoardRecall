import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, BoardQuestion, AppSettings } from "../types";
import { v4 as uuidv4 } from 'uuid';

// Default settings
let currentSettings: AppSettings = {
  provider: 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: "gemini-2.0-flash",
  localEndpoint: "http://localhost:11434/v1", // Default Ollama OpenAI-compatible endpoint
  localModel: "llama3",
};

// Load settings from storage
export async function loadSettings(): Promise<AppSettings> {
  const validateAndMigrate = (settings: AppSettings): AppSettings => {
    // Migrate away from deprecated models
    if (settings.geminiModel === "gemini-1.5-flash" || settings.geminiModel === "gemini-1.5-pro") {
      settings.geminiModel = "gemini-2.0-flash";
    }
    // Migrate away from deprecated providers
    if (settings.provider as string === 'openai') {
      settings.provider = 'gemini';
    }
    return settings;
  };

  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['med-flashcard-settings'], (result) => {
        const savedSettings = result['med-flashcard-settings'];
        if (savedSettings && typeof savedSettings === 'object') {
          currentSettings = validateAndMigrate({ ...currentSettings, ...(savedSettings as Partial<AppSettings>) });
        }
        resolve(currentSettings);
      });
    });
  }
  
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('med-flashcard-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        currentSettings = validateAndMigrate({ ...currentSettings, ...parsed });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }
  return currentSettings;
}

// Initial load
export const settingsLoaded = loadSettings();

// Listen for changes from other parts of the extension (e.g., Popup vs SidePanel)
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes['med-flashcard-settings']) {
      const newSettings = changes['med-flashcard-settings'].newValue as Partial<AppSettings>;
      if (newSettings && typeof newSettings === 'object') {
        currentSettings = { ...currentSettings, ...newSettings };
      }
    }
  });
}

export function updateSettings(settings: Partial<AppSettings>) {
  currentSettings = { ...currentSettings, ...settings };
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ 'med-flashcard-settings': currentSettings });
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('med-flashcard-settings', JSON.stringify(currentSettings));
  }
}

export function getSettings() {
  return currentSettings;
}

const FLASHCARD_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      front: {
        type: Type.STRING,
        description: "The front of the card using Anki cloze syntax: {{c1::answer::hint}}. Use c2, c3 only if multiple deletions are strictly necessary for the same context.",
      },
      back: {
        type: Type.STRING,
        description: "The back of the card with context and explanation.",
      },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Relevant medical tags (e.g., Cardiology, Pharmacology).",
      },
    },
    required: ["front", "back", "tags"],
  },
};

const BOARD_QUESTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      vignette: {
        type: Type.STRING,
        description: "A detailed clinical vignette in USMLE style.",
      },
      question: {
        type: Type.STRING,
        description: "The specific question being asked (e.g., 'What is the most likely diagnosis?').",
      },
      options: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING, description: "A, B, C, D, or E" },
            text: { type: Type.STRING, description: "The answer choice text" },
            isCorrect: { type: Type.BOOLEAN },
            explanation: { type: Type.STRING, description: "Why this choice is correct or incorrect." },
          },
          required: ["label", "text", "isCorrect", "explanation"],
        },
      },
      overallExplanation: {
        type: Type.STRING,
        description: "A comprehensive explanation of the clinical concept and why the correct answer is right.",
      },
      sources: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Reliable medical sources (e.g., Harrison's, UpToDate, medical library links) used to verify this question.",
      },
    },
    required: ["vignette", "question", "options", "overallExplanation", "sources"],
  },
};

async function callLocalLLM(systemPrompt: string, userPrompt: string, schema: any): Promise<any> {
  const { localEndpoint, localModel } = currentSettings;
  
  try {
    const response = await fetch(`${localEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: localModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + `\n\nIMPORTANT: Respond ONLY with a JSON array that strictly follows this schema: ${JSON.stringify(schema)}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local LLM error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse the JSON. Some models might wrap it in markdown blocks.
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    
    // Some models might return { "items": [...] } instead of just [...]
    if (Array.isArray(parsed)) return parsed;
    if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
    if (Object.values(parsed).length === 1 && Array.isArray(Object.values(parsed)[0])) return Object.values(parsed)[0];
    
    return parsed;
  } catch (error) {
    console.error("Local LLM call failed:", error);
    throw error;
  }
}

export async function generateFlashcards(
  content: string,
  images: string[] = [],
  customInstructions: string = ""
): Promise<Flashcard[]> {
  await settingsLoaded;
  
  if (!currentSettings.geminiApiKey && currentSettings.provider === 'gemini') {
    throw new Error("Gemini API Key is missing. Please add it in Settings.");
  }

  const systemInstruction = `
    You are an expert medical educator specializing in USMLE Step 1 and Step 2 board exams.
    Your task is to convert medical board exam questions and their explanations into high-yield, effective flashcards.
    
    GUIDELINES:
    1. Use Anki-style Cloze deletion: {{c1::answer}}. 
    2. If a hint is helpful for a specific blank, include it after a second double-colon: {{c1::answer::hint}}.
    3. Use c2, c3, etc. only if a second or third deletion is REALLY necessary to understand the relationship in the same sentence. Otherwise, prefer separate cards.
    4. Keep one atomic fact per cloze.
    5. The back of the card should provide concise context, the "why" behind the fact, and any relevant high-yield associations.
    6. Only generate cards for the most high-yield, board-relevant information.
    7. Succinctly summarize information. Don't over-generate.
    8. IMPORTANT: Ignore any reference information, ancillary data, copyright notices, or metadata that was copied into the input box that is not directly related to the medical question or its explanation. Focus exclusively on the medical content.
    
    ${customInstructions ? `USER CUSTOM INSTRUCTIONS: ${customInstructions}` : ""}
  `;

  const userPrompt = `Generate flashcards from the following medical question and explanation:\n\n${content}`;

  if (currentSettings.provider === 'local') {
    const result = await callLocalLLM(systemInstruction, userPrompt, FLASHCARD_SCHEMA);
    return result.map((card: any) => ({
      ...card,
      id: uuidv4(),
    }));
  }

  const ai = new GoogleGenAI({ apiKey: currentSettings.geminiApiKey });
  const model = currentSettings.geminiModel || "gemini-2.0-flash";
  
  const parts: any[] = [{ text: userPrompt }];
  
  for (const img of images) {
    const [mime, data] = img.split(";base64,");
    parts.push({
      inlineData: {
        mimeType: mime.split(":")[1],
        data: data,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: FLASHCARD_SCHEMA as any,
        temperature: 0.1,
        topP: 0.95,
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result.map((card: any) => ({
      ...card,
      id: uuidv4(),
    }));
  } catch (error: any) {
    console.error("Detailed Gemini Error:", error);
    const errorMessage = error?.message || "Unknown error";
    if (errorMessage.includes("API_KEY_INVALID")) {
      throw new Error("Invalid API Key. Please check your Gemini settings.");
    }
    if (errorMessage.includes("model not found") || errorMessage.includes("404")) {
      throw new Error(`Model "${model}" is not available for your API key. Try switching to Gemini 3.0 Flash Preview in settings.`);
    }
    if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
      if (errorMessage.toLowerCase().includes("rate limit")) {
        throw new Error("Rate limit reached. Please wait a few seconds and try again.");
      }
      throw new Error("Gemini Quota Error: This model might not be enabled for your API key yet, or you've reached your daily limit. Try switching to Gemini 3.0 Flash Preview.");
    }
    throw new Error(`AI Error: ${errorMessage}`);
  }
}

export async function addMoreFlashcards(
  existingCards: Flashcard[],
  originalContent: string,
  customInstructions: string = ""
): Promise<Flashcard[]> {
  await settingsLoaded;
  
  if (!currentSettings.geminiApiKey && currentSettings.provider === 'gemini') {
    throw new Error("Gemini API Key is missing. Please add it in Settings.");
  }

  const systemInstruction = `
    You are an expert medical educator. 
    The user has already generated some flashcards from a medical question.
    Your task is to identify additional high-yield facts from the original question/explanation that haven't been covered yet and create new cloze-style flashcards for them.
    
    EXISTING CARDS:
    ${JSON.stringify(existingCards.map(c => c.front))}

    ${customInstructions ? `USER CUSTOM INSTRUCTIONS FOR NEW CARDS: ${customInstructions}` : ""}
  `;

  const userPrompt = `Original Question/Explanation:\n${originalContent}\n\nGenerate 2-3 additional unique high-yield flashcards.${customInstructions ? ` Follow these instructions: ${customInstructions}` : ""}`;

  if (currentSettings.provider === 'local') {
    const result = await callLocalLLM(systemInstruction, userPrompt, FLASHCARD_SCHEMA);
    return result.map((card: any) => ({
      ...card,
      id: uuidv4(),
    }));
  }

  const ai = new GoogleGenAI({ apiKey: currentSettings.geminiApiKey });
  const model = currentSettings.geminiModel || "gemini-2.0-flash";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: FLASHCARD_SCHEMA as any,
        temperature: 0.1,
        topP: 0.95,
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result.map((card: any) => ({
      ...card,
      id: uuidv4(),
    }));
  } catch (error: any) {
    console.error("Detailed Gemini Error (Add More):", error);
    const errorMessage = error?.message || "Unknown error";
    if (errorMessage.includes("API_KEY_INVALID")) {
      throw new Error("Invalid API Key. Please check your Gemini settings.");
    }
    if (errorMessage.includes("model not found") || errorMessage.includes("404")) {
      throw new Error(`Model "${model}" is not available for your API key. Try switching to Gemini 3.0 Flash Preview in settings.`);
    }
    if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
      if (errorMessage.toLowerCase().includes("rate limit")) {
        throw new Error("Rate limit reached. Please wait a few seconds and try again.");
      }
      throw new Error("Gemini Quota Error: This model might not be enabled for your API key yet, or you've reached your daily limit. Try switching to Gemini 3.0 Flash Preview.");
    }
    throw new Error(`AI Error: ${errorMessage}`);
  }
}

export async function generateBoardQuestions(
  originalContent: string
): Promise<BoardQuestion[]> {
  await settingsLoaded;
  
  if (!currentSettings.geminiApiKey && currentSettings.provider === 'gemini') {
    throw new Error("Gemini API Key is missing. Please add it in Settings.");
  }

  const systemInstruction = `
    You are an expert medical board exam question writer for USMLE Step 1 and Step 2.
    Your task is to generate NEW board-style questions based on the provided medical content.
    
    GUIDELINES:
    1. The questions must be clinical vignettes (patient presentations).
    2. They should test either the same core concept as the original content or a closely related high-yield topic.
    3. You can also develop questions that explore the "distractor" answer choices from the original content to deepen understanding.
    4. Provide 5 options (A-E).
    5. Include detailed explanations for EVERY option (why it's right or why it's wrong).
    6. Provide a comprehensive overall explanation.
    7. VERIFICATION & SOURCES: 
       - You MUST verify all medical information against the original question/explanation or reliable medical resources (e.g., Harrison's Principles of Internal Medicine, UpToDate, StatPearls, or major medical library websites).
       - Ensure the content is strictly board-relevant for USMLE Step 1 or Step 2.
       - Include a list of 1-3 reliable sources or textbooks that support the information in the question.
    8. Maintain a professional, board-exam tone.
  `;

  const userPrompt = `Original Content:\n${originalContent}\n\nGenerate 2 unique board-style questions with in-depth explanations.`;

  if (currentSettings.provider === 'local') {
    const result = await callLocalLLM(systemInstruction, userPrompt, BOARD_QUESTION_SCHEMA);
    return result.map((q: any) => ({
      ...q,
      id: uuidv4(),
    }));
  }

  const ai = new GoogleGenAI({ apiKey: currentSettings.geminiApiKey });
  const model = currentSettings.geminiModel || "gemini-2.0-flash";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: BOARD_QUESTION_SCHEMA as any,
        temperature: 0.1,
        topP: 0.95,
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result.map((q: any) => ({
      ...q,
      id: uuidv4(),
    }));
  } catch (error: any) {
    console.error("Detailed Gemini Error (Board Qs):", error);
    const errorMessage = error?.message || "Unknown error";
    if (errorMessage.includes("API_KEY_INVALID")) {
      throw new Error("Invalid API Key. Please check your Gemini settings.");
    }
    if (errorMessage.includes("model not found") || errorMessage.includes("404")) {
      throw new Error(`Model "${model}" is not available for your API key. Try switching to Gemini 3.0 Flash Preview in settings.`);
    }
    if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
      if (errorMessage.toLowerCase().includes("rate limit")) {
        throw new Error("Rate limit reached. Please wait a few seconds and try again.");
      }
      throw new Error("Gemini Quota Error: This model might not be enabled for your API key yet, or you've reached your daily limit. Try switching to Gemini 3.0 Flash Preview.");
    }
    throw new Error(`AI Error: ${errorMessage}`);
  }
}
