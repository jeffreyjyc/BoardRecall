import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Save, Globe, Cpu, ExternalLink, Zap } from 'lucide-react';
import { AppSettings } from '../types';
import { updateSettings, getSettings } from '../lib/gemini';
import { toast } from 'sonner';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  const handleSave = () => {
    updateSettings(settings);
    toast.success("Settings saved successfully!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              <CardTitle className="text-xl">AI Settings</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              &times;
            </Button>
          </div>
          <CardDescription>
            Configure how your flashcards are generated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={settings.provider} onValueChange={(v) => setSettings(s => ({ ...s, provider: v as any }))}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gemini" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Gemini
              </TabsTrigger>
              <TabsTrigger value="openai" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                OpenAI
              </TabsTrigger>
              <TabsTrigger value="local" className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Local
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gemini" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="gemini-model">Gemini Model</Label>
                <select 
                  id="gemini-model"
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={settings.geminiModel}
                  onChange={(e) => setSettings(s => ({ ...s, geminiModel: e.target.value }))}
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Balanced)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Highest Quality)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key">Gemini API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key..."
                  value={settings.geminiApiKey}
                  onChange={(e) => setSettings(s => ({ ...s, geminiApiKey: e.target.value }))}
                />
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  Get a free key from 
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    Google AI Studio <ExternalLink size={10} />
                  </a>
                </p>
              </div>
            </TabsContent>

            <TabsContent value="openai" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="openai-model">OpenAI Model</Label>
                <select 
                  id="openai-model"
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={settings.openaiModel}
                  onChange={(e) => setSettings(s => ({ ...s, openaiModel: e.target.value }))}
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
                  <option value="gpt-4o">GPT-4o (High Quality)</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={settings.openaiApiKey}
                  onChange={(e) => setSettings(s => ({ ...s, openaiApiKey: e.target.value }))}
                />
                <p className="text-[10px] text-slate-500">
                  Requires a paid OpenAI API account.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="local" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint">Local Endpoint</Label>
                <Input
                  id="endpoint"
                  placeholder="http://localhost:11434/v1"
                  value={settings.localEndpoint}
                  onChange={(e) => setSettings(s => ({ ...s, localEndpoint: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model Name</Label>
                <Input
                  id="model"
                  placeholder="llama3, mistral, etc."
                  value={settings.localModel}
                  onChange={(e) => setSettings(s => ({ ...s, localModel: e.target.value }))}
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Requirement:</strong> You must have <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Ollama</a> or a similar tool running locally with an OpenAI-compatible API.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
