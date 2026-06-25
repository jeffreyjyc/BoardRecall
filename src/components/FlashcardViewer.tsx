import React, { useState } from 'react';
import { Flashcard } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, RotateCw, X, Check, Brain, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface FlashcardViewerProps {
  cards: Flashcard[];
  onClose: () => void;
}

export function FlashcardViewer({ cards, onClose }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{ [id: string]: 'good' | 'review' }>({});

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setShowResults(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleMark = (status: 'good' | 'review') => {
    setResults(prev => ({
      ...prev,
      [currentCard.id]: status
    }));
    toast.success(status === 'good' ? 'Marked as remembered!' : 'Marked for review');
    handleNext();
  };

  // Parses cloze deletions: show front with clozes obscured with bracketed hint or dots
  const renderFront = (text: string) => {
    const regex = /\{\{c\d+::([^:}]+)(?:::([^}]+))?\}\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex}>{text.substring(lastIndex, match.index)}</span>);
      }
      const hint = match[2];
      parts.push(
        <span 
          key={match.index} 
          className="bg-blue-100/50 text-blue-700 px-2 py-0.5 rounded font-bold border border-dashed border-blue-300"
        >
          {hint ? `[${hint}]` : '[...]'}
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex}>{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  // Parses cloze deletions: reveal the correct answers highlighted
  const renderBackWithRevealedCloze = (text: string) => {
    const regex = /\{\{c\d+::([^:}]+)(?:::([^}]+))?\}\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex}>{text.substring(lastIndex, match.index)}</span>);
      }
      const answer = match[1];
      parts.push(
        <span 
          key={match.index} 
          className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-extrabold border border-green-300 shadow-sm"
        >
          {answer}
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex}>{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  const goodCount = Object.values(results).filter(v => v === 'good').length;
  const reviewCount = Object.values(results).filter(v => v === 'review').length;
  const progressPercent = ((currentIndex) / cards.length) * 100;

  if (cards.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-50 text-white">
        <div className="text-center space-y-4">
          <HelpCircle size={48} className="mx-auto text-blue-400" />
          <h3 className="text-xl font-bold">No cards available to study</h3>
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 flex flex-col justify-between p-4 sm:p-6 text-white overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between max-w-4xl w-full mx-auto pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Brain className="text-blue-400 w-6 h-6" />
          <h2 className="font-bold text-lg sm:text-xl tracking-tight">Active Recall Session</h2>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full h-9 w-9"
        >
          <X size={20} />
        </Button>
      </header>

      {/* Main Study Deck Area */}
      <div className="flex-1 flex items-center justify-center max-w-4xl w-full mx-auto py-8">
        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-xl flex flex-col items-center"
            >
              {/* Flip Card Container */}
              <div 
                onClick={handleFlip}
                className="w-full min-h-[300px] cursor-pointer group relative preserve-3d transition-transform duration-500 [perspective:1000px] mb-8"
              >
                <div 
                  className={`absolute inset-0 w-full h-full rounded-2xl p-6 sm:p-8 border border-slate-800 bg-slate-950 flex flex-col justify-between transition-all duration-300 ${
                    isFlipped 
                      ? '[transform:rotateY(180deg)] opacity-0 pointer-events-none' 
                      : 'opacity-100 hover:border-blue-500/50 shadow-lg'
                  }`}
                >
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Front of Card</span>
                    <p className="text-lg sm:text-xl leading-relaxed text-slate-100 select-none font-medium text-center py-6">
                      {renderFront(currentCard.front)}
                    </p>
                  </div>
                  <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 pt-4">
                    <RotateCw size={12} />
                    <span>Click card to reveal answer</span>
                  </div>
                </div>

                <div 
                  className={`absolute inset-0 w-full h-full rounded-2xl p-6 sm:p-8 border border-slate-800 bg-slate-950 flex flex-col justify-between transition-all duration-300 ${
                    isFlipped 
                      ? '[transform:rotateY(0deg)] opacity-100 shadow-xl border-green-500/20' 
                      : '[transform:rotateY(-180deg)] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="space-y-4 overflow-y-auto max-h-[220px] pr-2">
                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Correct Answer & Explanation</span>
                    <p className="text-base sm:text-lg leading-relaxed text-slate-100 font-semibold mb-3">
                      {renderBackWithRevealedCloze(currentCard.front)}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-300 border-t border-slate-800/60 pt-3">
                      {currentCard.back}
                    </p>
                  </div>
                  <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 pt-4">
                    <RotateCw size={12} />
                    <span>Click to flip back</span>
                  </div>
                </div>
              </div>

              {/* Study Control Actions */}
              <div className="w-full flex justify-center gap-4">
                {isFlipped ? (
                  <div className="w-full grid grid-cols-2 gap-3 max-w-sm">
                    <Button
                      onClick={() => handleMark('review')}
                      className="bg-red-900/40 border border-red-800 text-red-200 hover:bg-red-800/60 h-11"
                    >
                      Needs Review
                    </Button>
                    <Button
                      onClick={() => handleMark('good')}
                      className="bg-green-950/60 border border-green-800 text-green-200 hover:bg-green-800/80 h-11"
                    >
                      Got It!
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleFlip}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 font-medium w-full max-w-xs shadow-md shadow-blue-900/20"
                  >
                    Reveal Answer
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            /* Results Screen */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-slate-950 rounded-2xl p-6 border border-slate-800 text-center space-y-6"
            >
              <div className="bg-blue-950/50 text-blue-400 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto border border-blue-900/40">
                <Check size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-100">Deck Complete!</h3>
                <p className="text-sm text-slate-400 mt-1">Excellent job finishing your recall study session.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="text-2xl font-black text-green-400">{goodCount}</div>
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Remembered</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-red-400">{reviewCount}</div>
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Need Review</div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  onClick={() => {
                    setCurrentIndex(0);
                    setIsFlipped(false);
                    setShowResults(false);
                    setResults({});
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Study Again
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  className="text-slate-400 hover:text-white"
                >
                  Exit Session
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation bar */}
      <footer className="max-w-4xl w-full mx-auto pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePrev}
            disabled={currentIndex === 0 || showResults}
            className="text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 h-9 w-9"
          >
            <ChevronLeft size={20} />
          </Button>
          <span className="text-xs font-semibold text-slate-400 shrink-0">
            Card {Math.min(currentIndex + 1, cards.length)} of {cards.length}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNext}
            disabled={showResults}
            className="text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 h-9 w-9"
          >
            <ChevronRight size={20} />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full sm:max-w-xs flex items-center gap-3">
          <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${showResults ? 100 : progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-blue-400 min-w-[28px] text-right">
            {showResults ? '100%' : `${Math.round(progressPercent)}%`}
          </span>
        </div>
      </footer>
    </div>
  );
}
