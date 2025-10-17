"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Target, 
  Trophy, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  Flame,
  Star,
  Award,
  ArrowRight
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserStats {
  totalLessons: number;
  completedLessons: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  currentStreak: number;
  totalPoints: number;
  level: number;
}

interface Activity {
  id: number;
  type: "lesson" | "quiz";
  title: string;
  date: string;
  score: number;
  completed: boolean;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
}

interface SkillProgress {
  skill: string;
  progress: number;
  color: string;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({
    totalLessons: 0,
    completedLessons: 0,
    totalQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    currentStreak: 0,
    totalPoints: 0,
    level: 1,
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [skillProgress, setSkillProgress] = useState<SkillProgress[]>([]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("bearer_token");
      const userId = session?.user?.id;

      // Fetch user progress stats
      const progressStatsRes = await fetch(`/api/user-progress/stats?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const progressStats = await progressStatsRes.json();

      // Fetch quiz attempt stats
      const quizStatsRes = await fetch(`/api/quiz-attempts/stats?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const quizStats = await quizStatsRes.json();

      // Fetch all lessons to get total count
      const lessonsRes = await fetch("/api/lessons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lessons = await lessonsRes.json();

      // Fetch user progress
      const userProgressRes = await fetch(`/api/user-progress?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userProgress = await userProgressRes.json();

      // Fetch recent quiz attempts
      const quizAttemptsRes = await fetch(`/api/quiz-attempts?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const quizAttempts = await quizAttemptsRes.json();

      // Fetch achievements
      const achievementsRes = await fetch(`/api/achievements?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userAchievements = await achievementsRes.json();

      // Calculate statistics
      const completedLessons = userProgress.filter((p: any) => p.completed).length;
      const totalLessons = lessons.length;
      const completedQuizzes = quizAttempts.length;
      const totalQuizzes = 15; // From seed data
      
      const averageScore = quizStats?.averageScore || 0;
      const totalPoints = (completedLessons * 100) + Math.round(averageScore * completedQuizzes);
      const level = Math.floor(totalPoints / 500) + 1;
      
      // Calculate streak (simplified - based on recent activity)
      const currentStreak = calculateStreak(userProgress, quizAttempts);

      setUserStats({
        totalLessons,
        completedLessons,
        totalQuizzes,
        completedQuizzes,
        averageScore: Math.round(averageScore),
        currentStreak,
        totalPoints,
        level,
      });

      // Build recent activity
      const activity: Activity[] = [];
      
      // Add completed lessons
      userProgress
        .filter((p: any) => p.completed)
        .slice(0, 2)
        .forEach((p: any) => {
          const lesson = lessons.find((l: any) => l.id === p.lessonId);
          if (lesson) {
            activity.push({
              id: p.id,
              type: "lesson",
              title: lesson.title,
              date: formatDate(p.completedAt),
              score: 100,
              completed: true,
            });
          }
        });

      // Add recent quiz attempts
      quizAttempts.slice(0, 2).forEach((q: any) => {
        activity.push({
          id: q.id,
          type: "quiz",
          title: "Practice Quiz",
          date: formatDate(q.completedAt),
          score: q.score,
          completed: true,
        });
      });

      // Sort by most recent
      activity.sort((a, b) => {
        const dateA = parseFormattedDate(a.date);
        const dateB = parseFormattedDate(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      setRecentActivity(activity.slice(0, 4));

      // Calculate skill progress
      const skillProgressData = calculateSkillProgress(lessons, userProgress);
      setSkillProgress(skillProgressData);

      // Process achievements
      const achievementsData = processAchievements(
        completedLessons,
        completedQuizzes,
        currentStreak,
        quizAttempts,
        userAchievements
      );
      setAchievements(achievementsData);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  const calculateStreak = (userProgress: any[], quizAttempts: any[]) => {
    // Combine all activity dates
    const activityDates = [
      ...userProgress.filter(p => p.completedAt).map(p => new Date(p.completedAt)),
      ...quizAttempts.filter(q => q.completedAt).map(q => new Date(q.completedAt)),
    ].sort((a, b) => b.getTime() - a.getTime());

    if (activityDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < activityDates.length; i++) {
      const activityDate = new Date(activityDates[i]);
      activityDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  const parseFormattedDate = (formattedDate: string) => {
    // This is a simplified parser for the formatted dates
    if (formattedDate === "Just now") return new Date();
    if (formattedDate.includes("hours ago")) {
      const hours = parseInt(formattedDate);
      return new Date(Date.now() - hours * 60 * 60 * 1000);
    }
    if (formattedDate.includes("day")) {
      const days = parseInt(formattedDate);
      return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }
    return new Date();
  };

  const calculateSkillProgress = (lessons: any[], userProgress: any[]) => {
    const skills = [
      { skill: "Addition", category: "addition", color: "bg-blue-500" },
      { skill: "Subtraction", category: "subtraction", color: "bg-green-500" },
      { skill: "Multiplication", category: "multiplication", color: "bg-purple-500" },
      { skill: "Division", category: "division", color: "bg-orange-500" },
    ];

    return skills.map(({ skill, category, color }) => {
      const categoryLessons = lessons.filter((l: any) => 
        l.title.toLowerCase().includes(category)
      );
      const completedCategoryLessons = categoryLessons.filter((l: any) =>
        userProgress.some((p: any) => p.lessonId === l.id && p.completed)
      );
      
      const progress = categoryLessons.length > 0 
        ? Math.round((completedCategoryLessons.length / categoryLessons.length) * 100)
        : 0;

      return { skill, progress, color };
    });
  };

  const processAchievements = (
    completedLessons: number,
    completedQuizzes: number,
    currentStreak: number,
    quizAttempts: any[],
    userAchievements: any[]
  ) => {
    const hasPerfectScore = quizAttempts.some((q: any) => q.score === 100);
    
    return [
      {
        id: 1,
        title: "First Steps",
        description: "Complete your first lesson",
        icon: "🎯",
        earned: completedLessons >= 1,
      },
      {
        id: 2,
        title: "Quick Learner",
        description: "Complete 5 lessons",
        icon: "⚡",
        earned: completedLessons >= 5,
      },
      {
        id: 3,
        title: "Perfect Score",
        description: "Get 100% on a quiz",
        icon: "💯",
        earned: hasPerfectScore,
      },
      {
        id: 4,
        title: "Streak Master",
        description: "Maintain a 7-day streak",
        icon: "🔥",
        earned: currentStreak >= 7,
      },
      {
        id: 5,
        title: "Math Wizard",
        description: "Complete all lessons",
        icon: "🧙",
        earned: completedLessons >= 6,
      },
      {
        id: 6,
        title: "Practice Pro",
        description: "Complete 20 quizzes",
        icon: "🏆",
        earned: completedQuizzes >= 20,
      },
    ];
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 py-12 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your dashboard...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const overallProgress = userStats.totalLessons > 0 
    ? (userStats.completedLessons / userStats.totalLessons) * 100 
    : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 py-12 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Your Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Track your progress and continue your math journey
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalPoints}</div>
                <p className="text-xs text-muted-foreground">
                  Level {userStats.level}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userStats.completedLessons}/{userStats.totalLessons}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(overallProgress)}% complete
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userStats.averageScore > 0 ? `${userStats.averageScore}%` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {userStats.completedQuizzes > 0 
                    ? `Across ${userStats.completedQuizzes} quizzes` 
                    : "No quizzes yet"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.currentStreak} days</div>
                <p className="text-xs text-muted-foreground">
                  {userStats.currentStreak > 0 ? "Keep it up! 🔥" : "Start today! 💪"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overall Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Learning Progress</CardTitle>
                  <CardDescription>Your overall journey through the math curriculum</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Overall Completion</span>
                        <span className="text-sm font-medium">{Math.round(overallProgress)}%</span>
                      </div>
                      <Progress value={overallProgress} className="h-3" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold">Lessons</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {userStats.completedLessons} / {userStats.totalLessons}
                        </div>
                      </div>

                      <div className="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <span className="font-semibold">Quizzes</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                          {userStats.completedQuizzes} / {userStats.totalQuizzes}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Skills Mastery</CardTitle>
                  <CardDescription>Your proficiency in different math topics</CardDescription>
                </CardHeader>
                <CardContent>
                  {skillProgress.length > 0 ? (
                    <div className="space-y-4">
                      {skillProgress.map((skill) => (
                        <div key={skill.skill}>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">{skill.skill}</span>
                            <span className="text-sm text-muted-foreground">{skill.progress}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${skill.color} transition-all`}
                              style={{ width: `${skill.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Start completing lessons to see your skill progress!
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest learning sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              activity.type === "lesson" 
                                ? "bg-blue-100 dark:bg-blue-900/20" 
                                : "bg-purple-100 dark:bg-purple-900/20"
                            }`}>
                              {activity.type === "lesson" ? (
                                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{activity.title}</p>
                              <p className="text-sm text-muted-foreground">{activity.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={activity.score >= 80 ? "default" : "secondary"}>
                              {activity.score}%
                            </Badge>
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        No activity yet. Start learning to see your progress here!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" asChild>
                    <Link href="/lessons">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Continue Learning
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/practice">
                      <Target className="h-4 w-4 mr-2" />
                      Take a Quiz
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle>Achievements</CardTitle>
                  <CardDescription>
                    {achievements.filter(a => a.earned).length} of {achievements.length} earned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className={`aspect-square rounded-lg flex items-center justify-center text-3xl ${
                          achievement.earned
                            ? "bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20"
                            : "bg-muted opacity-40 grayscale"
                        }`}
                        title={`${achievement.title}: ${achievement.description}`}
                      >
                        {achievement.icon}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button variant="link" className="w-full text-xs p-0 h-auto">
                      View all achievements
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Goal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Daily Goal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Complete 2 lessons</span>
                        <span className="font-medium">
                          {Math.min(userStats.completedLessons, 2)}/2
                        </span>
                      </div>
                      <Progress 
                        value={Math.min((userStats.completedLessons / 2) * 100, 100)} 
                        className="h-2" 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {userStats.completedLessons >= 2 
                        ? "Great job! You've reached your daily goal! 🎉" 
                        : "Complete more lessons to reach your daily goal! 🎯"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {skillProgress.length > 0 && skillProgress.some(s => s.progress > 0) ? (
                    <>
                      {skillProgress.find(s => s.progress >= 75) && (
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm font-medium text-green-800 dark:text-green-300">
                            💪 Strong Performance
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                            You excel at {skillProgress.find(s => s.progress >= 75)?.skill.toLowerCase()} problems!
                          </p>
                        </div>
                      )}
                      {skillProgress.find(s => s.progress > 0 && s.progress < 50) && (
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                          <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                            📚 Room for Growth
                          </p>
                          <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                            Practice more {skillProgress.find(s => s.progress > 0 && s.progress < 50)?.skill.toLowerCase()} to improve
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        🚀 Ready to Start!
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        Complete lessons to get personalized insights
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}