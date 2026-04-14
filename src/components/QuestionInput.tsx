import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePlus, X, Send, Loader2, Info, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface QuestionInputProps {
  onGenerate: (text: string, images: string[], instructions: string) => void;
  isGenerating: boolean;
}

export function QuestionInput({ onGenerate, isGenerating }: QuestionInputProps) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExtension = typeof chrome !== 'undefined' && !!chrome.tabs;

  useEffect(() => {
    if (!isExtension) return;

    // Listen for storage changes (from content script copy events)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.lastCopiedText?.newValue) {
        setText(String(changes.lastCopiedText.newValue));
        toast.success("Text synced from page!");
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    
    // Initial check for any previously copied text
    chrome.storage.local.get(['lastCopiedText'], (result) => {
      if (result.lastCopiedText && !text) {
        setText(String(result.lastCopiedText));
      }
    });

    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [isExtension, text]);

  const handleGrabFromPage = async () => {
    if (!isExtension) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      chrome.tabs.sendMessage(tab.id, { action: "extractContent" }, (response) => {
        if (chrome.runtime.lastError) {
          toast.error("Could not access page. Make sure you are on UWorld or TrueLearn and the extension is active.");
          return;
        }
        if (response?.content) {
          setText(response.content);
          toast.success("Content grabbed from page!");
        } else {
          toast.error("No content found on page.");
        }
      });
    } catch (error) {
      console.error("Error grabbing content:", error);
      toast.error("Failed to grab content.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!text && images.length === 0) return;
    onGenerate(text, images, instructions);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-semibold text-slate-800">New Question</CardTitle>
        <CardDescription>
          Paste text or upload images from UWorld, TrueLearn, or other sources.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="question-text" className="text-sm font-medium text-slate-600">
              Question & Explanation Text
            </Label>
            {isExtension && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-600 border-green-200 gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Sync Active
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGrabFromPage}
                  className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 gap-1.5"
                >
                  <MousePointer2 size={14} />
                  Grab from Page
                </Button>
              </div>
            )}
          </div>
          <Textarea
            id="question-text"
            placeholder="Paste the question and its detailed explanation here..."
            className="min-h-[200px] resize-none focus-visible:ring-blue-500"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-600">Images (Optional)</Label>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence>
              {images.map((img, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group"
                >
                  <img
                    src={img}
                    alt={`Upload ${index}`}
                    className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-400 hover:text-blue-500"
            >
              <ImagePlus size={24} />
              <span className="text-[10px] mt-1 font-medium">Add Image</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="custom-instructions" className="text-sm font-medium text-slate-600 flex items-center gap-1">
              Custom Instructions
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info size={14} className="text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Tell the AI to focus on specific topics, change the difficulty, or use a particular style.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600 hover:text-blue-700 h-7 px-2"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              {showInstructions ? 'Hide' : 'Add Instructions'}
            </Button>
          </div>
          
          <AnimatePresence>
            {showInstructions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Input
                  id="custom-instructions"
                  placeholder="e.g., 'Focus on pharmacology and mechanisms of action'"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="mt-1 focus-visible:ring-blue-500"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6"
          disabled={isGenerating || (!text && images.length === 0)}
          onClick={handleSubmit}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing Question...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Generate Flashcards
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
