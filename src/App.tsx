import { useState, useEffect } from 'react';
import { QuestionInput } from './components/QuestionInput';
import { FlashcardEditor } from './components/FlashcardEditor';
import { FlashcardViewer } from './components/FlashcardViewer';
import { Flashcard, QuestionSet } from './types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { generateFlashcards, addMoreFlashcards, generateBoardQuestions, loadSettings } from './lib/gemini';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BookOpen, History, Plus, BrainCircuit, Stethoscope, GraduationCap, Loader2, Settings as SettingsIcon, ExternalLink, Maximize2, FileText, Check, Save, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { BoardQuestionViewer } from './components/BoardQuestionViewer';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { v4 as uuidv4 } from 'uuid';
import { SettingsModal } from './components/SettingsModal';

type View = 'home' | 'input' | 'edit' | 'study' | 'history';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [history, setHistory] = useState<QuestionSet[]>([]);
  const [currentSet, setCurrentSet] = useState<QuestionSet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [activeTab, setActiveTab] = useState('flashcards');
  const [showSettings, setShowSettings] = useState(false);

  const openInNewTab = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'index.html' });
    } else {
      window.open(window.location.href, '_blank');
    }
  };

  // Load history and settings
  useEffect(() => {
    loadSettings();
    const saved = localStorage.getItem('boardrecall_history');
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
    localStorage.setItem('boardrecall_history', JSON.stringify(history));
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

  const handleAddMore = async (instructions: string = "") => {
    if (!currentSet) return;
    setIsAddingMore(true);
    try {
      const newCards = await addMoreFlashcards(currentSet.cards, currentSet.originalText, instructions);
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

  const exportAllHistory = () => {
    if (history.length === 0) {
      toast.error("No history to export");
      return;
    }

    const allCards = history.flatMap(set => set.cards);
    if (allCards.length === 0) {
      toast.error("No cards found in history");
      return;
    }

    const content = allCards.map(card => `${card.front} | ${card.back}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boardrecall_ALL_HISTORY_export_${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${allCards.length} cards from ${history.length} sets`);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Toaster position="bottom-right" closeButton />
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
            <div 
              className="flex items-center gap-2 cursor-pointer group shrink-0"
              onClick={() => setView('home')}
            >
              <div className="bg-blue-600 p-2 rounded-lg text-white group-hover:bg-blue-700 transition-colors shrink-0">
                <Stethoscope size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div className="hidden min-[400px]:block">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800">BoardRecall</h1>
                <p className="text-[9px] sm:text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">Smart Exam Companion</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-600 hover:text-blue-600 px-2 h-9 flex-shrink-0"
                onClick={openInNewTab}
                title="Open in New Tab"
              >
                <Maximize2 size={18} className="sm:mr-2" />
                <span className="hidden sm:inline">Full Page</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-600 hover:text-blue-600 px-2 h-9 flex-shrink-0"
                onClick={() => setShowSettings(true)}
              >
                <SettingsIcon size={18} className="sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              {view === 'home' && history.length > 0 && (
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('history')}
                  className="text-slate-600 hover:text-blue-600 px-2 h-9 flex-shrink-0"
                >
                  <History size={18} className="sm:mr-2" />
                  <span className="hidden sm:inline">My History</span>
                </Button>
              )}
              {view === 'edit' && (
                <div className="flex items-center">
                  <Button 
                    id="save-finish-button"
                    onClick={(e) => {
                      e.preventDefault();
                      saveCurrentSet();
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-2 sm:px-4 h-9 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap shadow-sm"
                  >
                    <Check size={16} className="mr-1 sm:mr-2" />
                    <span className="font-semibold">Save<span className="hidden sm:inline">&nbsp;& Finish</span></span>
                  </Button>
                </div>
              )}
              {view === 'home' && (
                <Button 
                  onClick={() => setView('input')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-4 h-9 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap"
                >
                  <Plus className="mr-1 sm:mr-2 h-4 w-4" /> 
                  <span className="hidden sm:inline">New Question</span>
                  <span className="sm:hidden">New</span>
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
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      size="lg" 
                      onClick={() => setView('input')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
                    >
                      New Flashcards
                    </Button>
                    {history.length > 0 && (
                      <Button 
                        size="lg"
                        variant="outline"
                        onClick={() => setView('history')}
                        className="px-8 py-6 text-lg border-slate-200"
                      >
                        <History className="mr-2 h-5 w-5" />
                        View History
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setView('home')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Plus className="rotate-45" />
                    </Button>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      <History className="text-blue-600" />
                      Study History
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      onClick={exportAllHistory}
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-200 hover:bg-green-50 gap-2 h-9 flex-1 sm:flex-none"
                    >
                      <Download size={16} />
                      Export All cards
                    </Button>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 h-9 px-3 shrink-0">
                      {history.length} Sets Total
                    </Badge>
                  </div>
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
                                <span>{set.relatedQuestions.length} Qs</span>
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
                
                {history.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-400">No questions in your history yet.</p>
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
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-6 gap-4">
                    <TabsList className="bg-slate-100 p-1 w-full sm:w-auto">
                      <TabsTrigger value="flashcards" className="flex-1 sm:px-6">
                        <BookOpen className="sm:mr-2 h-4 w-4" />
                        <span className="hidden min-[400px]:inline">Flashcards</span>
                        <span className="min-[400px]:hidden">Cards</span>
                      </TabsTrigger>
                      <TabsTrigger value="practice" className="flex-1 sm:px-6">
                        <GraduationCap className="sm:mr-2 h-4 w-4" />
                        <span className="hidden min-[400px]:inline">Practice Questions</span>
                        <span className="min-[400px]:hidden">Practice</span>
                        {currentSet.relatedQuestions && currentSet.relatedQuestions.length > 0 && (
                          <Badge className="ml-2 bg-blue-600 text-[10px] h-4 px-1 min-w-[16px] flex items-center justify-center">
                            {currentSet.relatedQuestions.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="source" className="flex-1 sm:px-6">
                        <FileText className="sm:mr-2 h-4 w-4" />
                        <span className="hidden min-[400px]:inline">Source Stem</span>
                        <span className="min-[400px]:hidden">Source</span>
                      </TabsTrigger>
                    </TabsList>

                    {activeTab === 'practice' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateRelatedQuestions}
                        disabled={isGeneratingQuestions}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto h-8 text-xs"
                      >
                        {isGeneratingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        <span className="hidden sm:inline">Generate More Questions</span>
                        <span className="sm:hidden">Generate More</span>
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

                  <TabsContent value="source">
                    <Card className="border-slate-200">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 uppercase text-xs font-bold">
                          <FileText size={14} />
                          <span>Original Question Stem</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-6 border border-slate-100">
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                            {currentSet.originalText}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
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