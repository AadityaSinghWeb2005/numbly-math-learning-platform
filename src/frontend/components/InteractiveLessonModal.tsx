"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Lightbulb } from "lucide-react";
import { useSession } from "@/backend/lib/auth-client";
import { toast } from "sonner";

interface Step {
  id: number;
  title: string;
  explanation: string;
  problem: string;
  answer: string;
  hint?: string;
}

const lessonData: Record<number, { title: string; steps: Step[] }> = {
  1: {
    title: "Basic Addition",
    steps: [
      {
        id: 1,
        title: "Understanding Addition",
        explanation: "Addition means combining two or more numbers to get a total. When we add 5 + 3, we're combining 5 items with 3 items.",
        problem: "5 + 3 = ?",
        answer: "8",
        hint: "Count up from 5: 6, 7, 8",
      },
      {
        id: 2,
        title: "Adding Larger Numbers",
        explanation: "Let's try adding larger numbers. Break them down if needed. For example, 12 + 7 can be thought of as 12 + 8 - 1.",
        problem: "12 + 7 = ?",
        answer: "19",
        hint: "Add 10 to 12 first, then subtract 3 (since 7 = 10 - 3)",
      },
      {
        id: 3,
        title: "Adding with Carrying",
        explanation: "When adding numbers where the sum is 10 or more, we 'carry' to the next place value. In 28 + 15, add 8 + 5 = 13, write 3 and carry 1.",
        problem: "28 + 15 = ?",
        answer: "43",
        hint: "Add ones place: 8 + 5 = 13 (write 3, carry 1). Add tens place: 2 + 1 + 1 = 4",
      },
    ],
  },
  2: {
    title: "Basic Subtraction",
    steps: [
      {
        id: 1,
        title: "Understanding Subtraction",
        explanation: "Subtraction means taking away or finding the difference. When we calculate 9 - 4, we're removing 4 from 9.",
        problem: "9 - 4 = ?",
        answer: "5",
        hint: "Count down from 9: 8, 7, 6, 5",
      },
      {
        id: 2,
        title: "Subtracting Larger Numbers",
        explanation: "For larger numbers like 15 - 6, you can count backwards or think of what you need to add to 6 to get 15.",
        problem: "15 - 6 = ?",
        answer: "9",
        hint: "What plus 6 equals 15?",
      },
      {
        id: 3,
        title: "Subtraction with Borrowing",
        explanation: "When subtracting and the top digit is smaller, we 'borrow' from the next place value. In 42 - 18, borrow 1 from the tens place.",
        problem: "42 - 18 = ?",
        answer: "24",
        hint: "Borrow from tens: 3 tens and 12 ones. Then: 12 - 8 = 4, and 3 - 1 = 2",
      },
    ],
  },
  3: {
    title: "Multiplication Basics",
    steps: [
      {
        id: 1,
        title: "Understanding Multiplication",
        explanation: "Multiplication is repeated addition. 3 × 4 means adding 3 four times: 3 + 3 + 3 + 3 = 12.",
        problem: "3 × 4 = ?",
        answer: "12",
        hint: "Add 3 four times: 3 + 3 + 3 + 3",
      },
      {
        id: 2,
        title: "Times Tables",
        explanation: "Learning multiplication tables helps solve problems quickly. The 5 times table counts by 5s.",
        problem: "5 × 6 = ?",
        answer: "30",
        hint: "Count by 5s six times: 5, 10, 15, 20, 25, 30",
      },
      {
        id: 3,
        title: "Larger Multiplication",
        explanation: "For larger numbers like 7 × 8, practice your times tables. This is an important one to memorize!",
        problem: "7 × 8 = ?",
        answer: "56",
        hint: "Think: 7 × 7 = 49, plus one more 7 = 56",
      },
    ],
  },
  4: {
    title: "Division Fundamentals",
    steps: [
      {
        id: 1,
        title: "Understanding Division",
        explanation: "Division splits a number into equal groups. 12 ÷ 3 asks 'how many groups of 3 are in 12?'",
        problem: "12 ÷ 3 = ?",
        answer: "4",
        hint: "How many 3s fit into 12? Count: 3, 6, 9, 12 (that's 4 groups)",
      },
      {
        id: 2,
        title: "Division and Multiplication",
        explanation: "Division is the opposite of multiplication. If 4 × 5 = 20, then 20 ÷ 5 = 4.",
        problem: "20 ÷ 5 = ?",
        answer: "4",
        hint: "What number times 5 equals 20?",
      },
      {
        id: 3,
        title: "Practicing Division",
        explanation: "Let's practice with a larger division problem. Remember to think about your multiplication tables!",
        problem: "48 ÷ 6 = ?",
        answer: "8",
        hint: "6 × ? = 48. Think of your 6 times table.",
      },
    ],
  },
};

interface InteractiveLessonModalProps {
  lessonId: number;
  onClose: () => void;
}

export default function InteractiveLessonModal({ lessonId, onClose }: InteractiveLessonModalProps) {
  const lesson = lessonData[lessonId];
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { data: session } = useSession();

  if (!lesson) return null;

  const step = lesson.steps[currentStep];
  const progress = ((completedSteps.length) / lesson.steps.length) * 100;
  const isLastStep = currentStep === lesson.steps.length - 1;

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
    const isCorrect = userAnswer.trim() === step.answer;
    setFeedback(isCorrect ? "correct" : "incorrect");
    
    if (isCorrect && !completedSteps.includes(step.id)) {
      const newCompletedSteps = [...completedSteps, step.id];
      setCompletedSteps(newCompletedSteps);
      
      const progressPercent = (newCompletedSteps.length / lesson.steps.length) * 100;
      const isCompleted = newCompletedSteps.length === lesson.steps.length;
      
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
          <DialogTitle className="text-2xl">{lesson.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStep + 1} of {lesson.steps.length}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <Card className="p-6 bg-muted/50">
            <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {step.explanation}
            </p>

            {/* Problem */}
            <div className="bg-background rounded-lg p-6 border-2 border-primary/20">
              <p className="text-lg font-semibold mb-4">Solve this problem:</p>
              <p className="text-3xl font-bold text-center text-primary mb-6">
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
                        <p className="text-sm mt-1">
                          The answer is {step.answer}. You're making great progress!
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 mt-0.5" />
                      <div>
                        <p className="font-semibold">Not quite right. Try again!</p>
                        <p className="text-sm mt-1">
                          Take another look at the problem. You can do this!
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Hint */}
              {step.hint && (
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
            {lesson.steps.map((s, idx) => (
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
      </DialogContent>
    </Dialog>
  );
}