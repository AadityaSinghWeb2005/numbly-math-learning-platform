"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, CheckCircle2, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import InteractiveLessonModal from "@/components/InteractiveLessonModal";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

interface Lesson {
  id: number;
  title: string;
  description: string | null;
  duration: string;
  difficulty: string;
  orderIndex: number;
  progress?: number;
  completed?: boolean;
  locked?: boolean;
}

export default function LessonsPage() {
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending) {
      fetchLessonsWithProgress();
    }
  }, [isPending, session]);

  const fetchLessonsWithProgress = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("bearer_token");

      // Fetch all lessons
      const lessonsResponse = await fetch("/api/lessons", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!lessonsResponse.ok) {
        throw new Error("Failed to fetch lessons");
      }

      const lessonsData: Lesson[] = await lessonsResponse.json();

      // If user is logged in, fetch their progress
      if (session?.user) {
        const progressResponse = await fetch(`/api/user-progress`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (progressResponse.ok) {
          const progressData = await progressResponse.json();

          // Create a map of lesson progress
          const progressMap = new Map();
          progressData.forEach((p: any) => {
            progressMap.set(p.lessonId, {
              progress: p.progress,
              completed: p.completed,
            });
          });

          // Merge progress with lessons
          const mergedLessons = lessonsData.map((lesson) => {
            const userProgress = progressMap.get(lesson.id);
            return {
              ...lesson,
              progress: userProgress?.progress || 0,
              completed: userProgress?.completed || false,
              locked: shouldLockLesson(lesson, progressMap),
            };
          });

          setLessons(mergedLessons);
        } else {
          // User has no progress yet, set defaults
          const defaultLessons = lessonsData.map((lesson) => ({
            ...lesson,
            progress: 0,
            completed: false,
            locked: lesson.orderIndex > 3, // First 3 lessons unlocked by default
          }));
          setLessons(defaultLessons);
        }
      } else {
        // Not logged in, show all lessons as locked except first 3
        const defaultLessons = lessonsData.map((lesson) => ({
          ...lesson,
          progress: 0,
          completed: false,
          locked: lesson.orderIndex > 3,
        }));
        setLessons(defaultLessons);
      }
    } catch (err) {
      console.error("Error fetching lessons:", err);
      setError("Failed to load lessons. Please try again.");
      toast.error("Failed to load lessons");
    } finally {
      setIsLoading(false);
    }
  };

  const shouldLockLesson = (lesson: Lesson, progressMap: Map<number, any>): boolean => {
    // First 3 lessons are always unlocked
    if (lesson.orderIndex <= 3) {
      return false;
    }

    // For later lessons, check if previous lesson is completed
    const previousLesson = lessons.find((l) => l.orderIndex === lesson.orderIndex - 1);
    if (!previousLesson) return true;

    const prevProgress = progressMap.get(previousLesson.id);
    return !prevProgress?.completed;
  };

  const handleLessonStart = async (lessonId: number) => {
    if (!session?.user) {
      toast.error("Please sign in to start lessons");
      return;
    }

    setSelectedLesson(lessonId);

    // Track that user started the lesson (set progress to 1% if not started)
    const lesson = lessons.find((l) => l.id === lessonId);
    if (lesson && lesson.progress === 0) {
      try {
        const token = localStorage.getItem("bearer_token");
        await fetch("/api/user-progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lessonId,
            progress: 1,
            completed: false,
          }),
        });

        // Refresh lessons to show updated progress
        fetchLessonsWithProgress();
      } catch (err) {
        console.error("Error updating progress:", err);
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
      case "Intermediate":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400";
      case "Advanced":
        return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Math Lessons</h1>
            <p className="text-lg text-muted-foreground">
              Master mathematical concepts through our structured learning path
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-lg text-muted-foreground">{error}</p>
              <Button onClick={fetchLessonsWithProgress}>Try Again</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => (
                <Card
                  key={lesson.id}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    lesson.locked ? "opacity-60" : ""
                  }`}
                >
                  {lesson.locked && (
                    <div className="absolute top-4 right-4 z-10">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      {lesson.completed && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{lesson.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {lesson.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        {lesson.duration}
                      </div>
                      <Badge className={getDifficultyColor(lesson.difficulty)}>
                        {lesson.difficulty}
                      </Badge>
                    </div>

                    {lesson.progress! > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{lesson.progress}%</span>
                        </div>
                        <Progress value={lesson.progress} className="h-2" />
                      </div>
                    )}

                    <Button
                      className="w-full"
                      disabled={lesson.locked}
                      onClick={() => !lesson.locked && handleLessonStart(lesson.id)}
                    >
                      {lesson.locked ? (
                        "Locked"
                      ) : lesson.progress! > 0 ? (
                        <>
                          Continue
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      ) : (
                        <>
                          Start Lesson
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {selectedLesson && (
        <InteractiveLessonModal
          lessonId={selectedLesson}
          onClose={() => {
            setSelectedLesson(null);
            fetchLessonsWithProgress(); // Refresh on close to show updated progress
          }}
        />
      )}
    </div>
  );
}