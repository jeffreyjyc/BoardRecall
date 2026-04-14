import { useState, useEffect } from 'react';
import { QuestionInput } from './components/QuestionInput';
import { FlashcardEditor } from './components/FlashcardEditor';
import { FlashcardViewer } from './components/FlashcardViewer';
import { Flashcard, QuestionSet } from './types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { generateFlashcards, addMoreFlashcards, generateBoardQuestions, loadSettings } from './lib/gemini';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BookOpen, History, Plus, BrainCircuit, Stethoscope, GraduationCap, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { BoardQuestionViewer } from './components/BoardQuestionViewer';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { v4 as uuidv4 } from 'uuid';
import { SettingsModal } from './components/SettingsModal';

type View = 'home' | 'input' | 'edit' | 'study';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [history, setHistory] = useState<QuestionSet[]>([]);
  const [currentSet, setCurrentSet] = useState<QuestionSet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [activeTab, setActiveTab] = useState('flashcards');
  const [showSettings, setShowSettings] = useState(false);

  // Load history and settings
  useEffect(() => {
    loadSettings();
    const saved = localStorage.getItem('medflash_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('medflash_history', JSON.stringify(history));
  }, [history]);

  const handleGenerate = async (text: string, images: string[], instructions: string) => {
    setIsGenerating(true);
    try {
      const cards = await generateFlashcards(text, images, instructions);
      const newSet: QuestionSet = {
        id: uuidv4(),
        title: text.slice(0, 50) + (text.length > 50 ? '...' : '') || 'Image-based Question',
        originalText: text,
        cards,
        createdAt: Date.now(),
      };
      setCurrentSet(newSet);
      setView('edit');
      setActiveTab('flashcards');
      toast.success(`Generated ${cards.length} flashcards!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddMore = async () => {
    if (!currentSet) return;
    setIsAddingMore(true);
    try {
      const newCards = await addMoreFlashcards(currentSet.cards, currentSet.originalText);
      const updatedSet = {
        ...currentSet,
        cards: [...currentSet.cards, ...newCards],
      };
      setCurrentSet(updatedSet);
      toast.success(`Added ${newCards.length} more cards!`);
    } catch (error) {
      toast.error('Failed to add more cards');
    } finally {
      setIsAddingMore(false);
    }
  };

  const handleGenerateRelatedQuestions = async () => {
    if (!currentSet) return;
    setIsGeneratingQuestions(true);
    try {
      const questions = await generateBoardQuestions(currentSet.originalText);
      const updatedSet = {
        ...currentSet,
        relatedQuestions: [...(currentSet.relatedQuestions || []), ...questions],
      };
      setCurrentSet(updatedSet);
      setActiveTab('practice');
      toast.success(`Generated ${questions.length} new board questions!`);
    } catch (error) {
      toast.error('Failed to generate board questions');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const saveCurrentSet = () => {
    if (!currentSet) return;
    setHistory(prev => {
      const exists = prev.find(s => s.id === currentSet.id);
      if (exists) {
        return prev.map(s => s.id === currentSet.id ? currentSet : s);
      }
      return [currentSet, ...prev];
    });
    setView('home');
    toast.success('Question set saved to history');
  };

  const deleteSet = (id: string) => {
    setHistory(prev => prev.filter(s => s.id !== id));
    toast.info('Question set deleted');
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Toaster position="top-center" />
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setView('home')}
            >
              <div className="bg-blue-600 p-2 rounded-lg text-white group-hover:bg-blue-700 transition-colors">
                <Stethoscope size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">MedFlash AI</h1>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">Board Prep Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-600 hover:text-blue-600"
                onClick={() => setShowSettings(true)}
              >
                <SettingsIcon size={18} className="mr-2" />
                Settings
              </Button>
              {view === 'edit' && (
                <div className="flex gap-2">
                  <Button 
                    onClick={saveCurrentSet}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Save & Finish
                  </Button>
                </div>
              )}
              {view === 'home' && (
                <Button 
                  onClick={() => setView('input')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" /> New Question
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-6">
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="bg-blue-50 p-4 rounded-full text-blue-600 mb-2">
                    <BrainCircuit size={48} />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800">Ready to study?</h2>
                  <p className="text-slate-500 max-w-md">
                    Upload your medical board questions and let AI generate high-yield cloze-style flashcards for you.
                  </p>
                  <Button 
                    size="lg" 
                    onClick={() => setView('input')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
                  >
                    Get Started
                  </Button>
                </div>

                {history.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      <History size={14} />
                      <span>Recent Question Sets</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {history.map((set) => (
                        <Card key={set.id} className="group hover:shadow-md transition-all border-slate-200">
                          <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {new Date(set.createdAt).toLocaleDateString()}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deleteSet(set.id)}
                              >
                                <Plus className="rotate-45" size={14} />
                              </Button>
                            </div>
                            <h3 className="font-semibold text-slate-800 line-clamp-2 mb-4 h-12">
                              {set.title}
                            </h3>
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-blue-600 font-bold text-xs">
                                  <BookOpen size={12} />
                                  <span>{set.cards.length} Cards</span>
                                </div>
                                {set.relatedQuestions && set.relatedQuestions.length > 0 && (
                                  <div className="flex items-center gap-1 text-purple-600 font-bold text-xs">
                                    <GraduationCap size={12} />
                                    <span>{set.relatedQuestions.length} Practice Qs</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs"
                                  onClick={() => {
                                    setCurrentSet(set);
                                    setView('edit');
                                    setActiveTab('flashcards');
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white"
                                  onClick={() => {
                                    setCurrentSet(set);
                                    setView('study');
                                  }}
                                >
                                  Study
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-8"
              >
                <QuestionInput 
                  onGenerate={handleGenerate} 
                  isGenerating={isGenerating} 
                />
                <div className="mt-8 text-center">
                  <Button variant="ghost" onClick={() => setView('home')} className="text-slate-400">
                    Cancel and go back
                  </Button>
                </div>
              </motion.div>
            )}

            {view === 'edit' && currentSet && (
              <motion.div
                key="edit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-100 p-1">
                      <TabsTrigger value="flashcards" className="px-6">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Flashcards
                      </TabsTrigger>
                      <TabsTrigger value="practice" className="px-6">
                        <GraduationCap className="mr-2 h-4 w-4" />
                        Practice Questions
                        {currentSet.relatedQuestions && currentSet.relatedQuestions.length > 0 && (
                          <Badge className="ml-2 bg-blue-600 text-[10px] h-4 px-1 min-w-[16px] flex items-center justify-center">
                            {currentSet.relatedQuestions.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    {activeTab === 'practice' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateRelatedQuestions}
                        disabled={isGeneratingQuestions}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        {isGeneratingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Generate More Questions
                      </Button>
                    )}
                  </div>

                  <TabsContent value="flashcards">
                    <FlashcardEditor 
                      cards={currentSet.cards} 
                      onUpdate={(cards) => setCurrentSet({ ...currentSet, cards })}
                      onAddMore={handleAddMore}
                      isAddingMore={isAddingMore}
                    />
                  </TabsContent>

                  <TabsContent value="practice">
                    {currentSet.relatedQuestions && currentSet.relatedQuestions.length > 0 ? (
                      <BoardQuestionViewer 
                        questions={currentSet.relatedQuestions}
                        onClose={() => setView('home')}
                        isEmbedded={true}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white rounded-xl border-2 border-dashed border-slate-200">
                        <div className="bg-blue-50 p-4 rounded-full text-blue-600">
                          <GraduationCap size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No practice questions yet</h3>
                        <p className="text-slate-500 max-w-xs">
                          Generate board-style clinical vignettes to test your understanding of this material.
                        </p>
                        <Button
                          onClick={handleGenerateRelatedQuestions}
                          disabled={isGeneratingQuestions}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isGeneratingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                          Generate Questions
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {view === 'study' && currentSet && (
          <FlashcardViewer 
            cards={currentSet.cards} 
            onClose={() => setView('home')} 
          />
        )}

        <AnimatePresence>
          {showSettings && (
            <SettingsModal onClose={() => setShowSettings(false)} />
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}