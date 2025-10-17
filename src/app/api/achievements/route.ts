import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { achievements, user } from '@/backend/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { 
          error: 'userId query parameter is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    const userAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.earnedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(userAchievements, { status: 200 });
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
    const { userId, achievementType, achievementName, achievementDescription } = body;

    if (!userId) {
      return NextResponse.json(
        { 
          error: 'userId is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    if (!achievementType) {
      return NextResponse.json(
        { 
          error: 'achievementType is required',
          code: 'MISSING_ACHIEVEMENT_TYPE'
        },
        { status: 400 }
      );
    }

    if (!achievementName) {
      return NextResponse.json(
        { 
          error: 'achievementName is required',
          code: 'MISSING_ACHIEVEMENT_NAME'
        },
        { status: 400 }
      );
    }

    if (!achievementDescription) {
      return NextResponse.json(
        { 
          error: 'achievementDescription is required',
          code: 'MISSING_ACHIEVEMENT_DESCRIPTION'
        },
        { status: 400 }
      );
    }

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const existingAchievement = await db
      .select()
      .from(achievements)
      .where(
        and(
          eq(achievements.userId, userId),
          eq(achievements.achievementType, achievementType)
        )
      )
      .limit(1);

    if (existingAchievement.length > 0) {
      return NextResponse.json(
        { 
          error: 'Achievement already exists for this user',
          code: 'DUPLICATE_ACHIEVEMENT'
        },
        { status: 409 }
      );
    }

    const newAchievement = await db
      .insert(achievements)
      .values({
        userId,
        achievementType,
        achievementName,
        achievementDescription,
        earnedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newAchievement[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}