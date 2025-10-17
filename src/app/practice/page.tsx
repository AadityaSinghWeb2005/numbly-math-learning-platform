"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RotateCcw, Trophy, Target } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
}

const quizQuestions: Question[] = [
  {
    id: 1,
    question: "What is 15 + 23?",
    options: ["36", "38", "40", "42"],
    correctAnswer: 1,
    explanation: "15 + 23 = 38. Add the ones place: 5 + 3 = 8. Add the tens place: 1 + 2 = 3.",
    category: "Addition",
  },
  {
    id: 2,
    question: "What is 50 - 17?",
    options: ["33", "35", "37", "43"],
    correctAnswer: 0,
    explanation: "50 - 17 = 33. Borrow from the tens: 40 and 10 ones. Then 10 - 7 = 3, and 4 - 1 = 3.",
    category: "Subtraction",
  },
  {
    id: 3,
    question: "What is 8 × 7?",
    options: ["54", "56", "58", "60"],
    correctAnswer: 1,
    explanation: "8 × 7 = 56. This is an important multiplication fact to memorize!",
    category: "Multiplication",
  },
  {
    id: 4,
    question: "What is 36 ÷ 4?",
    options: ["7", "8", "9", "10"],
    correctAnswer: 2,
    explanation: "36 ÷ 4 = 9. Think: 4 × 9 = 36.",
    category: "Division",
  },
  {
    id: 5,
    question: "What is 125 + 78?",
    options: ["201", "203", "205", "207"],
    correctAnswer: 1,
    explanation: "125 + 78 = 203. Add ones: 5 + 8 = 13 (carry 1). Tens: 2 + 7 + 1 = 10 (carry 1). Hundreds: 1 + 1 = 2.",
    category: "Addition",
  },
  {
    id: 6,
    question: "What is 12 × 12?",
    options: ["124", "134", "144", "154"],
    correctAnswer: 2,
    explanation: "12 × 12 = 144. A common square to remember: 12² = 144.",
    category: "Multiplication",
  },
  {
    id: 7,
    question: "What is 91 - 28?",
    options: ["61", "63", "65", "67"],
    correctAnswer: 1,
    explanation: "91 - 28 = 63. Borrow: 81 and 11 ones. Then 11 - 8 = 3, and 8 - 2 = 6.",
    category: "Subtraction",
  },
  {
    id: 8,
    question: "What is 72 ÷ 8?",
    options: ["7", "8", "9", "10"],
    correctAnswer: 2,
    explanation: "72 ÷ 8 = 9. Think: 8 × 9 = 72.",
    category: "Division",
  },
  {
    id: 9,
    question: "What is 45 + 39?",
    options: ["82", "84", "86", "88"],
    correctAnswer: 1,
    explanation: "45 + 39 = 84. Add ones: 5 + 9 = 14 (carry 1). Tens: 4 + 3 + 1 = 8.",
    category: "Addition",
  },
  {
    id: 10,
    question: "What is 9 × 9?",
    options: ["72", "81", "90", "99"],
    correctAnswer: 1,
    explanation: "9 × 9 = 81. Another important square: 9² = 81.",
    category: "Multiplication",
  },
];

export default function PracticePage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);

  const question = quizQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;

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
      setQuizComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setAnsweredQuestions([]);
    setQuizComplete(false);
  };

  const getScoreMessage = () => {
    const percentage = (score / quizQuestions.length) * 100;
    if (percentage === 100) return "Perfect! You're a math genius! 🌟";
    if (percentage >= 80) return "Excellent work! Keep it up! 🎉";
    if (percentage >= 60) return "Good job! You're making progress! 👏";
    return "Keep practicing! You'll get better! 💪";
  };

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
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Try Again
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-4xl font-bold">Practice Quiz</h1>
                <Badge variant="outline" className="text-base px-4 py-2">
                  <Target className="h-4 w-4 mr-2" />
                  Score: {score}/{answeredQuestions.length}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground">
                Test your skills with these practice problems
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