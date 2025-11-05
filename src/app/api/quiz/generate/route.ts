import { NextRequest, NextResponse } from 'next/server';
import { generateQuizQuestions, generateProgressiveQuiz } from '@/lib/quiz-generator';
import { DifficultyLevel, MathTopic } from '@/lib/types/quiz';

const VALID_TOPICS: MathTopic[] = ['addition', 'subtraction', 'multiplication', 'division', 'fractions', 'decimals', 'mixed'];
const VALID_DIFFICULTIES: DifficultyLevel[] = ['easy', 'medium', 'hard'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, difficulty, count, progressive } = body;

    // Validation
    if (!topic || !VALID_TOPICS.includes(topic)) {
      return NextResponse.json(
        { error: `Invalid topic. Must be one of: ${VALID_TOPICS.join(', ')}` },
        { status: 400 }
      );
    }

    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}` },
        { status: 400 }
      );
    }

    const questionCount = count || 10;
    if (typeof questionCount !== 'number' || questionCount < 1 || questionCount > 20) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 20' },
        { status: 400 }
      );
    }

    // Generate questions
    let questions;
    if (progressive) {
      questions = await generateProgressiveQuiz(topic as MathTopic, questionCount);
    } else {
      questions = await generateQuizQuestions(
        topic as MathTopic,
        (difficulty || 'medium') as DifficultyLevel,
        questionCount
      );
    }

    const response = {
      questions,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Quiz generation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment and try again.' },
          { status: 429 }
        );
      }
      if (error.message.includes('Invalid') || error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'API configuration error. Please contact support.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate quiz questions. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    endpoint: '/api/quiz/generate',
    validTopics: VALID_TOPICS,
    validDifficulties: VALID_DIFFICULTIES,
  });
}
