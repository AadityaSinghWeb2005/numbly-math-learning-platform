import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { quizQuestions } from '@/backend/db/schema';
import { eq, like, or, and } from 'drizzle-orm';

const VALID_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single record by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const question = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.id, parseInt(id)))
        .limit(1);

      if (question.length === 0) {
        return NextResponse.json(
          { error: 'Quiz question not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(question[0], { status: 200 });
    }

    // List with pagination, search, and filters
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const topic = searchParams.get('topic');
    const difficulty = searchParams.get('difficulty');

    let query = db.select().from(quizQuestions);

    const conditions = [];

    // Search in question text
    if (search) {
      conditions.push(like(quizQuestions.question, `%${search}%`));
    }

    // Filter by topic
    if (topic) {
      conditions.push(eq(quizQuestions.topic, topic));
    }

    // Filter by difficulty
    if (difficulty) {
      conditions.push(eq(quizQuestions.difficulty, difficulty));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, options, correctAnswer, explanation, topic, difficulty } = body;

    // Validate required fields
    if (!question || question.trim() === '') {
      return NextResponse.json(
        { error: 'Question is required and cannot be empty', code: 'MISSING_QUESTION' },
        { status: 400 }
      );
    }

    if (!options || !Array.isArray(options)) {
      return NextResponse.json(
        { error: 'Options must be an array', code: 'INVALID_OPTIONS_FORMAT' },
        { status: 400 }
      );
    }

    if (options.length !== 4) {
      return NextResponse.json(
        { error: 'Options must contain exactly 4 strings', code: 'INVALID_OPTIONS_LENGTH' },
        { status: 400 }
      );
    }

    if (!options.every((opt) => typeof opt === 'string' && opt.trim() !== '')) {
      return NextResponse.json(
        { error: 'All options must be non-empty strings', code: 'INVALID_OPTIONS_CONTENT' },
        { status: 400 }
      );
    }

    if (correctAnswer === undefined || correctAnswer === null || 
        typeof correctAnswer !== 'number' || 
        !Number.isInteger(correctAnswer) || 
        correctAnswer < 0 || correctAnswer > 3) {
      return NextResponse.json(
        { error: 'Correct answer must be an integer between 0 and 3', code: 'INVALID_CORRECT_ANSWER' },
        { status: 400 }
      );
    }

    if (!explanation || explanation.trim() === '') {
      return NextResponse.json(
        { error: 'Explanation is required and cannot be empty', code: 'MISSING_EXPLANATION' },
        { status: 400 }
      );
    }

    if (!topic || topic.trim() === '') {
      return NextResponse.json(
        { error: 'Topic is required and cannot be empty', code: 'MISSING_TOPIC' },
        { status: 400 }
      );
    }

    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json(
        { 
          error: `Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`, 
          code: 'INVALID_DIFFICULTY' 
        },
        { status: 400 }
      );
    }

    const newQuestion = await db
      .insert(quizQuestions)
      .values({
        question: question.trim(),
        options: JSON.stringify(options),
        correctAnswer,
        explanation: explanation.trim(),
        topic: topic.trim(),
        difficulty,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newQuestion[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { question, options, correctAnswer, explanation, topic, difficulty } = body;

    // Check if record exists
    const existing = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Quiz question not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updates: any = {};

    // Validate and add question if provided
    if (question !== undefined) {
      if (question.trim() === '') {
        return NextResponse.json(
          { error: 'Question cannot be empty', code: 'INVALID_QUESTION' },
          { status: 400 }
        );
      }
      updates.question = question.trim();
    }

    // Validate and add options if provided
    if (options !== undefined) {
      if (!Array.isArray(options)) {
        return NextResponse.json(
          { error: 'Options must be an array', code: 'INVALID_OPTIONS_FORMAT' },
          { status: 400 }
        );
      }

      if (options.length !== 4) {
        return NextResponse.json(
          { error: 'Options must contain exactly 4 strings', code: 'INVALID_OPTIONS_LENGTH' },
          { status: 400 }
        );
      }

      if (!options.every((opt) => typeof opt === 'string' && opt.trim() !== '')) {
        return NextResponse.json(
          { error: 'All options must be non-empty strings', code: 'INVALID_OPTIONS_CONTENT' },
          { status: 400 }
        );
      }

      updates.options = JSON.stringify(options);
    }

    // Validate and add correctAnswer if provided
    if (correctAnswer !== undefined) {
      if (typeof correctAnswer !== 'number' || 
          !Number.isInteger(correctAnswer) || 
          correctAnswer < 0 || correctAnswer > 3) {
        return NextResponse.json(
          { error: 'Correct answer must be an integer between 0 and 3', code: 'INVALID_CORRECT_ANSWER' },
          { status: 400 }
        );
      }
      updates.correctAnswer = correctAnswer;
    }

    // Validate and add explanation if provided
    if (explanation !== undefined) {
      if (explanation.trim() === '') {
        return NextResponse.json(
          { error: 'Explanation cannot be empty', code: 'INVALID_EXPLANATION' },
          { status: 400 }
        );
      }
      updates.explanation = explanation.trim();
    }

    // Validate and add topic if provided
    if (topic !== undefined) {
      if (topic.trim() === '') {
        return NextResponse.json(
          { error: 'Topic cannot be empty', code: 'INVALID_TOPIC' },
          { status: 400 }
        );
      }
      updates.topic = topic.trim();
    }

    // Validate and add difficulty if provided
    if (difficulty !== undefined) {
      if (!VALID_DIFFICULTIES.includes(difficulty)) {
        return NextResponse.json(
          { 
            error: `Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`, 
            code: 'INVALID_DIFFICULTY' 
          },
          { status: 400 }
        );
      }
      updates.difficulty = difficulty;
    }

    // If no updates provided
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existing[0], { status: 200 });
    }

    const updated = await db
      .update(quizQuestions)
      .set(updates)
      .where(eq(quizQuestions.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Quiz question not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(quizQuestions)
      .where(eq(quizQuestions.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Quiz question deleted successfully',
        deleted: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}