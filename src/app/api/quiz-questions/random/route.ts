import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { quizQuestions } from '@/backend/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate count parameter
    const countParam = searchParams.get('count');
    const count = countParam ? parseInt(countParam) : 5;
    
    if (isNaN(count) || count < 1 || count > 20) {
      return NextResponse.json(
        { 
          error: 'Count must be between 1 and 20',
          code: 'INVALID_COUNT'
        },
        { status: 400 }
      );
    }

    // Parse optional filter parameters
    const topic = searchParams.get('topic');
    const difficulty = searchParams.get('difficulty');

    // Build query with filters
    let query = db.select().from(quizQuestions);

    // Apply filters if provided
    const conditions = [];
    if (topic) {
      conditions.push(eq(quizQuestions.topic, topic));
    }
    if (difficulty) {
      conditions.push(eq(quizQuestions.difficulty, difficulty));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply random ordering and limit
    const randomQuestions = await query
      .orderBy(sql`RANDOM()`)
      .limit(count);

    return NextResponse.json(randomQuestions, { status: 200 });

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