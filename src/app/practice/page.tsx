"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RotateCcw, Trophy, Target, Sparkles, Loader2 } from "lucide-react";
import Navigation from "@/frontend/components/Navigation";
import Footer from "@/frontend/components/Footer";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AIQuizQuestion, MathTopic, DifficultyLevel } from "@/lib/types/quiz";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
}

export default function PracticePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  
  const [showGenerator, setShowGenerator] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<MathTopic>("mixed");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>("medium");
  const [questionCount, setQuestionCount] = useState(10);
  const [useProgressive, setUseProgressive] = useState(false);
  
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push(`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const question = quizQuestions[currentQuestion];
  const progress = quizQuestions.length > 0 ? ((currentQuestion + 1) / quizQuestions.length) * 100 : 0;

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`,
        },
        body: JSON.stringify({
          topic: selectedTopic,
          difficulty: useProgressive ? undefined : selectedDifficulty,
          count: questionCount,
          progressive: useProgressive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate quiz");
      }

      const data = await response.json();
      
      // Convert AI questions to the format expected by the quiz UI
      const convertedQuestions: Question[] = data.questions.map((q: AIQuizQuestion, idx: number) => ({
        id: idx + 1,
        question: q.question,
        options: q.options.map(opt => opt.text),
        correctAnswer: q.options.findIndex(opt => opt.isCorrect),
        explanation: q.correctAnswerExplanation,
        category: q.topic.charAt(0).toUpperCase() + q.topic.slice(1),
      }));

      setQuizQuestions(convertedQuestions);
      setShowGenerator(false);
      setStartTime(new Date());
      toast.success(`Generated ${convertedQuestions.length} AI-powered questions!`);
    } catch (error) {
      console.error("Quiz generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (!showFeedback) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    setShowFeedback(true);
    
    if (selectedAnswer === question.correctAnswer) {
      setScore(score + 1);
    }

    setAnsweredQuestions([...answeredQuestions, question.id]);
  };

  const handleNext = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      handleQuizComplete();
    }
  };

  const handleQuizComplete = async () => {
    setQuizComplete(true);
    
    if (!session?.user || !startTime) return;

    const endTime = new Date();
    const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    try {
      await fetch("/api/quiz-attempts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`,
        },
        body: JSON.stringify({
          userId: session.user.id,
          score,
          totalQuestions: quizQuestions.length,
          timeSpent,
        }),
      });
    } catch (error) {
      console.error("Failed to save quiz attempt:", error);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setAnsweredQuestions([]);
    setQuizComplete(false);
    setQuizQuestions([]);
    setShowGenerator(true);
    setStartTime(null);
  };

  const getScoreMessage = () => {
    const percentage = (score / quizQuestions.length) * 100;
    if (percentage === 100) return "Perfect! You're a math genius! 🌟";
    if (percentage >= 80) return "Excellent work! Keep it up! 🎉";
    if (percentage >= 60) return "Good job! You're making progress! 👏";
    return "Keep practicing! You'll get better! 💪";
  };

  // Quiz Generator UI
  if (showGenerator) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl">AI Quiz Generator</CardTitle>
                      <CardDescription>Create personalized math quizzes powered by AI</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Topic</label>
                      <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value as MathTopic)}
                        className="w-full border-2 border-border bg-background px-4 py-2.5 rounded-lg focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="mixed">Mixed (All Topics)</option>
                        <option value="addition">Addition</option>
                        <option value="subtraction">Subtraction</option>
                        <option value="multiplication">Multiplication</option>
                        <option value="division">Division</option>
                        <option value="fractions">Fractions</option>
                        <option value="decimals">Decimals</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <input
                        type="checkbox"
                        id="progressive"
                        checked={useProgressive}
                        onChange={(e) => setUseProgressive(e.target.checked)}
                        className="h-4 w-4 rounded border-primary"
                      />
                      <label htmlFor="progressive" className="text-sm font-medium cursor-pointer flex-1">
                        Progressive Mode (Easy → Medium → Hard)
                      </label>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>

                    {!useProgressive && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Difficulty Level</label>
                        <div className="grid grid-cols-3 gap-3">
                          {(["easy", "medium", "hard"] as DifficultyLevel[]).map((diff) => (
                            <button
                              key={diff}
                              onClick={() => setSelectedDifficulty(diff)}
                              className={`p-3 rounded-lg border-2 transition-all font-medium capitalize ${
                                selectedDifficulty === diff
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary"
                              }`}
                            >
                              {diff}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Number of Questions: {questionCount}
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="20"
                        step="5"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>5 questions</span>
                        <span>20 questions</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateQuiz}
                    disabled={isGenerating}
                    size="lg"
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating Quiz...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generate AI Quiz
                      </>
                    )}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center">
                    Each quiz is uniquely generated by AI to match your selected preferences
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Quiz Complete Screen
  if (quizComplete) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl mb-2">Quiz Complete!</CardTitle>
                  <CardDescription className="text-lg">
                    {getScoreMessage()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="text-6xl font-bold text-primary mb-2">
                      {score}/{quizQuestions.length}
                    </div>
                    <p className="text-muted-foreground">
                      You got {((score / quizQuestions.length) * 100).toFixed(0)}% correct
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {score}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-500">Correct</div>
                    </div>
                    <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                        {quizQuestions.length - score}
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-500">Incorrect</div>
                    </div>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <Button onClick={handleRestart} size="lg">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate New Quiz
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <a href="/lessons">Review Lessons</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Quiz Question Screen
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-4xl font-bold">AI Quiz</h1>
                  <Badge variant="outline" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                </div>
                <Badge variant="outline" className="text-base px-4 py-2">
                  <Target className="h-4 w-4 mr-2" />
                  Score: {score}/{answeredQuestions.length}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground">
                Test your skills with AI-generated questions
              </p>
            </div>

            {/* Progress */}
            <div className="mb-8 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Question {currentQuestion + 1} of {quizQuestions.length}
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Question Card */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge>{question.category}</Badge>
                  <span className="text-sm text-muted-foreground">
                    Question {currentQuestion + 1}
                  </span>
                </div>
                <CardTitle className="text-2xl">{question.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Answer Options */}
                <div className="grid gap-3">
                  {question.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = index === question.correctAnswer;
                    const showCorrect = showFeedback && isCorrect;
                    const showIncorrect = showFeedback && isSelected && !isCorrect;

                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={showFeedback}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          showCorrect
                            ? "border-green-500 bg-green-100 dark:bg-green-900/20"
                            : showIncorrect
                            ? "border-red-500 bg-red-100 dark:bg-red-900/20"
                            : isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary hover:bg-accent"
                        } ${showFeedback ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option}</span>
                          {showCorrect && (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          )}
                          {showIncorrect && (
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback */}
                {showFeedback && (
                  <div
                    className={`p-4 rounded-lg ${
                      selectedAnswer === question.correctAnswer
                        ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                        : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                    }`}
                  >
                    <p className="font-semibold mb-2">
                      {selectedAnswer === question.correctAnswer
                        ? "Correct! Well done!"
                        : "Not quite right."}
                    </p>
                    <p className="text-sm">{question.explanation}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  {!showFeedback ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={selectedAnswer === null}
                      className="w-full"
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button onClick={handleNext} className="w-full">
                      {currentQuestion < quizQuestions.length - 1 ? "Next Question" : "View Results"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Question Indicators */}
            <div className="flex justify-center gap-2">
              {quizQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`h-2 w-2 rounded-full transition-all ${
                    idx === currentQuestion
                      ? "bg-primary w-8"
                      : answeredQuestions.includes(q.id)
                      ? "bg-muted-foreground"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}