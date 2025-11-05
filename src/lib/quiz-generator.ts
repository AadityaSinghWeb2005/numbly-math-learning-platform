import geminiClient from './gemini-client';
import { AIQuizQuestion, DifficultyLevel, MathTopic } from './types/quiz';

const DIFFICULTY_DESCRIPTORS: Record<DifficultyLevel, string> = {
  easy: 'Basic concepts, simple calculations, single-digit or small numbers (suitable for elementary level)',
  medium: 'Multi-step problems, two-digit numbers, application of concepts (suitable for middle school level)',
  hard: 'Complex problems, large numbers, word problems requiring critical thinking (suitable for advanced level)',
};

const TOPIC_DESCRIPTIONS: Record<MathTopic, string> = {
  addition: 'Adding numbers together, sum calculations, combining quantities',
  subtraction: 'Taking away numbers, difference calculations, comparing quantities',
  multiplication: 'Repeated addition, product calculations, scaling quantities',
  division: 'Splitting into equal parts, quotient calculations, sharing quantities',
  fractions: 'Parts of a whole, numerator and denominator, fraction operations',
  decimals: 'Decimal numbers, place value, decimal operations',
  mixed: 'Combination of addition, subtraction, multiplication, and division',
};

export async function generateQuizQuestions(
  topic: MathTopic,
  difficulty: DifficultyLevel,
  count: number
): Promise<AIQuizQuestion[]> {
  const prompt = `Generate exactly ${count} unique multiple-choice math quiz questions on ${topic}.

Topic focus: ${TOPIC_DESCRIPTIONS[topic]}
Difficulty level: ${DIFFICULTY_DESCRIPTORS[difficulty]}

Requirements:
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE option should be correct
- All incorrect options should be plausible (common mistakes students make)
- Questions should be clear and unambiguous
- Include step-by-step explanations that help students understand the concept
- Use whole numbers for answers to keep it simple
- Make questions engaging and appropriate for the difficulty level
- For word problems, use relatable scenarios (school, sports, shopping, etc.)
- Vary the question format (direct calculation, word problems, comparison)

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "questions": [
    {
      "id": "unique-id",
      "question": "Question text",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "options": [
        { "id": "A", "text": "Answer A", "isCorrect": false },
        { "id": "B", "text": "Answer B", "isCorrect": true },
        { "id": "C", "text": "Answer C", "isCorrect": false },
        { "id": "D", "text": "Answer D", "isCorrect": false }
      ],
      "correctAnswerExplanation": "Step-by-step explanation"
    }
  ]
}`;

  try {
    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        maxOutputTokens: 4000,
      },
    });

    // Extract text from response
    let jsonText = '';
    if (Array.isArray(response.candidates) && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && Array.isArray(candidate.content.parts)) {
        jsonText = candidate.content.parts
          .map((part: any) => part.text || '')
          .join('');
      }
    }

    if (!jsonText) {
      throw new Error('No response content from Gemini');
    }

    // Clean markdown code blocks if present
    jsonText = jsonText.trim();
    if (jsonText.startsWith('```')) {
      // Remove markdown code block wrapper
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    }

    const parsed = JSON.parse(jsonText);
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid response format from Gemini');
    }

    return parsed.questions as AIQuizQuestion[];
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific Gemini API errors
      if (error.message.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Google Gemini API key. Please check your configuration.');
      }
      if (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }
      if (error.message.includes('500') || error.message.includes('503')) {
        throw new Error('Gemini service error. Please try again later.');
      }
    }
    console.error('Quiz generation error:', error);
    throw error;
  }
}

// Generate quiz with progressive difficulty (easy -> medium -> hard)
export async function generateProgressiveQuiz(
  topic: MathTopic,
  totalQuestions: number = 10
): Promise<AIQuizQuestion[]> {
  const distribution = {
    easy: Math.ceil(totalQuestions * 0.3),
    medium: Math.ceil(totalQuestions * 0.4),
    hard: Math.floor(totalQuestions * 0.3),
  };

  const allQuestions: AIQuizQuestion[] = [];

  for (const [difficulty, count] of Object.entries(distribution)) {
    if (count > 0) {
      const questions = await generateQuizQuestions(
        topic,
        difficulty as DifficultyLevel,
        count
      );
      allQuestions.push(...questions);
    }
  }

  return allQuestions;
}