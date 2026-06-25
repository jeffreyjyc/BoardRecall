export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
}

export interface BoardQuestionOption {
  label: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface BoardQuestion {
  id: string;
  vignette: string;
  question: string;
  options: BoardQuestionOption[];
  overallExplanation: string;
  sources: string[];
}

export interface QuestionSet {
  id: string;
  title: string;
  originalText: string;
  cards: Flashcard[];
  createdAt: number;
  relatedQuestions?: BoardQuestion[];
}

export interface AppSettings {
  provider: 'gemini' | 'local';
  geminiApiKey: string;
  geminiModel: string;
  localEndpoint: string;
  localModel: string;
}
