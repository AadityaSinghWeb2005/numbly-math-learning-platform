import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { userProgress, lessons, user } from '@/backend/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/backend/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch user's progress with lesson details, scoped to authenticated user
    const progressRecords = await db
      .select({
        id: userProgress.id,
        userId: userProgress.userId,
        lessonId: userProgress.lessonId,
        progress: userProgress.progress,
        completed: userProgress.completed,
        lastAccessed: userProgress.lastAccessed,
        createdAt: userProgress.createdAt,
        updatedAt: userProgress.updatedAt,
        lesson: {
          id: lessons.id,
          title: lessons.title,
          description: lessons.description,
          duration: lessons.duration,
          difficulty: lessons.difficulty,
          orderIndex: lessons.orderIndex,
        },
      })
      .from(userProgress)
      .innerJoin(lessons, eq(userProgress.lessonId, lessons.id))
      .where(eq(userProgress.userId, currentUser.id))
      .orderBy(lessons.orderIndex)
      .limit(limit)
      .offset(offset);

    return NextResponse.json(progressRecords, { status: 200 });
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
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json(
        {
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    const { lessonId, progress: providedProgress, completed: providedCompleted } = body;

    // Validate required fields
    if (!lessonId) {
      return NextResponse.json(
        {
          error: 'Lesson ID is required',
          code: 'MISSING_LESSON_ID',
        },
        { status: 400 }
      );
    }

    // Validate lessonId is valid integer
    if (isNaN(parseInt(lessonId))) {
      return NextResponse.json(
        {
          error: 'Valid lesson ID is required',
          code: 'INVALID_LESSON_ID',
        },
        { status: 400 }
      );
    }

    const parsedLessonId = parseInt(lessonId);

    // Validate progress is between 0-100 if provided
    let progress = providedProgress !== undefined ? parseInt(providedProgress) : 0;
    if (isNaN(progress) || progress < 0 || progress > 100) {
      return NextResponse.json(
        {
          error: 'Progress must be between 0 and 100',
          code: 'INVALID_PROGRESS',
        },
        { status: 400 }
      );
    }

    // Validate lesson exists
    const lessonExists = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, parsedLessonId))
      .limit(1);

    if (lessonExists.length === 0) {
      return NextResponse.json(
        {
          error: 'Lesson not found',
          code: 'LESSON_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Auto-complete if progress >= 100
    let completed = providedCompleted !== undefined ? Boolean(providedCompleted) : false;
    if (progress >= 100) {
      completed = true;
    }

    const now = new Date().toISOString();

    // Check if progress record exists for this user + lesson
    const existingProgress = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, currentUser.id),
          eq(userProgress.lessonId, parsedLessonId)
        )
      )
      .limit(1);

    if (existingProgress.length > 0) {
      // UPDATE existing record
      const updated = await db
        .update(userProgress)
        .set({
          progress,
          completed,
          lastAccessed: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(userProgress.userId, currentUser.id),
            eq(userProgress.lessonId, parsedLessonId)
          )
        )
        .returning();

      if (updated.length === 0) {
        return NextResponse.json(
          {
            error: 'Failed to update progress',
            code: 'UPDATE_FAILED',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(updated[0], { status: 200 });
    } else {
      // INSERT new record
      const newProgress = await db
        .insert(userProgress)
        .values({
          userId: currentUser.id,
          lessonId: parsedLessonId,
          progress,
          completed,
          lastAccessed: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (newProgress.length === 0) {
        return NextResponse.json(
          {
            error: 'Failed to create progress',
            code: 'CREATE_FAILED',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(newProgress[0], { status: 200 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}