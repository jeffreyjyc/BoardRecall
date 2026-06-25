import React, { useState } from 'react';
import { Flashcard } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Check, X, Sparkles, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface FlashcardEditorProps {
  cards: Flashcard[];
  onUpdate: (cards: Flashcard[]) => void;
  onAddMore: (instructions: string) => Promise<void>;
  isAddingMore: boolean;
}

export function FlashcardEditor({ cards, onUpdate, onAddMore, isAddingMore }: FlashcardEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editTags, setEditTags] = useState('');
  
  const [moreInstructions, setMoreInstructions] = useState('');

  const startEdit = (card: Flashcard) => {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
    setEditTags(card.tags.join(', '));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    const updatedCards = cards.map(c => {
      if (c.id === id) {
        return {
          ...c,
          front: editFront,
          back: editBack,
          tags: editTags.split(',').map(t => t.trim()).filter(Boolean)
        };
      }
      return c;
    });
    onUpdate(updatedCards);
    setEditingId(null);
    toast.success('Card updated successfully!');
  };

  const deleteCard = (id: string) => {
    const updatedCards = cards.filter(c => c.id !== id);
    onUpdate(updatedCards);
    toast.success('Card removed');
  };

  const handleAddMoreClick = async () => {
    try {
      await onAddMore(moreInstructions);
      setMoreInstructions('');
    } catch (err) {
      // Error handled by parent
    }
  };

  // Helper to highlight Anki cloze deletions {{c1::answer::hint}} or {{c1::answer}}
  const renderClozeFront = (text: string) => {
    const regex = /\{\{c\d+::([^:}]+)(?:::([^}]+))?\}\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex}>{text.substring(lastIndex, match.index)}</span>);
      }
      const answer = match[1];
      const hint = match[2];
      parts.push(
        <span 
          key={match.index} 
          className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold border border-blue-200/50"
          title={`Answer: ${answer}`}
        >
          [{hint ? hint : '...'}]
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex}>{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-semibold text-slate-800">Flashcard List</h3>
          <p className="text-xs text-slate-500">Edit cloze deletions, update high-yield descriptions, or remove cards.</p>
        </div>
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
          {cards.length} Generated Cards
        </Badge>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-slate-200 hover:border-slate-300 transition-all shadow-sm">
                <CardContent className="p-5">
                  {editingId === card.id ? (
                    <div className="space-y-4">
                      {/* Edit Mode */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Front (Cloze syntax: {'{{c1::answer::hint}}'})
                        </label>
                        <Textarea
                          value={editFront}
                          onChange={(e) => setEditFront(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Back (Explanation / Answer details)
                        </label>
                        <Textarea
                          value={editBack}
                          onChange={(e) => setEditBack(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Tags (comma separated)
                        </label>
                        <Input
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          placeholder="Cardiology, Pediatrics, USMLE"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={cancelEdit}
                          className="h-9 px-3"
                        >
                          <X size={15} className="mr-1" />
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => saveEdit(card.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white h-9 px-3"
                        >
                          <Check size={15} className="mr-1" />
                          Save Card
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                            Card #{index + 1}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {card.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-[10px] text-slate-500 py-0 px-1.5 h-5">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="pt-1">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Front (Cloze deletion)
                          </h4>
                          <p className="text-slate-800 text-sm leading-relaxed font-medium">
                            {renderClozeFront(card.front)}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Back (Context / Explanation)
                          </h4>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {card.back}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1.5 shrink-0 self-start">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(card)}
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Card"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCard(card.id)}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                          title="Delete Card"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add More Section */}
      <Card className="border-dashed border-2 border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 mt-6 shadow-none">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 text-sm">Expand this set</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate additional unique high-yield cards from the original text stem.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="e.g., 'Focus more on symptoms' or 'Generate pharmacology cards'"
              value={moreInstructions}
              onChange={(e) => setMoreInstructions(e.target.value)}
              className="bg-white border-slate-200"
              disabled={isAddingMore}
            />
            <Button
              onClick={handleAddMoreClick}
              disabled={isAddingMore}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isAddingMore ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Generating New Cards...
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" />
                  Generate 2-3 More Cards
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
