import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Mic, 
  MessageSquare, 
  Mail, 
  BookOpen,
  ArrowLeft,
  Check,
  AlertCircle,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceConnection {
  source_type: string;
  is_connected: boolean;
  last_synced_at: string | null;
  connected_at: string | null;
  sync_status: 'idle' | 'syncing' | 'error';
  sync_error_message: string | null;
}

export default function ConnectedSources() {
  const [sources, setSources] = useState<Record<string, SourceConnection>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [journalStats, setJournalStats] = useState<{
    count: number;
    lastSyncedAt: string | null;
  }>({ count: 0, lastSyncedAt: null });

  useEffect(() => {
    loadSourceConnections();
  }, []);

  async function loadSourceConnections() {
    loadJournalStats();
    const { data, error } = await supabase
      .from('user_source_connections')
      .select('*')
      .order('source_type');

    if (!error && data) {
      const sourceMap = data.reduce((acc: Record<string, SourceConnection>, conn: SourceConnection) => {
        acc[conn.source_type] = conn;
        return acc;
      }, {} as Record<string, SourceConnection>);
      setSources(sourceMap);
    }

    setLoading(false);
  }

  function loadJournalStats() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const raw = window.localStorage.getItem('intent_checkins');
      const entries = raw ? (JSON.parse(raw) as unknown[]) : [];
      const lastSyncedAt = window.localStorage.getItem(
        'intent_checkins_last_sync'
      );
      setJournalStats({
        count: Array.isArray(entries) ? entries.length : 0,
        lastSyncedAt: lastSyncedAt || null,
      });
    } catch {
      setJournalStats({ count: 0, lastSyncedAt: null });
    }
  }

  async function connectGoogleCalendar() {
    // Redirect to OAuth flow
    window.location.href = `/api/auth/google-calendar`;
  }

  async function syncNow(sourceType: string) {
    setSyncing(sourceType);
    try {
      if (sourceType === 'journal') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(
            'intent_checkins_last_sync',
            new Date().toISOString()
          );
        }
        loadJournalStats();
        return;
      }
      await supabase.functions.invoke('sync_input_sources', {
        body: { user_id: 'all', source_type: sourceType }
      });
      await loadSourceConnections();
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncing(null);
    }
  }

  async function disconnectSource(sourceType: string) {
    await supabase
      .from('user_source_connections')
      .update({ is_connected: false })
      .eq('source_type', sourceType);
    
    await loadSourceConnections();
  }

  const sourceList = [
    {
      type: 'journal',
      label: 'Journal Check-ins',
      description: 'Capture intent from daily check-ins',
      icon: BookOpen,
      color: 'amber',
      phase: 1,
      ready: true
    },
    {
      type: 'google_calendar',
      label: 'Google Calendar',
      description: 'Track events, detect overload, find patterns',
      icon: Calendar,
      color: 'blue',
      phase: 1,
      ready: true
    },
    {
      type: 'voice_note',
      label: 'Voice Notes',
      description: 'Record your thinking, extract real commitments',
      icon: Mic,
      color: 'red',
      phase: 1,
      ready: true
    },
    {
      type: 'message',
      label: 'Text Messages',
      description: 'Share messages you receive (you control what)',
      icon: MessageSquare,
      color: 'cyan',
      phase: 2,
      ready: false
    },
    {
      type: 'email',
      label: 'Email Forwarding',
      description: 'Forward work commitments for context',
      icon: Mail,
      color: 'purple',
      phase: 2,
      ready: false
    }
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-slate-950 to-black px-4 py-10 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="pointer-events-none fixed inset-0 opacity-[0.035] z-0 noise-bg" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="border-cyan-600/50 text-cyan-400 hover:bg-cyan-950/30">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">CONNECTED SOURCES</h1>
            <p className="text-lg text-zinc-400">Your data. Your control. The AI's fuel.</p>
          </div>
        </div>

        {/* Info box */}
        <div className="border border-cyan-900/30 rounded-xl bg-gradient-to-br from-cyan-950/20 via-black to-black p-6 space-y-3">
          <div className="flex gap-3">
            <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-white">How This Works</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Connect your calendar, voice notes, and messages. We'll analyze what you're actually doing and suggest commitments that match your reality—not wishful thinking.
              </p>
            </div>
          </div>
        </div>

        {/* Sources */}
        <div className="space-y-4">
          {sourceList.map((source) => {
            const IconComponent = source.icon;
            const connection = sources[source.type];
            const isJournal = source.type === 'journal';
            const isConnected = isJournal
              ? journalStats.count > 0
              : connection?.is_connected;

            return (
              <div
                key={source.type}
                className={cn(
                  "border rounded-xl p-6 backdrop-blur-sm transition-all duration-300",
                  isConnected
                    ? "border-emerald-900/50 bg-gradient-to-r from-emerald-950/20 to-black"
                    : "border-zinc-800/50 bg-gradient-to-r from-zinc-900/20 to-black"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                      {
                        'bg-blue-950/50 text-blue-400': source.color === 'blue',
                        'bg-red-950/50 text-red-400': source.color === 'red',
                        'bg-cyan-950/50 text-cyan-400': source.color === 'cyan',
                        'bg-purple-950/50 text-purple-400': source.color === 'purple',
                        'bg-amber-950/50 text-amber-400': source.color === 'amber',
                      }
                    )}>
                      <IconComponent className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-white">{source.label}</h3>
                        {isConnected && (
                          <span className="text-[10px] px-2 py-1 border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 rounded font-bold">
                            ✓ CONNECTED
                          </span>
                        )}
                        {!source.ready && (
                          <span className="text-[10px] px-2 py-1 border border-zinc-600/50 bg-zinc-600/20 text-zinc-300 rounded font-bold">
                            COMING PHASE {source.phase}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">{source.description}</p>

                      {isConnected && isJournal && journalStats.lastSyncedAt && (
                        <p className="text-xs text-zinc-500 mt-2">
                          Last synced: {new Date(journalStats.lastSyncedAt).toLocaleDateString()}
                        </p>
                      )}

                      {isConnected && !isJournal && connection?.last_synced_at && (
                        <p className="text-xs text-zinc-500 mt-2">
                          Last synced: {new Date(connection.last_synced_at).toLocaleDateString()}
                        </p>
                      )}

                      {isJournal && (
                        <p className="text-xs text-zinc-500 mt-2">
                          Check-ins: {journalStats.count}
                        </p>
                      )}

                      {!isJournal && connection?.sync_status === 'error' && connection?.sync_error_message && (
                        <div className="mt-2 p-2 bg-red-950/30 border border-red-900/50 text-red-300 text-xs rounded">
                          {connection.sync_error_message}
                        </div>
                      )}
                    </div>
                  </div>

                  {source.ready && (
                    <div className="flex gap-2">
                      {isConnected ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => syncNow(source.type)}
                            disabled={syncing === source.type}
                            className="border-cyan-600/50 text-cyan-400 hover:bg-cyan-950/30"
                          >
                            {syncing === source.type ? 'Syncing…' : 'Sync Now'}
                          </Button>
                          {!isJournal && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => disconnectSource(source.type)}
                              className="border-red-600/50 text-red-400 hover:bg-red-950/30"
                            >
                              Disconnect
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          onClick={() => {
                            if (source.type === 'google_calendar') {
                              connectGoogleCalendar();
                            } else if (source.type === 'voice_note') {
                              // Just enable, no external auth needed
                              window.location.href = '/voice-notes';
                            } else if (source.type === 'journal') {
                              window.location.href = '/journal';
                            }
                          }}
                          className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-bold"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy notice */}
        <div className="border border-zinc-800/50 rounded-xl bg-gradient-to-b from-zinc-900/20 to-black p-6 space-y-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Privacy & Control
          </h3>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li>✓ We store only what you explicitly share</li>
            <li>✓ Raw audio is deleted after transcription</li>
            <li>✓ You can disconnect any source anytime</li>
            <li>✓ You see exactly what we extracted</li>
            <li>✓ All AI suggestions are optional—you decide</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
