import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { quizAttempts, quizQuestions, user } from '@/backend/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCurrentUser } from '@/backend/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authenticatedUser = await getCurrentUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch quiz attempts with joined question details, scoped to authenticated user
    const attempts = await db
      .select({
        id: quizAttempts.id,
        userId: quizAttempts.userId,
        quizQuestionId: quizAttempts.quizQuestionId,
        userAnswer: quizAttempts.userAnswer,
        isCorrect: quizAttempts.isCorrect,
        timeTaken: quizAttempts.timeTaken,
        createdAt: quizAttempts.createdAt,
        question: {
          id: quizQuestions.id,
          question: quizQuestions.question,
          options: quizQuestions.options,
          correctAnswer: quizQuestions.correctAnswer,
          explanation: quizQuestions.explanation,
          topic: quizQuestions.topic,
          difficulty: quizQuestions.difficulty,
        }
      })
      .from(quizAttempts)
      .leftJoin(quizQuestions, eq(quizAttempts.quizQuestionId, quizQuestions.id))
      .where(eq(quizAttempts.userId, authenticatedUser.id))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(attempts, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authenticatedUser = await getCurrentUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { quizQuestionId, userAnswer, timeTaken } = body;

    // Validate required fields
    if (quizQuestionId === undefined || quizQuestionId === null) {
      return NextResponse.json({ 
        error: "quizQuestionId is required",
        code: "MISSING_QUIZ_QUESTION_ID" 
      }, { status: 400 });
    }

    if (userAnswer === undefined || userAnswer === null) {
      return NextResponse.json({ 
        error: "userAnswer is required",
        code: "MISSING_USER_ANSWER" 
      }, { status: 400 });
    }

    if (timeTaken === undefined || timeTaken === null) {
      return NextResponse.json({ 
        error: "timeTaken is required",
        code: "MISSING_TIME_TAKEN" 
      }, { status: 400 });
    }

    // Validate userAnswer is 0-3
    const userAnswerInt = parseInt(userAnswer);
    if (isNaN(userAnswerInt) || userAnswerInt < 0 || userAnswerInt > 3) {
      return NextResponse.json({ 
        error: "userAnswer must be an integer between 0 and 3",
        code: "INVALID_USER_ANSWER" 
      }, { status: 400 });
    }

    // Validate timeTaken is positive integer
    const timeTakenInt = parseInt(timeTaken);
    if (isNaN(timeTakenInt) || timeTakenInt < 0) {
      return NextResponse.json({ 
        error: "timeTaken must be a positive integer",
        code: "INVALID_TIME_TAKEN" 
      }, { status: 400 });
    }

    // Validate quizQuestionId is valid integer
    const quizQuestionIdInt = parseInt(quizQuestionId);
    if (isNaN(quizQuestionIdInt)) {
      return NextResponse.json({ 
        error: "quizQuestionId must be a valid integer",
        code: "INVALID_QUIZ_QUESTION_ID" 
      }, { status: 400 });
    }

    // Verify user exists (authenticated user is already verified by getCurrentUser)
    const userExists = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, authenticatedUser.id))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json({ 
        error: "User not found",
        code: "USER_NOT_FOUND" 
      }, { status: 404 });
    }

    // Fetch quiz question to get correctAnswer
    const question = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, quizQuestionIdInt))
      .limit(1);

    if (question.length === 0) {
      return NextResponse.json({ 
        error: "Quiz question not found",
        code: "QUIZ_QUESTION_NOT_FOUND" 
      }, { status: 404 });
    }

    // Calculate isCorrect
    const isCorrect = userAnswerInt === question[0].correctAnswer;

    // Insert quiz attempt with userId from session
    const newAttempt = await db
      .insert(quizAttempts)
      .values({
        userId: authenticatedUser.id,
        quizQuestionId: quizQuestionIdInt,
        userAnswer: userAnswerInt,
        isCorrect: isCorrect,
        timeTaken: timeTakenInt,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newAttempt[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}