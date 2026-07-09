import { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceProvider';
import { realtimeService } from '../services/realtimeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Cpu, FileText, HardDrive, ShieldAlert, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { SearchResultDto } from '@/features/storage/types';
import type { DuplicateGroupDto, OcrStatistics, DuplicateStatsDto, ActivityTimelineDto } from '../types';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  type?: 'text' | 'duplicates' | 'search' | 'stats' | 'ocr' | 'activity';
  data?: any;
}

interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiAssistantPanel({ isOpen, onClose }: AiAssistantPanelProps) {
  const { currentWorkspace } = useWorkspace();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Hello! I am your Enterprise Assistant. I can check storage stats, search files, analyze OCR telemetry, and identify duplicate groups. How can I help you today?',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Escapes raw strings for safe rendering
  const escapeHtml = (unsafe: string): string => {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Keyboard shortcut Ctrl+/ to toggle is handled in parent, ESC here
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap inside panel when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Scroll to bottom on message updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const lower = userText.toLowerCase();

      // Command: Search
      if (lower.startsWith('search ') || lower.startsWith('find ')) {
        const query = userText.substring(userText.indexOf(' ') + 1).trim();
        const searchResults = await realtimeService.assistantSearch(query, 0, 5);
        
        if (!searchResults.content || searchResults.content.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'assistant',
              text: `No files found matching query: "${escapeHtml(query)}"`,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'assistant',
              text: `Here are the top search results for "${escapeHtml(query)}":`,
              type: 'search',
              data: searchResults.content,
            },
          ]);
        }
      }
      // Command: Duplicate files
      else if (lower.includes('duplicate') || lower.includes('cleanup')) {
        const report = await realtimeService.getDuplicateReport();
        const stats = await realtimeService.getDuplicateStats();

        if (report.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'assistant',
              text: 'Great news! No duplicate files were found in this system. Your storage is optimized.',
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'assistant',
              text: `Found ${report.length} groups of duplicate files. You can save up to ${formatSize(stats.potentialSavingsBytes)}!`,
              type: 'duplicates',
              data: { report, stats },
            },
          ]);
        }
      }
      // Command: OCR statistics
      else if (lower.includes('ocr') || lower.includes('index')) {
        const ocrStats = await realtimeService.getOcrStatistics();
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: 'Here is the current operational log for the OCR Indexing Workers:',
            type: 'ocr',
            data: ocrStats,
          },
        ]);
      }
      // Command: Storage Statistics
      else if (lower.includes('storage') || lower.includes('usage') || lower.includes('quota')) {
        const stats = await realtimeService.getDuplicateStats();
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: 'Here is the platform storage utilization and diagnostic insight:',
            type: 'stats',
            data: stats,
          },
        ]);
      }
      // Command: Activity logs
      else if (lower.includes('activity') || lower.includes('recent') || lower.includes('log')) {
        if (!currentWorkspace) {
          setMessages((prev) => [
            ...prev,
            { sender: 'assistant', text: 'Please switch to a workspace first to inspect activity logs.' },
          ]);
        } else {
          const act = await realtimeService.getWorkspaceActivity(currentWorkspace.id, 0, 5);
          setMessages((prev) => [
            ...prev,
            {
              sender: 'assistant',
              text: 'Here are the 5 most recent activity entries for this workspace:',
              type: 'activity',
              data: act.content,
            },
          ]);
        }
      }
      // Help / Fallback
      else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `I didn't quite catch that. Here are the simple commands I can parse:
- **search [query]** (e.g. search invoices)
- **duplicate files** / **cleanup suggestions**
- **ocr statistics**
- **storage usage**
- **recent activity**`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'An error occurred while fetching information from the server contracts.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-card border-l shadow-2xl flex flex-col transition-all duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Enterprise AI Command Assistant Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600">
            <Cpu className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1">
              Command Assistant
              <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
            </h3>
            <p className="text-[10px] text-muted-foreground">NLP Platform Controller</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full"
          aria-label="Close Assistant Panel"
        >
          <X className="h-4.5 w-4.5" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={index} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <Avatar className="h-7 w-7 border shrink-0">
                  <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-[10px]">AI</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[75%] rounded-xl p-3 text-xs leading-relaxed space-y-2 ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-muted rounded-tl-none text-foreground border'}`}>
                {/* Text Message */}
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Rich Data Renderers */}
                {msg.type === 'search' && msg.data && (
                  <div className="space-y-1.5 pt-1.5 border-t border-muted-foreground/10">
                    {(msg.data as SearchResultDto[]).map((file) => (
                      <div key={file.fileId} className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-background/50 dark:bg-background/20 p-1.5 rounded border border-indigo-100 dark:border-indigo-900/30">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{escapeHtml(file.filename || 'Unnamed')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.type === 'duplicates' && msg.data && (
                  <div className="space-y-1.5 pt-1.5 border-t border-muted-foreground/10 text-[11px]">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold mb-1">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span>{msg.data.report.length} Redundant Clusters</span>
                    </div>
                    <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                      {(msg.data.report as DuplicateGroupDto[]).slice(0, 3).map((group, idx) => (
                        <div key={idx} className="bg-background/40 p-1.5 rounded border border-amber-100 dark:border-amber-950/30">
                          <p className="font-bold truncate text-[10px]">{escapeHtml(group.duplicates[0]?.name || 'Duplicate file')}</p>
                          <span className="text-[9px] text-muted-foreground">Wasting {formatSize(group.potentialSavings)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.type === 'ocr' && msg.data && (
                  <div className="space-y-1 pt-1.5 border-t border-muted-foreground/10 text-[10px]">
                    <div className="flex justify-between">
                      <span>Total Processed:</span>
                      <span className="font-bold">{(msg.data as OcrStatistics).processedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Processing:</span>
                      <span className="font-bold text-indigo-600">{(msg.data as OcrStatistics).processingCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className="font-bold text-emerald-600">{(msg.data as OcrStatistics).successRate.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {msg.type === 'stats' && msg.data && (
                  <div className="space-y-1.5 pt-1.5 border-t border-muted-foreground/10 text-[10px]">
                    <div className="flex items-center gap-1 text-emerald-600 font-bold mb-1">
                      <HardDrive className="h-3.5 w-3.5" />
                      <span>Deduplication Storage Registry</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duplicate Files Count:</span>
                      <span className="font-bold">{(msg.data as DuplicateStatsDto).duplicateFilesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Potential Space Recovered:</span>
                      <span className="font-bold text-emerald-600">{formatSize((msg.data as DuplicateStatsDto).potentialSavingsBytes)}</span>
                    </div>
                  </div>
                )}

                {msg.type === 'activity' && msg.data && (
                  <div className="space-y-1.5 pt-1.5 border-t border-muted-foreground/10 text-[10px]">
                    {(msg.data as ActivityTimelineDto[]).map((act) => (
                      <div key={act.id} className="bg-background/30 p-1.5 rounded border border-muted-foreground/5 text-[9px] space-y-0.5">
                        <span className="font-bold block">{escapeHtml(act.username)}</span>
                        <p className="text-muted-foreground">{escapeHtml(act.description)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-7 w-7 border shrink-0">
              <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-[10px]">AI</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-xl rounded-tl-none p-3 text-xs text-muted-foreground flex items-center gap-1.5 border">
              <LoadingSpinner size={16} />
              <span>Analyzing database contracts...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t bg-muted/20 flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask stats, duplicate or search..."
          className="h-9 text-xs focus-visible:ring-indigo-600"
          aria-label="Ask assistant command input"
          disabled={loading}
        />
        <Button
          type="submit"
          size="sm"
          className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700"
          disabled={!input.trim() || loading}
          aria-label="Submit Assistant command"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
