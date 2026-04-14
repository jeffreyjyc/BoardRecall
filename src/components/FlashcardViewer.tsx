import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flashcard } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface FlashcardViewerProps {
  cards: Flashcard[];
  onClose: () => void;
}

export function FlashcardViewer({ cards, onClose }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCloze, setShowCloze] = useState(false);

  const currentCard = cards[currentIndex];

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setShowCloze(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
      setShowCloze(false);
    }
  };

  const toggleFlip = () => setIsFlipped(!isFlipped);

  if (!currentCard) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
      <Button 
        variant="ghost" 
        className="absolute top-4 right-4 text-white hover:bg-white/10"
        onClick={onClose}
      >
        Close Study Mode
      </Button>

      <div className="w-full max-w-2xl aspect-[4/3] relative perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex + (isFlipped ? '-back' : '-front')}
            initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <Card 
              className={`w-full h-full cursor-pointer shadow-2xl border-none overflow-hidden ${isFlipped ? 'bg-slate-50' : 'bg-white'}`}
              onClick={toggleFlip}
            >
              <CardContent className="h-full flex flex-col items-center justify-center p-12 text-center">
                {!isFlipped ? (
                  <div className="space-y-6">
                    <p className="text-2xl font-medium text-slate-800 leading-relaxed">
                      {currentCard.front.split(/(\{\{c\d::.*?\}\})/).map((part, i) => {
                        const match = part.match(/\{\{c\d::(.*?)(?:::(.*?))?\}\}/);
                        if (match) {
                          const answer = match[1];
                          const hint = match[2];
                          return (
                            <span 
                              key={i} 
                              className={`transition-all duration-300 px-2 py-0.5 rounded border ${
                                showCloze 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : 'bg-slate-200 text-transparent border-slate-300 select-none'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowCloze(!showCloze);
                              }}
                            >
                              {showCloze ? answer : (hint || '...')}
                            </span>
                          );
                        }
                        return part;
                      })}
                    </p>
                    <div className="pt-8">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCloze(!showCloze);
                        }}
                      >
                        {showCloze ? <EyeOff size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />}
                        {showCloze ? 'Hide Answer' : 'Show Answer'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-md">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-500">Explanation</h3>
                    <p className="text-lg text-slate-600 leading-relaxed">
                      {currentCard.back}
                    </p>
                  </div>
                )}
                
                <div className="absolute bottom-6 left-0 right-0 text-center">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    Click to Flip
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-12 flex items-center gap-8">
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full w-12 h-12 border-white/20 text-white hover:bg-white/10"
          onClick={prevCard}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={24} />
        </Button>
        
        <div className="text-center">
          <p className="text-white font-medium">{currentIndex + 1} / {cards.length}</p>
          <p className="text-white/40 text-xs uppercase tracking-widest mt-1">Progress</p>
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full w-12 h-12 border-white/20 text-white hover:bg-white/10"
          onClick={nextCard}
          disabled={currentIndex === cards.length - 1}
        >
          <ChevronRight size={24} />
        </Button>
      </div>
    </div>
  );
}
