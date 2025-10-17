import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/backend/db';
import { userProgress, lessons, user } from '@/backend/db/schema';
import { eq, and, desc, sql, count, avg } from 'drizzle-orm';
import { getCurrentUser } from '@/backend/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authenticatedUser = await getCurrentUser(request);
    if (!authenticatedUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    // Validate that the user exists
    const userExists = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get total lessons count
    const totalLessonsResult = await db
      .select({ count: count() })
      .from(lessons);
    const totalLessons = totalLessonsResult[0].count;

    // Get user progress data
    const userProgressData = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));

    // Calculate completed lessons
    const completedLessons = userProgressData.filter(
      (progress) => progress.completed
    ).length;

    // Calculate in-progress lessons
    const inProgressLessons = userProgressData.filter(
      (progress) => progress.progress > 0 && !progress.completed
    ).length;

    // Calculate not started lessons
    const notStartedLessons = totalLessons - (completedLessons + inProgressLessons);

    // Calculate average progress
    let averageProgress = 0;
    if (userProgressData.length > 0) {
      const totalProgress = userProgressData.reduce(
        (sum, progress) => sum + progress.progress,
        0
      );
      averageProgress = Math.round(totalProgress / userProgressData.length);
    }

    // Calculate overall completion rate
    const overallCompletionRate = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

    // Get last accessed lesson with details
    let lastAccessedLesson = null;
    if (userProgressData.length > 0) {
      const sortedProgress = [...userProgressData].sort((a, b) => {
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
      });

      const lastProgress = sortedProgress[0];
      const lessonDetails = await db
        .select()
        .from(lessons)
        .where(eq(lessons.id, lastProgress.lessonId))
        .limit(1);

      if (lessonDetails.length > 0) {
        lastAccessedLesson = {
          ...lessonDetails[0],
          progress: lastProgress.progress,
          completed: lastProgress.completed,
          lastAccessed: lastProgress.lastAccessed,
        };
      }
    }

    // Get all lessons for difficulty breakdown
    const allLessons = await db.select().from(lessons);

    // Calculate progress by difficulty
    const progressByDifficulty: Record<string, {
      total: number;
      completed: number;
      inProgress: number;
      notStarted: number;
      completionRate: number;
    }> = {};

    // Initialize difficulty categories
    const difficulties = [...new Set(allLessons.map(lesson => lesson.difficulty))];
    difficulties.forEach(difficulty => {
      progressByDifficulty[difficulty] = {
        total: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        completionRate: 0,
      };
    });

    // Count lessons by difficulty
    allLessons.forEach(lesson => {
      if (progressByDifficulty[lesson.difficulty]) {
        progressByDifficulty[lesson.difficulty].total++;
      }
    });

    // Count progress status by difficulty
    userProgressData.forEach(progress => {
      const lesson = allLessons.find(l => l.id === progress.lessonId);
      if (lesson && progressByDifficulty[lesson.difficulty]) {
        if (progress.completed) {
          progressByDifficulty[lesson.difficulty].completed++;
        } else if (progress.progress > 0) {
          progressByDifficulty[lesson.difficulty].inProgress++;
        }
      }
    });

    // Calculate not started and completion rates
    Object.keys(progressByDifficulty).forEach(difficulty => {
      const stats = progressByDifficulty[difficulty];
      stats.notStarted = stats.total - (stats.completed + stats.inProgress);
      stats.completionRate = stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 0;
    });

    const statistics = {
      totalLessons,
      completedLessons,
      inProgressLessons,
      notStartedLessons,
      averageProgress,
      overallCompletionRate,
      lastAccessedLesson,
      progressByDifficulty,
    };

    return NextResponse.json(statistics, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}