import OpenAI from 'openai';
import client from './openai-client';
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
  const schema: Record<string, unknown> = {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the question',
            },
            question: {
              type: 'string',
              description: 'The full text of the math question',
            },
            topic: {
              type: 'string',
              enum: ['addition', 'subtraction', 'multiplication', 'division', 'fractions', 'decimals', 'mixed'],
            },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard'],
            },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Option identifier (A, B, C, D)',
                  },
                  text: {
                    type: 'string',
                    description: 'The option text (numeric answer)',
                  },
                  isCorrect: {
                    type: 'boolean',
                    description: 'Whether this is the correct answer',
                  },
                },
                required: ['id', 'text', 'isCorrect'],
                additionalProperties: false,
              },
              minItems: 4,
              maxItems: 4,
            },
            correctAnswerExplanation: {
              type: 'string',
              description: 'Step-by-step explanation of how to solve the problem',
            },
          },
          required: [
            'id',
            'question',
            'topic',
            'difficulty',
            'options',
            'correctAnswerExplanation',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['questions'],
    additionalProperties: false,
  };

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
- Vary the question format (direct calculation, word problems, comparison)`;

  try {
    const response = await client.beta.chat.completions.parse({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: 'You are an expert math teacher creating educational quiz questions for students learning mathematics.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'quiz_questions',
          schema,
          strict: true,
        },
      },
      temperature: 0.8,
      max_tokens: 4000,
    });

    const parsed = response.choices[0].message.parsed;
    if (!parsed) {
      throw new Error('No parsed response from OpenAI');
    }

    return parsed.questions as AIQuizQuestion[];
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      }
      if (error.status === 500) {
        throw new Error('OpenAI service error. Please try again later.');
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
