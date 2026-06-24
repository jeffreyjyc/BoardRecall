import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Save, Globe, Cpu, ExternalLink, Download, Upload, Database, FileJson, AlertTriangle } from 'lucide-react';
import { AppSettings, QuestionSet } from '../types';
import { updateSettings, getSettings } from '../lib/gemini';
import { toast } from 'sonner';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [activeModalTab, setActiveModalTab] = useState<'ai' | 'backup'>('ai');
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updateSettings(settings);
    toast.success("Settings saved successfully!");
    onClose();
  };

  const handleExportBackup = () => {
    try {
      // 1. Get history from localStorage
      const historyStr = localStorage.getItem('boardrecall_history') || '[]';
      const history: QuestionSet[] = JSON.parse(historyStr);

      // 2. Build unified backup payload
      const backupPayload = {
        app: 'boardrecall',
        version: '1.0.0',
        exportedAt: Date.now(),
        settings: settings,
        history: history
      };

      // 3. Trigger download
      const jsonString = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `boardrecall_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Backup file exported and downloaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate backup export.");
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const backup = JSON.parse(text);

        // Simple validation
        if (!backup || backup.app !== 'boardrecall') {
          toast.error("Invalid backup file. Please select a valid BoardRecall backup JSON file.");
          return;
        }

        // Parse backup settings and history
        const backupSettings = backup.settings as AppSettings | undefined;
        const backupHistory = backup.history as QuestionSet[] | undefined;

        let importSuccess = false;

        // 1. Restore/Merge settings
        if (backupSettings) {
          updateSettings(backupSettings);
          setSettings(backupSettings);
          importSuccess = true;
        }

        // 2. Restore/Merge history
        if (backupHistory && Array.isArray(backupHistory)) {
          const currentHistoryStr = localStorage.getItem('boardrecall_history') || '[]';
          let currentHistory: QuestionSet[] = [];
          try {
            currentHistory = JSON.parse(currentHistoryStr);
          } catch (e) {
            currentHistory = [];
          }

          let finalHistory: QuestionSet[] = [];

          if (importMode === 'overwrite') {
            finalHistory = backupHistory;
          } else {
            // Merge mode: combine arrays based on unique set ID
            const historyMap = new Map<string, QuestionSet>();
            // Add current items first
            currentHistory.forEach(item => {
              if (item && item.id) historyMap.set(item.id, item);
            });
            // Add backup items (overwriting duplicates with newer/backup versions)
            backupHistory.forEach(item => {
              if (item && item.id) historyMap.set(item.id, item);
            });
            finalHistory = Array.from(historyMap.values());
            // Sort by createdAt descending
            finalHistory.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          }

          localStorage.setItem('boardrecall_history', JSON.stringify(finalHistory));
          importSuccess = true;
        }

        if (importSuccess) {
          toast.success("Backup restored successfully! App will now refresh to apply changes.");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toast.error("The backup file did not contain any valid history or settings.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to parse backup file. Please ensure it is a valid, uncorrupted JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              <CardTitle className="text-xl">Settings & Backup</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
              &times;
            </Button>
          </div>
          <CardDescription>
            Configure AI generators and manage extension data backup.
          </CardDescription>
        </CardHeader>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-100 flex gap-4">
          <button
            onClick={() => setActiveModalTab('ai')}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
              activeModalTab === 'ai' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            AI Configuration
          </button>
          <button
            onClick={() => setActiveModalTab('backup')}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
              activeModalTab === 'backup' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Backup & Restore
          </button>
        </div>

        <CardContent className="space-y-6 pt-4">
          {activeModalTab === 'ai' ? (
            <>
              <Tabs value={settings.provider} onValueChange={(v) => setSettings(s => ({ ...s, provider: v as any }))}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="gemini" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Gemini
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
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended - Balanced)</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra Fast)</option>
                      <option value="gemini-flash-latest">Gemini Flash (Latest Stable)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (High Quality)</option>
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
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              {/* Export Section */}
              <div className="p-3 border border-slate-100 rounded-lg bg-slate-50 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="bg-blue-100 p-1.5 rounded text-blue-600 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Export Backup</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                      Save a local copy of all study history sets, cards, and custom preferences in a single JSON file.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleExportBackup} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 h-9 text-xs"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  Download Backup File (.json)
                </Button>
              </div>

              {/* Import Section */}
              <div className="p-3 border border-slate-100 rounded-lg space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="bg-emerald-100 p-1.5 rounded text-emerald-600 shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Restore Backup</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                      Restore history and API configurations from a previously downloaded JSON backup file.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-600">Import strategy:</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`py-1.5 px-3 text-xs font-medium border rounded-md transition-all ${
                          importMode === 'merge' 
                            ? 'bg-blue-50 border-blue-500 text-blue-700' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Merge (Add sets)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('overwrite')}
                        className={`py-1.5 px-3 text-xs font-medium border rounded-md transition-all ${
                          importMode === 'overwrite' 
                            ? 'bg-red-50 border-red-500 text-red-700' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Overwrite (Full replace)
                      </button>
                    </div>
                  </div>

                  {importMode === 'overwrite' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Warning: Overwriting will replace all current flashcard history.</span>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportBackup}
                    accept=".json"
                    className="hidden"
                  />

                  <Button
                    onClick={triggerFileInput}
                    variant="outline"
                    className="w-full border-slate-200 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center gap-1.5 h-9 text-xs"
                  >
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    Select & Import Backup File
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500 hover:text-slate-800">
                  Close Settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
