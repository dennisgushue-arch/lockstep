import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import { hydrateBehaviorProfileFromLocalStorage, type UserBehaviorProfile } from '@/lib/behavior-profile';
import {
  detectCalendarPatterns,
  getUpcomingEvents,
  hasCalendarConnected,
} from '@/lib/calendar-connector';
import {
  AlertTriangle,
  Calendar,
  Lightbulb,
  BookOpen,
  Mic,
  TrendingUp,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { analytics } from '@/lib/analytics';

interface Recommendation {
  id: string;
  source: 'voice_note' | 'calendar_analysis' | 'journal';
  intent: string;
  emotion?: string;
  obstacles?: string;
  suggestedStake: number;
  deadline: string;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  confidenceScore: number;
  behaviorAdjusted?: boolean;
  behaviorAdjustmentNote?: string;
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inferIntentCategory(intent: string): string {
  const lower = intent.toLowerCase();

  if (/\b(workout|exercise|run|gym|fitness|health|diet|walk|sleep)\b/.test(lower)) return 'fitness';
  if (/\b(work|business|project|career|launch|build|ship)\b/.test(lower)) return 'work';
  if (/\b(learn|study|read|course|skill|practice)\b/.test(lower)) return 'growth';
  if (/\b(family|friend|relationship|call|visit|date)\b/.test(lower)) return 'social';
  if (/\b(scroll|screen|phone|social media|drink|smoke)\b/.test(lower)) return 'consumption';

  return 'other';
}

function escalateRisk(base: Recommendation['riskLevel'], steps: number): Recommendation['riskLevel'] {
  const order: Recommendation['riskLevel'][] = ['low', 'medium', 'high'];
  const currentIndex = order.indexOf(base);
  const nextIndex = clamp(0, currentIndex + steps, order.length - 1);
  return order[nextIndex];
}

function applyBehaviorProfileToRecommendation(
  recommendation: Recommendation,
  behaviorProfile: UserBehaviorProfile | null
): Recommendation {
  if (!behaviorProfile) return recommendation;

  const completionRate = Number(behaviorProfile.stats.completion_rate ?? 0);
  const overdueCount = Number(behaviorProfile.stats.active_overdue_count ?? 0);
  const category = inferIntentCategory(recommendation.intent);
  const categoryPerf = behaviorProfile.categories.find((c) => c.category === category);

  let stakeDelta = 0;
  let riskEscalation = 0;

  if (completionRate > 0 && completionRate < 0.45) {
    stakeDelta += 3;
    riskEscalation += 1;
  }

  if (overdueCount > 0) {
    stakeDelta += 2;
    riskEscalation += 1;
  }

  if (categoryPerf && categoryPerf.total >= 2 && categoryPerf.completion_rate < 0.5) {
    stakeDelta += 2;
    riskEscalation += 1;
  }

  // Calendar overload recommendations should stay low-friction by design
  if (recommendation.source === 'calendar_analysis') {
    stakeDelta = Math.max(0, stakeDelta - 2);
    riskEscalation = Math.max(0, riskEscalation - 1);
  }

  const adjustedStake = clamp(3, recommendation.suggestedStake + stakeDelta, 50);
  const adjustedRisk = escalateRisk(recommendation.riskLevel, clamp(0, riskEscalation, 2));
  const stakeChanged = adjustedStake !== recommendation.suggestedStake;
  const riskChanged = adjustedRisk !== recommendation.riskLevel;
  const behaviorAdjusted = stakeChanged || riskChanged;

  const behaviorLine = recommendation.source === 'calendar_analysis'
    ? behaviorProfile.psych.pattern_warning
    : behaviorProfile.psych.next_pressure_line;

  const adjustedReasoning = `${recommendation.reasoning} ${behaviorLine}`.trim();
  const adjustedConfidence = clamp(40, recommendation.confidenceScore + (stakeDelta > 0 ? 5 : 0), 95);

  return {
    ...recommendation,
    suggestedStake: adjustedStake,
    riskLevel: adjustedRisk,
    reasoning: adjustedReasoning,
    confidenceScore: adjustedConfidence,
    behaviorAdjusted,
    behaviorAdjustmentNote: behaviorAdjusted
      ? 'Stake/risk adjusted from your behavior profile'
      : undefined,
  };
}

export function RecommendationsPage() {
  const { user } = useApp();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [calendarPattern, setCalendarPattern] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [showJournal, setShowJournal] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      // Check calendar connection
      const hasCalendar = await hasCalendarConnected();
      setCalendarConnected(hasCalendar);

      // Load recommendations
      const recs = await loadRecommendations();
      setRecommendations(recs);

      // Load calendar pattern if connected
      if (hasCalendar) {
        try {
          const pattern = await detectCalendarPatterns();
          setCalendarPattern(pattern);
        } catch (calendarError) {
          console.error('Calendar pattern detection failed:', calendarError);
          // Non-blocking - continue with other recommendations
        }
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      // Set empty recommendations to prevent blank screen
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRecommendations(): Promise<Recommendation[]> {
    const behaviorProfile = hydrateBehaviorProfileFromLocalStorage();
    const recommendations: Recommendation[] = [];

    const extractJournalIntents = (text: string): string[] => {
      const lines = text
        .split(/[.!?\n]+/)
        .map((line) => line.trim())
        .filter(Boolean);

      return lines.filter((line) =>
        /\b(want to|need to|should|must|have to|going to|plan to|intend to)\b/i.test(
          line
        )
      );
    };

    const loadJournalSignals = () => {
      if (typeof window === 'undefined' || !window.localStorage) return [] as string[];
      try {
        const raw = window.localStorage.getItem('intent_checkins');
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Array<{
          note?: string;
          proof?: string;
          createdAt?: string;
        }>;
        if (!Array.isArray(parsed)) return [];
        const combined = parsed
          .slice(0, 10)
          .map((entry) => [entry.note?.trim(), entry.proof?.trim()].filter(Boolean).join('\n'))
          .filter(Boolean)
          .join('\n');
        return extractJournalIntents(combined).slice(0, 3);
      } catch {
        return [];
      }
    };

    // Load pending voice note recommendations
    const { data: voiceNotes } = await supabase
      .from('voice_notes')
      .select('*')
      .eq('user_id', user?.id)
      .is('created_as_commitment', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (voiceNotes) {
      voiceNotes.forEach((note: any) => {
        if (note.extracted_intent) {
          recommendations.push({
            id: `voice_${note.id}`,
            source: 'voice_note',
            intent: note.extracted_intent,
            emotion: note.emotion,
            obstacles: note.obstacles,
            suggestedStake: note.suggested_stake || 5,
            deadline: '7 days',
            riskLevel: 'medium',
            reasoning: `From your voice note: "${note.emotion || 'determined'}". You identified obstacles: ${note.obstacles || 'unknown'}.`,
            confidenceScore: note.confidence_score || 75,
          });
        }
      });
    }

    const journalIntents = loadJournalSignals();
    journalIntents.forEach((intent, index) => {
      recommendations.push({
        id: `journal_${index}_${intent.slice(0, 12)}`,
        source: 'journal',
        intent,
        suggestedStake: 5,
        deadline: '7 days',
        riskLevel: 'low',
        reasoning: 'From your journal check-ins. Consider making this a pact.',
        confidenceScore: 60,
      });
    });

    // Load calendar pattern recommendations
    if (calendarConnected && calendarPattern) {
      const { likelyFailureRisk, daysOverbooked, suggestions } = calendarPattern;

      if (daysOverbooked > 0) {
        recommendations.push({
          id: 'calendar_overload',
          source: 'calendar_analysis',
          intent: `Reduce new commitments—you have ${daysOverbooked} overbooked day(s)`,
          suggestedStake: 3,
          deadline: '7 days',
          riskLevel: likelyFailureRisk,
          reasoning: suggestions[0] || 'Your calendar shows high overload',
          confidenceScore: 85,
        });
      }
    }

    return recommendations.map((recommendation) =>
      applyBehaviorProfileToRecommendation(recommendation, behaviorProfile)
    );
  }

  async function acceptRecommendation(rec: Recommendation) {
    // Create commitment from recommendation
    try {
      const deadline = new Date();
      const days = parseInt(rec.deadline.split(' ')[0]);
      deadline.setDate(deadline.getDate() + days);

      await supabase.from('commitments').insert({
        user_id: user?.id,
        intent: rec.intent,
        action_text: null,
        stake: rec.suggestedStake,
        deadline: deadline.toISOString(),
        source: rec.source,
      });

      // Mark voice note as used
      if (rec.source === 'voice_note') {
        const voiceNoteId = rec.id.replace('voice_', '');
        await supabase
          .from('voice_notes')
          .update({ created_as_commitment: true })
          .eq('id', voiceNoteId);
      }

      // Reload recommendations
      await loadData();
      analytics.track('recommendation_accepted', {
        source: rec.source,
        stake: rec.suggestedStake,
        riskLevel: rec.riskLevel,
      });
    } catch (error) {
      console.error('Error creating commitment:', error);
      analytics.error('Failed to accept recommendation', {
        source: rec.source,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <p className="text-gray-400">Loading recommendations...</p>
      </div>
    );
  }

  const visibleRecommendations = showJournal
    ? recommendations
    : recommendations.filter((rec) => rec.source !== 'journal');
  const journalCount = recommendations.filter(
    (rec) => rec.source === 'journal'
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Your Commitment Opportunities
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-gray-400">
              AI-extracted intents from your voice notes, journal, and calendar analysis
            </p>
            <button
              type="button"
              onClick={() => setShowJournal((prev) => !prev)}
              disabled={journalCount === 0}
              className={cn(
                'text-xs px-2 py-1 rounded-full border transition-colors',
                journalCount === 0
                  ? 'border-zinc-800 bg-zinc-900/20 text-zinc-600 cursor-not-allowed'
                  : showJournal
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              )}
            >
              Journal {showJournal ? 'ON' : 'OFF'} · {journalCount}
            </button>
          </div>
        </div>

        {/* Calendar Status */}
        {!calendarConnected && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-300 font-semibold mb-2">
                  Connect Your Calendar
                </p>
                <p className="text-blue-200/80 text-sm mb-3">
                  Link Google Calendar to get AI-powered insights about overload
                  and optimal commitment timing.
                </p>
                <Link href="/connected-sources">
                  <button className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                    Connect Calendar
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Pattern Alert */}
        {calendarConnected && calendarPattern?.likelyFailureRisk === 'high' && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-300 font-semibold mb-1">
                  High Calendar Overload
                </p>
                <p className="text-red-200/80 text-sm">
                  {calendarPattern?.suggestions[0]}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Grid */}
        {visibleRecommendations.length > 0 ? (
          <div className="space-y-4">
            {visibleRecommendations.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  'p-6 rounded-lg border transition-all',
                  rec.source === 'voice_note'
                    ? 'bg-green-500/5 border-green-500/30'
                    : rec.source === 'journal'
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-amber-500/5 border-amber-500/30'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    {rec.source === 'voice_note' ? (
                      <Mic className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    ) : rec.source === 'journal' ? (
                      <BookOpen className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                    ) : (
                      <Calendar className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {rec.intent}
                      </h3>
                      {rec.behaviorAdjusted && (() => {
                        const badgeCls = {
                          voice_note:       'border-green-400/40 bg-green-500/10 text-green-200',
                          journal:          'border-amber-400/40 bg-amber-500/10 text-amber-200',
                          calendar_analysis:'border-blue-400/40  bg-blue-500/10  text-blue-200',
                        }[rec.source] ?? 'border-zinc-400/40 bg-zinc-500/10 text-zinc-300';
                        return (
                          <span
                            className={cn(
                              'inline-flex items-center mt-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide',
                              badgeCls
                            )}
                            title={rec.behaviorAdjustmentNote}
                          >
                            Behavior-adjusted
                          </span>
                        );
                      })()}
                      <p className="text-sm text-gray-400 mt-1">
                        {rec.reasoning}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Confidence
                    </p>
                    <p className="text-lg font-bold text-white">
                      {rec.confidenceScore}%
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {/* Emotion (if voice note) */}
                  {rec.emotion && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                        Emotion
                      </label>
                      <p className="text-white">{rec.emotion}</p>
                    </div>
                  )}

                  {/* Risk Level */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                      Risk Level
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full',
                          rec.riskLevel === 'high'
                            ? 'bg-red-500'
                            : rec.riskLevel === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        )}
                      ></div>
                      <span className="text-white capitalize">{rec.riskLevel}</span>
                    </div>
                  </div>

                  {/* Stake */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                      Suggested Stake
                    </label>
                    <p className="text-white font-semibold">
                      {rec.suggestedStake} credits
                    </p>
                  </div>
                </div>

                {/* Obstacles (if voice note) */}
                {rec.obstacles && (
                  <div className="mb-4 p-3 bg-black/30 rounded">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                      Identified Obstacles
                    </p>
                    <p className="text-gray-300">{rec.obstacles}</p>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => acceptRecommendation(rec)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <CheckCircle className="w-4 h-4" />
                  CREATE THIS PACT ({rec.suggestedStake} credits)
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Lightbulb className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">
              No recommendations yet. Start creating commitments!
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/voice-notes">
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                  Record Voice Note
                </button>
              </Link>
              <Link href="/connected-sources">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Connect Calendar
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
