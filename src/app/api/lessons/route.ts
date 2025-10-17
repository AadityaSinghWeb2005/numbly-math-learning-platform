import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { lessons } from '@/backend/db/schema';
import { eq, like, or, asc, and } from 'drizzle-orm';

const VALID_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single lesson by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const lesson = await db
        .select()
        .from(lessons)
        .where(eq(lessons.id, parseInt(id)))
        .limit(1);

      if (lesson.length === 0) {
        return NextResponse.json(
          { error: 'Lesson not found', code: 'LESSON_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(lesson[0], { status: 200 });
    }

    // List all lessons with pagination, search, and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const difficulty = searchParams.get('difficulty');

    let query = db.select().from(lessons);

    // Build conditions array
    const conditions = [];

    // Search condition
    if (search) {
      conditions.push(
        or(
          like(lessons.title, `%${search}%`),
          like(lessons.description, `%${search}%`)
        )
      );
    }

    // Difficulty filter
    if (difficulty) {
      if (!VALID_DIFFICULTIES.includes(difficulty)) {
        return NextResponse.json(
          { 
            error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
            code: 'INVALID_DIFFICULTY'
          },
          { status: 400 }
        );
      }
      conditions.push(eq(lessons.difficulty, difficulty));
    }

    // Apply conditions if any exist
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    // Apply ordering, limit, and offset
    const results = await query
      .orderBy(asc(lessons.orderIndex))
      .limit(limit)
      .offset(offset);

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
    const { title, description, duration, difficulty, orderIndex } = body;

    // Validate required fields
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required and cannot be empty', code: 'MISSING_TITLE' },
        { status: 400 }
      );
    }

    if (!duration) {
      return NextResponse.json(
        { error: 'Duration is required', code: 'MISSING_DURATION' },
        { status: 400 }
      );
    }

    if (!difficulty) {
      return NextResponse.json(
        { error: 'Difficulty is required', code: 'MISSING_DIFFICULTY' },
        { status: 400 }
      );
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json(
        { 
          error: `Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
          code: 'INVALID_DIFFICULTY'
        },
        { status: 400 }
      );
    }

    if (orderIndex === undefined || orderIndex === null) {
      return NextResponse.json(
        { error: 'Order index is required', code: 'MISSING_ORDER_INDEX' },
        { status: 400 }
      );
    }

    if (typeof orderIndex !== 'number' || isNaN(orderIndex)) {
      return NextResponse.json(
        { error: 'Order index must be a valid number', code: 'INVALID_ORDER_INDEX' },
        { status: 400 }
      );
    }

    // Insert new lesson
    const newLesson = await db
      .insert(lessons)
      .values({
        title: title.trim(),
        description: description ? description.trim() : null,
        duration: duration.trim(),
        difficulty,
        orderIndex,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newLesson[0], { status: 201 });
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

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if lesson exists
    const existingLesson = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, parseInt(id)))
      .limit(1);

    if (existingLesson.length === 0) {
      return NextResponse.json(
        { error: 'Lesson not found', code: 'LESSON_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, duration, difficulty, orderIndex } = body;

    // Validate title if provided
    if (title !== undefined && (!title || title.trim() === '')) {
      return NextResponse.json(
        { error: 'Title cannot be empty', code: 'INVALID_TITLE' },
        { status: 400 }
      );
    }

    // Validate difficulty if provided
    if (difficulty !== undefined && !VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json(
        { 
          error: `Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
          code: 'INVALID_DIFFICULTY'
        },
        { status: 400 }
      );
    }

    // Validate orderIndex if provided
    if (orderIndex !== undefined && (typeof orderIndex !== 'number' || isNaN(orderIndex))) {
      return NextResponse.json(
        { error: 'Order index must be a valid number', code: 'INVALID_ORDER_INDEX' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (duration !== undefined) updates.duration = duration.trim();
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (orderIndex !== undefined) updates.orderIndex = orderIndex;

    // Update lesson
    const updatedLesson = await db
      .update(lessons)
      .set(updates)
      .where(eq(lessons.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedLesson[0], { status: 200 });
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

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if lesson exists
    const existingLesson = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, parseInt(id)))
      .limit(1);

    if (existingLesson.length === 0) {
      return NextResponse.json(
        { error: 'Lesson not found', code: 'LESSON_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete lesson
    const deletedLesson = await db
      .delete(lessons)
      .where(eq(lessons.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Lesson deleted successfully',
        lesson: deletedLesson[0],
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