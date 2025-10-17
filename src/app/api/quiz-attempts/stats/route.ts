import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { quizAttempts, quizQuestions, user } from '@/backend/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { 
          error: 'userId query parameter is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    // Validate user exists
    const userExists = await db.select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Get all attempts for the user with question details
    const attempts = await db.select({
      id: quizAttempts.id,
      userId: quizAttempts.userId,
      quizQuestionId: quizAttempts.quizQuestionId,
      userAnswer: quizAttempts.userAnswer,
      isCorrect: quizAttempts.isCorrect,
      timeTaken: quizAttempts.timeTaken,
      createdAt: quizAttempts.createdAt,
      question: quizQuestions.question,
      options: quizQuestions.options,
      correctAnswer: quizQuestions.correctAnswer,
      explanation: quizQuestions.explanation,
      topic: quizQuestions.topic,
      difficulty: quizQuestions.difficulty
    })
    .from(quizAttempts)
    .leftJoin(quizQuestions, eq(quizAttempts.quizQuestionId, quizQuestions.id))
    .where(eq(quizAttempts.userId, userId))
    .orderBy(desc(quizAttempts.createdAt));

    // Handle case where user has no attempts
    if (attempts.length === 0) {
      return NextResponse.json({
        totalAttempts: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracyRate: 0,
        averageTimeTaken: 0,
        totalTimePracticing: 0,
        statsByTopic: [],
        statsByDifficulty: [],
        recentAttempts: [],
        perfectScoreStreak: 0
      }, { status: 200 });
    }

    // Calculate basic statistics
    const totalAttempts = attempts.length;
    const correctAnswers = attempts.filter(a => a.isCorrect).length;
    const incorrectAnswers = totalAttempts - correctAnswers;
    const accuracyRate = (correctAnswers / totalAttempts) * 100;
    const totalTimePracticing = attempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0);
    const averageTimeTaken = totalTimePracticing / totalAttempts;

    // Calculate statistics by topic
    const topicStats = new Map<string, { attempts: number; correct: number }>();
    attempts.forEach(attempt => {
      const topic = attempt.topic || 'Unknown';
      if (!topicStats.has(topic)) {
        topicStats.set(topic, { attempts: 0, correct: 0 });
      }
      const stats = topicStats.get(topic)!;
      stats.attempts++;
      if (attempt.isCorrect) {
        stats.correct++;
      }
    });

    const statsByTopic = Array.from(topicStats.entries()).map(([topic, stats]) => ({
      topic,
      attempts: stats.attempts,
      correct: stats.correct,
      accuracy: (stats.correct / stats.attempts) * 100
    }));

    // Calculate statistics by difficulty
    const difficultyStats = new Map<string, { attempts: number; correct: number }>();
    attempts.forEach(attempt => {
      const difficulty = attempt.difficulty || 'Unknown';
      if (!difficultyStats.has(difficulty)) {
        difficultyStats.set(difficulty, { attempts: 0, correct: 0 });
      }
      const stats = difficultyStats.get(difficulty)!;
      stats.attempts++;
      if (attempt.isCorrect) {
        stats.correct++;
      }
    });

    const statsByDifficulty = Array.from(difficultyStats.entries()).map(([difficulty, stats]) => ({
      difficulty,
      attempts: stats.attempts,
      correct: stats.correct,
      accuracy: (stats.correct / stats.attempts) * 100
    }));

    // Get recent attempts (last 10)
    const recentAttempts = attempts.slice(0, 10).map(attempt => ({
      id: attempt.id,
      quizQuestionId: attempt.quizQuestionId,
      question: attempt.question,
      options: attempt.options,
      userAnswer: attempt.userAnswer,
      correctAnswer: attempt.correctAnswer,
      isCorrect: attempt.isCorrect,
      timeTaken: attempt.timeTaken,
      explanation: attempt.explanation,
      topic: attempt.topic,
      difficulty: attempt.difficulty,
      createdAt: attempt.createdAt
    }));

    // Calculate perfect score streak (consecutive correct answers from most recent)
    let perfectScoreStreak = 0;
    for (const attempt of attempts) {
      if (attempt.isCorrect) {
        perfectScoreStreak++;
      } else {
        break;
      }
    }

    return NextResponse.json({
      totalAttempts,
      correctAnswers,
      incorrectAnswers,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      averageTimeTaken: Math.round(averageTimeTaken * 100) / 100,
      totalTimePracticing,
      statsByTopic,
      statsByDifficulty,
      recentAttempts,
      perfectScoreStreak
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + error,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}