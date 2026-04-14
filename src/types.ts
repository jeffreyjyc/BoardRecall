export interface Flashcard {
  id: string;
  front: string; // Cloze style: "The [primary treatment] for [condition] is [drug]."
  back: string;  // Context/Explanation
  hint?: string;
  tags: string[];
}

export interface BoardQuestion {
  id: string;
  vignette: string;
  question: string;
  options: {
    label: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  overallExplanation: string;
  sources?: string[];
}

export interface QuestionSet {
  id: string;
  title: string;
  originalText: string;
  cards: Flashcard[];
  relatedQuestions?: BoardQuestion[];
  createdAt: number;
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
}

export interface AppSettings {
  provider: 'gemini' | 'openai' | 'local';
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  localEndpoint: string;
  localModel: string;
}
