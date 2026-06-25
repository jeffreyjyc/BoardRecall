import React, { useState } from 'react';
import { BoardQuestion } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface BoardQuestionViewerProps {
  questions: BoardQuestion[];
  onClose: () => void;
  isEmbedded?: boolean;
}

export function BoardQuestionViewer({ questions, onClose, isEmbedded = false }: BoardQuestionViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [hasScoredThisQuestion, setHasScoredThisQuestion] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = (label: string, isCorrect: boolean) => {
    if (selectedLabel) return; // Prevent multiple clicks for scoring
    
    setSelectedLabel(label);
    setShowExplanation(true);
    setAnsweredCount(prev => prev + 1);

    if (!hasScoredThisQuestion) {
      setHasScoredThisQuestion(true);
      if (isCorrect) {
        setScore(prev => prev + 1);
        toast.success("Correct answer! Great job!");
      } else {
        toast.error("Incorrect. Review the explanations below.");
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedLabel(null);
      setShowExplanation(false);
      setHasScoredThisQuestion(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedLabel(null);
      setShowExplanation(false);
      setHasScoredThisQuestion(false);
    }
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedLabel(null);
    setShowExplanation(false);
    setScore(0);
    setAnsweredCount(0);
    setHasScoredThisQuestion(false);
    toast.info("Quiz reset!");
  };

  if (!currentQuestion) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500">No practice questions available.</p>
      </div>
    );
  }

  const correctOption = currentQuestion.options.find(opt => opt.isCorrect);

  return (
    <div className="space-y-6">
      {/* Quiz Progress & Score Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <BookOpen className="text-blue-600 h-5 w-5 shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Board Exam Practice Mode</h3>
            <p className="text-xs text-slate-500">USMLE-style vignettes with comprehensive explanations.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {answeredCount > 0 && (
            <Badge variant="outline" className="text-xs h-8 px-3 border-blue-200 bg-blue-50 text-blue-700 font-bold">
              Score: {score} / {answeredCount} ({Math.round((score / answeredCount) * 100)}%)
            </Badge>
          )}
          <Badge variant="secondary" className="h-8 px-3 text-xs bg-slate-100 text-slate-700">
            Question {currentIndex + 1} of {questions.length}
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={resetQuiz} 
            className="h-8 w-8 text-slate-400 hover:text-blue-600 rounded-lg"
            title="Reset Score & Quiz"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Main Board Question Card */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Clinical Vignette</span>
          <p className="text-slate-800 text-sm sm:text-base leading-relaxed font-medium whitespace-pre-wrap italic">
            {currentQuestion.vignette}
          </p>
        </div>
        
        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Question Text */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block">Question Stem</span>
            <h4 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
              {currentQuestion.question}
            </h4>
          </div>

          {/* Options List */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedLabel === option.label;
              const hasAnswered = selectedLabel !== null;
              
              let optionStyle = "border-slate-200 hover:border-blue-400 hover:bg-blue-50/30";
              let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";

              if (hasAnswered) {
                if (option.isCorrect) {
                  optionStyle = "border-green-500 bg-green-50/40 text-green-900";
                  badgeStyle = "bg-green-500 text-white border-green-600";
                } else if (isSelected) {
                  optionStyle = "border-red-500 bg-red-50/40 text-red-900";
                  badgeStyle = "bg-red-500 text-white border-red-600";
                } else {
                  optionStyle = "border-slate-100 bg-slate-50/20 text-slate-400 opacity-60 pointer-events-none";
                }
              }

              return (
                <div key={option.label} className="space-y-2">
                  <button
                    onClick={() => handleOptionSelect(option.label, option.isCorrect)}
                    disabled={hasAnswered}
                    className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all duration-200 font-medium text-sm ${optionStyle}`}
                  >
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold border text-xs shrink-0 ${badgeStyle}`}>
                      {option.label}
                    </span>
                    <span className="flex-1 leading-relaxed pt-0.5">{option.text}</span>
                    
                    {hasAnswered && option.isCorrect && (
                      <CheckCircle2 size={18} className="text-green-600 shrink-0 self-center" />
                    )}
                    {hasAnswered && isSelected && !option.isCorrect && (
                      <XCircle size={18} className="text-red-600 shrink-0 self-center" />
                    )}
                  </button>

                  {/* Detailed Option Explanation */}
                  <AnimatePresence>
                    {hasAnswered && (isSelected || option.isCorrect) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pl-11 pr-4"
                      >
                        <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
                          option.isCorrect 
                            ? 'bg-green-50/30 border-green-100 text-green-800' 
                            : 'bg-red-50/30 border-red-100 text-red-800'
                        }`}>
                          <strong>Option {option.label} Explanation:</strong> {option.explanation}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Overall Explanation Section */}
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-5 border-t border-slate-100"
              >
                <div className="bg-blue-50/40 rounded-xl p-5 border border-blue-100 space-y-3">
                  <h5 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                    <AlertCircle size={16} />
                    High-Yield Concept Summary
                  </h5>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.overallExplanation}
                  </p>
                </div>

                {/* Sources list */}
                {currentQuestion.sources && currentQuestion.sources.length > 0 && (
                  <div className="flex flex-col gap-1 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Sources</span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentQuestion.sources.map((src, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] text-slate-500 py-0.5 bg-slate-50/50">
                          {src}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="border-slate-200 text-slate-600 disabled:opacity-40"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        
        {!isEmbedded && (
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500">
            Exit Quiz
          </Button>
        )}

        <Button
          variant={currentIndex === questions.length - 1 ? "outline" : "default"}
          size="sm"
          onClick={handleNext}
          disabled={currentIndex === questions.length - 1}
          className={currentIndex === questions.length - 1 ? "border-slate-200 text-slate-400 disabled:opacity-40" : "bg-blue-600 hover:bg-blue-700 text-white"}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
