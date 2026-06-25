import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Save, Globe, Cpu, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { AppSettings } from '../types';
import { updateSettings, getSettings } from '../lib/gemini';
import { toast } from 'sonner';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    updateSettings(settings);
    toast.success("Settings saved successfully!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              <CardTitle className="text-xl">Settings</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
              &times;
            </Button>
          </div>
          <CardDescription>
            Configure AI generators and preferences.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          {/* Compact Switcher */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Integration Provider</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
              <button
                type="button"
                onClick={() => setSettings(s => ({ ...s, provider: 'gemini' }))}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  settings.provider === 'gemini'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Gemini
              </button>
              <button
                type="button"
                onClick={() => setSettings(s => ({ ...s, provider: 'local' }))}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  settings.provider === 'local'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                Local
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {settings.provider === 'gemini' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gemini-model" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gemini Model</Label>
                  <select 
                    id="gemini-model"
                    className="w-full h-11 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                    value={settings.geminiModel}
                    onChange={(e) => setSettings(s => ({ ...s, geminiModel: e.target.value }))}
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended - Balanced)</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra Fast)</option>
                    <option value="gemini-flash-latest">Gemini Flash (Latest Stable)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (High Quality)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gemini API Key</Label>
                  <div className="relative">
                    <Input
                      id="api-key"
                      type={showKey ? "text" : "password"}
                      placeholder="Enter your API key..."
                      value={settings.geminiApiKey}
                      onChange={(e) => setSettings(s => ({ ...s, geminiApiKey: e.target.value }))}
                      className="pr-10 h-11 rounded-lg border-slate-200 focus:ring-blue-500 text-sm font-mono placeholder:font-sans placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    Get a free key from 
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-0.5 font-semibold"
                    >
                      Google AI Studio <ExternalLink size={10} />
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="endpoint" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Local Endpoint</Label>
                  <Input
                    id="endpoint"
                    placeholder="http://localhost:11434/v1"
                    value={settings.localEndpoint}
                    onChange={(e) => setSettings(s => ({ ...s, localEndpoint: e.target.value }))}
                    className="h-11 rounded-lg border-slate-200 focus:ring-blue-500 text-sm font-mono placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model Name</Label>
                  <Input
                    id="model"
                    placeholder="llama3, mistral, etc."
                    value={settings.localModel}
                    onChange={(e) => setSettings(s => ({ ...s, localModel: e.target.value }))}
                    className="h-11 rounded-lg border-slate-200 focus:ring-blue-500 text-sm font-mono placeholder:text-slate-400"
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                  <strong>Requirement:</strong> You must have <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold">Ollama</a> or similar running locally with an OpenAI-compatible API.
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
