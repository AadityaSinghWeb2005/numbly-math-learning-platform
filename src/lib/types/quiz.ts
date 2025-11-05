export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type MathTopic = 
  | 'addition' 
  | 'subtraction' 
  | 'multiplication' 
  | 'division' 
  | 'fractions' 
  | 'decimals'
  | 'mixed'; // For mixed topics

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface AIQuizQuestion {
  id: string;
  question: string;
  topic: MathTopic;
  difficulty: DifficultyLevel;
  options: QuizOption[];
  correctAnswerExplanation: string;
}

export interface QuizGenerationRequest {
  topic: MathTopic;
  difficulty: DifficultyLevel;
  count: number;
}

export interface QuizGenerationResponse {
  questions: AIQuizQuestion[];
  generatedAt: string;
}
