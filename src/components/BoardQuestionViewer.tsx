import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BoardQuestion } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BoardQuestionViewerProps {
  questions: BoardQuestion[];
  onClose: () => void;
  isEmbedded?: boolean;
}

export function BoardQuestionViewer({ questions, onClose, isEmbedded = false }: BoardQuestionViewerProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [showExplanations, setShowExplanations] = useState<Record<string, boolean>>({});

  const handleOptionSelect = (questionId: string, label: string) => {
    if (showExplanations[questionId]) return;
    setSelectedOptions(prev => ({ ...prev, [questionId]: label }));
  };

  const toggleExplanation = (questionId: string) => {
    setShowExplanations(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  return (
    <div className={`space-y-8 max-w-4xl mx-auto ${isEmbedded ? '' : 'pb-20'}`}>
      {!isEmbedded && (
        <div className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-sm py-4 z-10 border-b border-slate-200 px-4 -mx-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Brain className="text-blue-600" />
              Board-Style Practice
            </h2>
            <p className="text-sm text-slate-500">Test your knowledge with new vignettes</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      )}

      <div className="space-y-12">
        {questions.map((q, qIdx) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: qIdx * 0.1 }}
          >
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-white text-blue-600 border-blue-100">Question {qIdx + 1}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {q.vignette}
                    {"\n\n"}
                    {q.question}
                  </p>
                </div>

                <div className="grid gap-3">
                  {q.options.map((option) => {
                    const isSelected = selectedOptions[q.id] === option.label;
                    const isCorrect = option.isCorrect;
                    const showResult = showExplanations[q.id];
                    
                    let variantClass = "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30";
                    if (isSelected && !showResult) variantClass = "border-blue-500 bg-blue-50 ring-1 ring-blue-500";
                    if (showResult) {
                      if (isCorrect) variantClass = "border-green-500 bg-green-50 ring-1 ring-green-500";
                      else if (isSelected) variantClass = "border-red-500 bg-red-50 ring-1 ring-red-500";
                      else variantClass = "border-slate-100 opacity-60";
                    }

                    return (
                      <button
                        key={option.label}
                        disabled={showResult}
                        onClick={() => handleOptionSelect(q.id, option.label)}
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${variantClass}`}
                      >
                        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${
                          isSelected ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-400 border-slate-200'
                        }`}>
                          {option.label}
                        </span>
                        <div className="flex-grow">
                          <p className={`font-medium ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{option.text}</p>
                          {showResult && (isSelected || isCorrect) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-2 text-sm"
                            >
                              <div className={`flex items-center gap-1 font-bold mb-1 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </div>
                              <p className="text-slate-600 italic">{option.explanation}</p>
                            </motion.div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4">
                  {!showExplanations[q.id] ? (
                    <Button 
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white"
                      disabled={!selectedOptions[q.id]}
                      onClick={() => toggleExplanation(q.id)}
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                          <Brain size={18} />
                          Educational Objective
                        </h4>
                        <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-wrap">
                          {q.overallExplanation}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detailed Option Explanations</h4>
                        <div className="grid gap-2">
                          {q.options.map(opt => (
                            <div key={opt.label} className="text-sm p-3 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="font-bold text-slate-900 mr-2">{opt.label}:</span>
                              <span className="text-slate-600">{opt.explanation}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {q.sources && q.sources.length > 0 && (
                        <div className="pt-4 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Verified Sources</h4>
                          <div className="flex flex-wrap gap-2">
                            {q.sources.map((source, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
