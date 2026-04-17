import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Check, Edit2, X, Plus, Sparkles, Loader2, Download } from 'lucide-react';
import { Flashcard } from '../types';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface FlashcardEditorProps {
  cards: Flashcard[];
  onUpdate: (cards: Flashcard[]) => void;
  onAddMore: (instructions: string) => void;
  isAddingMore: boolean;
}

import { v4 as uuidv4 } from 'uuid';

export function FlashcardEditor({ cards, onUpdate, onAddMore, isAddingMore }: FlashcardEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Flashcard | null>(null);
  const [addMoreInstructions, setAddMoreInstructions] = useState('');
  const [showAddMoreOptions, setShowAddMoreOptions] = useState(false);

  const startEditing = (card: Flashcard) => {
    setEditingId(card.id);
    setEditForm({ ...card });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (!editForm) return;
    onUpdate(cards.map(c => c.id === editForm.id ? editForm : c));
    setEditingId(null);
    setEditForm(null);
  };

  const deleteCard = (id: string) => {
    onUpdate(cards.filter(c => c.id !== id));
  };

  const addNewCard = () => {
    const newCard: Flashcard = {
      id: uuidv4(),
      front: '',
      back: '',
      tags: [],
      hint: ''
    };
    onUpdate([...cards, newCard]);
    startEditing(newCard);
  };

  const exportToAnki = () => {
    if (cards.length === 0) {
      toast.error("No cards to export");
      return;
    }

    // Format: Cloze Text | Back Info
    // The cards now already contain {{c1::...}} syntax
    const content = cards.map(card => {
      return `${card.front} | ${card.back}`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boardrecall_anki_export_${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Exported to Anki format (.txt)");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-sm py-4 z-10 border-b border-slate-200 px-4 -mx-4 gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">Review Flashcards</h2>
          <p className="text-xs text-slate-500">{cards.length} cards generated</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToAnki}
            className="text-green-600 border-green-200 hover:bg-green-50 h-8 text-xs shrink-0"
            title="Export to Anki"
          >
            <Download className="sm:mr-2 h-4 w-4" />
            <span className="hidden min-[450px]:inline">Export to Anki</span>
            <span className="min-[450px]:hidden">Export</span>
          </Button>

          <AnimatePresence mode="wait">
            {!showAddMoreOptions ? (
              <motion.div
                key="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="shrink-0"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMoreOptions(true)}
                  disabled={isAddingMore}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 text-xs"
                >
                  {isAddingMore ? <Loader2 className="sm:mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="sm:mr-2 h-4 w-4" />}
                  <span className="hidden min-[450px]:inline">AI Add More</span>
                  <span className="min-[450px]:hidden">Add+</span>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-1 bg-white border border-blue-200 rounded-md p-0.5 shadow-sm max-w-full"
              >
                <Input
                  placeholder="Instructions..."
                  value={addMoreInstructions}
                  onChange={(e) => setAddMoreInstructions(e.target.value)}
                  className="h-7 text-xs w-24 min-w-[60px] sm:w-40 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onAddMore(addMoreInstructions);
                    if (e.key === 'Escape') setShowAddMoreOptions(false);
                  }}
                />
                <Button 
                  size="sm" 
                  className="h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold shrink-0"
                  onClick={() => onAddMore(addMoreInstructions)}
                  disabled={isAddingMore}
                >
                  {isAddingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-1.5 text-slate-400 hover:text-slate-600 shrink-0"
                  onClick={() => setShowAddMoreOptions(false)}
                >
                  <X size={14} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="outline"
            size="sm"
            onClick={addNewCard}
            className="text-slate-600 h-8 text-xs shrink-0"
          >
            <Plus className="sm:mr-2 h-4 w-4" />
            <span className="hidden min-[450px]:inline">Manual Add</span>
            <span className="min-[450px]:hidden">Add</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {cards.map((card) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className={`border-slate-200 transition-all ${editingId === card.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}>
                <CardContent className="p-6">
                  {editingId === card.id ? (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase text-slate-400">Front (Anki Cloze Style)</Label>
                        <Textarea
                          value={editForm?.front}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, front: e.target.value } : null)}
                          placeholder="The {{c1::blank::hint}} is..."
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase text-slate-400">Back (Explanation)</Label>
                        <Textarea
                          value={editForm?.back}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, back: e.target.value } : null)}
                          placeholder="Detailed context..."
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={cancelEditing}>
                          <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                        <Button size="sm" onClick={saveEdit} className="bg-blue-600 hover:bg-blue-700">
                          <Check className="mr-2 h-4 w-4" /> Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap gap-1">
                          {card.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] font-medium">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => startEditing(card)}>
                            <Edit2 size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => deleteCard(card.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400 mb-1">Front</p>
                          <p className="text-slate-800 font-medium leading-relaxed">
                            {card.front.split(/(\{\{c\d::.*?\}\})/).map((part, i) => {
                              const match = part.match(/\{\{c\d::(.*?)(?:::(.*?))?\}\}/);
                              if (match) {
                                const answer = match[1];
                                const hint = match[2];
                                return (
                                  <span key={i} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-bold mx-0.5">
                                    {answer}
                                    {hint && <span className="text-[10px] text-blue-400 ml-1 font-normal italic">({hint})</span>}
                                  </span>
                                );
                              }
                              return part;
                            })}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-xs font-bold uppercase text-slate-400 mb-1">Back</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{card.back}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
