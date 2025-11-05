"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Lightbulb, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import type { MathTopic, DifficultyLevel } from "@/lib/types/quiz";

interface Step {
  id: number;
  title: string;
  explanation: string;
  problem: string;
  answer: string;
  hint?: string;
}

// Mapping lesson IDs to topics for AI generation
const lessonTopicMap: Record<number, { title: string; topic: MathTopic; difficulty: DifficultyLevel }> = {
  1: { title: "Basic Addition", topic: "addition", difficulty: "easy" },
  2: { title: "Basic Subtraction", topic: "subtraction", difficulty: "easy" },
  3: { title: "Multiplication Basics", topic: "multiplication", difficulty: "medium" },
  4: { title: "Division Fundamentals", topic: "division", difficulty: "medium" },
  5: { title: "Understanding Fractions", topic: "fractions", difficulty: "medium" },
  6: { title: "Working with Decimals", topic: "decimals", difficulty: "hard" },
};

interface InteractiveLessonModalProps {
  lessonId: number;
  onClose: () => void;
}

export default function InteractiveLessonModal({ lessonId, onClose }: InteractiveLessonModalProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { data: session } = useSession();

  const lessonInfo = lessonTopicMap[lessonId];

  useEffect(() => {
    generateLessonSteps();
  }, [lessonId]);

  const generateLessonSteps = async () => {
    if (!lessonInfo) {
      setGenerationError("Lesson not found");
      setIsGenerating(false);
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationError(null);

      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: lessonInfo.topic,
          difficulty: lessonInfo.difficulty,
          count: 3, // Generate 3 practice questions per lesson
          progressive: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate lesson content");
      }

      const data = await response.json();

      // Convert AI questions to lesson steps format
      const generatedSteps: Step[] = data.questions.map((q: any, idx: number) => ({
        id: idx + 1,
        title: `Practice Problem ${idx + 1}`,
        explanation: q.correctAnswerExplanation,
        problem: q.question,
        answer: q.options.find((opt: any) => opt.isCorrect)?.text || "",
        hint: `Try breaking down the problem step by step. ${q.correctAnswerExplanation.split('.')[0]}.`,
      }));

      setSteps(generatedSteps);
    } catch (error) {
      console.error("Error generating lesson:", error);
      setGenerationError("Failed to generate lesson content. Please try again.");
      toast.error("Failed to load lesson");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!lessonInfo) {
    return null;
  }

  const step = steps[currentStep];
  const progress = steps.length > 0 ? ((completedSteps.length) / steps.length) * 100 : 0;
  const isLastStep = currentStep === steps.length - 1;

  const saveProgress = async (progressPercent: number, isCompleted: boolean) => {
    if (!session?.user) return;

    try {
      setIsSaving(true);
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch("/api/user-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lessonId,
          progress: Math.round(progressPercent),
          completed: isCompleted,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save progress");
      }

      if (isCompleted) {
        toast.success("Lesson completed! 🎉");
      }
    } catch (error) {
      console.error("Error saving progress:", error);
      toast.error("Failed to save progress");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    const isCorrect = userAnswer.trim() === step.answer.trim();
    setFeedback(isCorrect ? "correct" : "incorrect");
    
    if (isCorrect && !completedSteps.includes(step.id)) {
      const newCompletedSteps = [...completedSteps, step.id];
      setCompletedSteps(newCompletedSteps);
      
      const progressPercent = (newCompletedSteps.length / steps.length) * 100;
      const isCompleted = newCompletedSteps.length === steps.length;
      
      saveProgress(progressPercent, isCompleted);
    }
  };

  const handleNext = () => {
    if (feedback === "correct") {
      if (isLastStep) {
        onClose();
      } else {
        setCurrentStep(currentStep + 1);
        setUserAnswer("");
        setFeedback(null);
        setShowHint(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setUserAnswer("");
      setFeedback(null);
      setShowHint(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-2xl">{lessonInfo.title}</DialogTitle>
            <Badge variant="outline" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Badge>
          </div>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Generating personalized lesson...</p>
            <p className="text-sm text-muted-foreground">Creating practice problems just for you</p>
          </div>
        ) : generationError ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-lg font-medium">{generationError}</p>
            <Button onClick={generateLessonSteps}>Try Again</Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step Content */}
            <Card className="p-6 bg-muted/50">
              <h3 className="text-xl font-semibold mb-4">{step.title}</h3>

              {/* Problem */}
              <div className="bg-background rounded-lg p-6 border-2 border-primary/20">
                <p className="text-lg font-semibold mb-4">Solve this problem:</p>
                <p className="text-2xl font-bold text-center text-primary mb-6">
                  {step.problem}
                </p>

                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !feedback && handleSubmit()}
                    disabled={feedback !== null || isSaving}
                    className="text-lg text-center"
                  />
                  {!feedback && (
                    <Button onClick={handleSubmit} disabled={!userAnswer.trim() || isSaving}>
                      {isSaving ? "Saving..." : "Check"}
                    </Button>
                  )}
                </div>

                {/* Feedback */}
                {feedback && (
                  <div
                    className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                      feedback === "correct"
                        ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                        : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                    }`}
                  >
                    {feedback === "correct" ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 mt-0.5" />
                        <div>
                          <p className="font-semibold">Correct! Well done!</p>
                          <p className="text-sm mt-1">{step.explanation}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 mt-0.5" />
                        <div>
                          <p className="font-semibold">Not quite right. Try again!</p>
                          <p className="text-sm mt-1">
                            The correct answer is {step.answer}. {step.explanation}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Hint */}
                {step.hint && !feedback && (
                  <div className="mt-4">
                    {!showHint ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHint(true)}
                        className="w-full"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Show Hint
                      </Button>
                    ) : (
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 mt-0.5" />
                          <p>{step.hint}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {feedback === "correct" && (
                <Button onClick={handleNext} disabled={isSaving}>
                  {isLastStep ? "Complete Lesson" : "Next Step"}
                  {!isLastStep && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              )}
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center gap-2 pt-2">
              {steps.map((s, idx) => (
                <div
                  key={s.id}
                  className={`h-2 w-2 rounded-full transition-all ${
                    idx === currentStep
                      ? "bg-primary w-8"
                      : completedSteps.includes(s.id)
                      ? "bg-green-500"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}