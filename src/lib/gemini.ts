import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, BoardQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

import { v4 as uuidv4 } from 'uuid';

export async function generateFlashcards(
  content: string,
  images: string[] = [],
  customInstructions: string = ""
): Promise<Flashcard[]> {
  const model = "gemini-3.1-pro-preview";
  
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

  const parts: any[] = [{ text: `Generate flashcards from the following medical question and explanation:\n\n${content}` }];
  
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
        responseSchema: FLASHCARD_SCHEMA,
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result.map((card: any) => ({
      ...card,
      id: uuidv4(),
    }));
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw new Error("Failed to generate flashcards. Please check your input and try again.");
  }
}

export async function addMoreFlashcards(
  existingCards: Flashcard[],
  originalContent: string
): Promise<Flashcard[]> {
  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `
    You are an expert medical educator. 
    The user has already generated some flashcards from a medical question.
    Your task is to identify additional high-yield facts from the original question/explanation that haven't been covered yet and create new cloze-style flashcards for them.
    
    EXISTING CARDS:
    ${JSON.stringify(existingCards.map(c => c.front))}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Original Question/Explanation:\n${originalContent}\n\nGenerate 2-3 additional unique high-yield flashcards.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: FLASHCARD_SCHEMA,
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result.map((card: any) => ({
      ...card,
      id: uuidv4(),
    }));
  } catch (error) {
    console.error("Error adding more flashcards:", error);
    throw new Error("Failed to generate additional cards.");
  }
}

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

export async function generateBoardQuestions(
  originalContent: string
): Promise<BoardQuestion[]> {
  const model = "gemini-3.1-pro-preview";
  
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

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Original Content:\n${originalContent}\n\nGenerate 2 unique board-style questions with in-depth explanations.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: BOARD_QUESTION_SCHEMA,
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result.map((q: any) => ({
      ...q,
      id: uuidv4(),
    }));
  } catch (error) {
    console.error("Error generating board questions:", error);
    throw new Error("Failed to generate new board questions.");
  }
}
