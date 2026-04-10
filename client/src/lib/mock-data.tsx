import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { analyzeIntent as analyzeIntentAI } from "./ai";
import type { IntentSignal, IntentPattern, DetectionResult } from "./passive-detection";
import { processNewSignal } from "./passive-detection";
import { inputManager, type SourceType } from "./input-sources";
import { keystrokeMonitor } from "./keystroke-monitor";
import { buildUserBehaviorProfile, type UserBehaviorProfile } from "./behavior-profile";
import { buildPsychProfile, type PsychProfile, type BehaviorMemoryLike } from "./psych-engine";
import { savePsychProfile, getPsychProfile } from "./psych-storage";
import { calculateAdaptiveDeadline } from "./adaptive-deadlines";
import { calculateAdaptivePactSize } from "./adaptive-pact-size";
import { getRecoveryPlan } from "./identity-recovery";
import { getIntegrityIdentity } from "./integrity-identity";

// Types
export type User = {
  id: string;
  email: string;
  creditBalance: number;
};

export type CreditTransaction = {
  id: string;
  userId: string;
  type: 'purchase' | 'spend' | 'refund';
  amount: number;
  balanceAfter: number;
  description: string;
  stripePaymentIntentId?: string;
  relatedCommitmentId?: string;
  createdAt: string;
};

export type Intent = {
  id: string;
  text: string;
  category: string;
  goal: string;
  first_action: string;
  reflection: string;
  confidence: number;
  suggested_stake: number;
  deadline?: string | null;
  deadline_reason?: string | null;
  pact_size_reason?: string | null;
  pact_size_level?: string | null;
  parsed_intent?: {
    category?: string;
    proof_method?: string;
  };
};

export type Commitment = {
  id: string;
  intentId: string;
  intent: Intent;
  actionText: string | null;
  creditsCost: number; // Changed from stakeAmount
  consequenceType: 'money' | 'social' | 'escalate';
  scheduledDate: string;
  status: 'scheduled' | 'completed' | 'missed';
  refundOnCompletion: boolean; // Whether to refund credits if completed
  witness?: {
    name: string;
    contact?: string | null;
    relationship?: string | null;
  } | null;
  ai_plan?: any;
};

type AppContextType = {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;

  behaviorProfile: UserBehaviorProfile;
  psychProfile: PsychProfile | null;
  refreshPsychProfile: () => void;
  
  currentIntent: Intent | null;
  analyzeIntent: (text: string) => Promise<void>;
  clearCurrentIntent: () => void;
  
  // Credits
  creditBalance: number;
  creditTransactions: CreditTransaction[];
  purchaseCredits: (amount: number, paymentIntentId: string) => Promise<void>;
  
  commitments: Commitment[];
  createCommitment: (config: { creditsCost: number; consequenceType: Commitment['consequenceType']; scheduledDate: Date; refundOnCompletion?: boolean; actionText?: string | null; stakeAmount?: number | null; proofMethod?: string | null; aiPlan?: any; witness?: Commitment["witness"]; }) => Promise<Commitment>;
  completeCommitment: (id: string) => Promise<void>;
  markMissed: (id: string) => Promise<void>;
  
  // Passive Detection
  intentSignals: IntentSignal[];
  intentPatterns: IntentPattern[];
  captureSignal: (text: string, sourceType?: SourceType) => Promise<DetectionResult | null>;
  loadDemoData: () => void;
  getActivePatterns: () => IntentPattern[];
  dismissPattern: (patternId: string) => void;
  lockInPattern: (patternId: string) => void;
  syncInputSources: () => Promise<number>;
  syncInputSource: (sourceType: SourceType) => Promise<number>;
  
  // Debug
  runMissCheck: () => Promise<string>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [psychProfile, setPsychProfile] = useState<PsychProfile | null>(null);
  
  // Passive detection state
  const [intentSignals, setIntentSignals] = useState<IntentSignal[]>([]);
  const [intentPatterns, setIntentPatterns] = useState<IntentPattern[]>([]);

  const creditBalance = user?.creditBalance ?? 0;

  const behaviorProfile = useMemo(
    () =>
      buildUserBehaviorProfile({
        commitments,
        intentPatterns,
        intentSignals,
      }),
    [commitments, intentPatterns, intentSignals]
  );

  const behaviorMemory = useMemo<BehaviorMemoryLike>(() => {
    const categoryRates: Record<string, number> = {};
    behaviorProfile.categories.forEach((c) => {
      categoryRates[c.category] = c.completion_rate;
    });

    const mapTime = (value: string | null | undefined): "morning" | "afternoon" | "evening" | "unknown" => {
      if (value === "morning" || value === "afternoon" || value === "evening") return value;
      return "unknown";
    };

    return {
      summary: {
        strongestCategory: behaviorProfile.strongestCategory,
        weakestCategory: behaviorProfile.weakestCategory,
        bestTimeOfDay: mapTime(behaviorProfile.bestTimeOfDay),
        worstTimeOfDay: mapTime(behaviorProfile.worstTimeOfDay),
        commonFailureReason: behaviorProfile.commonFailureReason,
        bluffTopics: behaviorProfile.bluffTopics,
      },
      raw: {
        completionRate: behaviorProfile.completionRate,
        totalCompleted: behaviorProfile.stats.completed_commitments,
        totalMissed: behaviorProfile.stats.missed_commitments,
        categoryRates,
      },
      insights: behaviorProfile.identitySummary,
    };
  }, [behaviorProfile]);

  const integrityScore = useMemo(() => Math.round((behaviorProfile.completionRate ?? 0) * 100), [behaviorProfile.completionRate]);

  // Initialize with some dummy data if we want, or clean slate
  useEffect(() => {
    // Check local storage for persisted "mock" session
    const storedUser = localStorage.getItem('intent_mock_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      // Ensure email is always present (fix for older localStorage data)
      if (parsed && !parsed.email) {
        parsed.email = 'user@example.com';
      }
      setUser(parsed);
    } else {
      // Demo-mode convenience: seed a guest user so flows work without email login
      const guestUser: User = {
        id: 'guest_demo_user',
        email: 'guest@lockstep.demo',
        creditBalance: 100,
      };
      setUser(guestUser);
      localStorage.setItem('intent_mock_user', JSON.stringify(guestUser));
    }
    
    const storedCommitments = localStorage.getItem('intent_mock_commitments');
    if (storedCommitments) setCommitments(JSON.parse(storedCommitments));
    
    const storedTransactions = localStorage.getItem('intent_mock_transactions');
    if (storedTransactions) setCreditTransactions(JSON.parse(storedTransactions));
    
    const storedSignals = localStorage.getItem('intent_mock_signals');
    if (storedSignals) setIntentSignals(JSON.parse(storedSignals));
    
    const storedPatterns = localStorage.getItem('intent_mock_patterns');
    if (storedPatterns) setIntentPatterns(JSON.parse(storedPatterns));

    const storedPsychProfile = getPsychProfile();
    if (storedPsychProfile) setPsychProfile(storedPsychProfile);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('intent_mock_user', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('intent_mock_commitments', JSON.stringify(commitments));
  }, [commitments]);
  
  useEffect(() => {
    localStorage.setItem('intent_mock_transactions', JSON.stringify(creditTransactions));
  }, [creditTransactions]);
  
  useEffect(() => {
    localStorage.setItem('intent_mock_signals', JSON.stringify(intentSignals));
  }, [intentSignals]);
  
  useEffect(() => {
    localStorage.setItem('intent_mock_patterns', JSON.stringify(intentPatterns));
  }, [intentPatterns]);

  const refreshPsychProfile = () => {
    const profile = buildPsychProfile({
      behaviorMemory,
      commitments,
      integrityScore,
    });

    setPsychProfile(profile);
    savePsychProfile(profile);
  };

  useEffect(() => {
    const profile = buildPsychProfile({
      behaviorMemory,
      commitments,
      integrityScore,
    });

    setPsychProfile(profile);
    savePsychProfile(profile);
  }, [behaviorMemory, commitments, integrityScore]);

  const login = async (email: string) => {
    // Simulate magic link delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Ensure email is never undefined
    const safeEmail = email?.trim() || 'user@example.com';
    
    // Give new users 100 starter credits to try the app
    const newUser = { id: 'user_123', email: safeEmail, creditBalance: 100 };
    setUser(newUser);
    localStorage.setItem('intent_mock_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('intent_mock_user');
  };

  const purchaseCredits = async (amount: number, paymentIntentId: string) => {
    if (!user) throw new Error("No user logged in");
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate payment processing
    
    const newBalance = user.creditBalance + amount;
    const transaction: CreditTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      type: 'purchase',
      amount,
      balanceAfter: newBalance,
      description: `Purchased ${amount} credits`,
      stripePaymentIntentId: paymentIntentId,
      createdAt: new Date().toISOString(),
    };
    
    setUser({ ...user, creditBalance: newBalance });
    setCreditTransactions(prev => [transaction, ...prev]);
  };

  const analyzeIntent = async (text: string) => {
    try {
      const profileForRequest = buildUserBehaviorProfile({
        commitments,
        intentPatterns,
        intentSignals,
        currentIntentText: text,
      });

      const result = await analyzeIntentAI(text, {
        behaviorProfile: profileForRequest,
        psychProfile,
      });

      // Heuristic difficulty (1-5) derived from stake pressure.
      const difficulty = Math.max(1, Math.min(5, Math.round((result.suggested_stake ?? 10) / 20) || 1));

      // Lightweight calendar pressure proxy from recent calendar signals.
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentCalendarSignals = intentSignals.filter(
        (s) => s.sourceType === "calendar" && new Date(s.detectedAt).getTime() >= sevenDaysAgo
      ).length;

      const calendarRiskLevel: "low" | "medium" | "high" =
        recentCalendarSignals >= 8 ? "high" : recentCalendarSignals >= 3 ? "medium" : "low";

      const adaptiveDeadline = calculateAdaptiveDeadline({
        baseDeadline: null,
        difficulty,
        integrityScore,
        bestTimeOfDay: behaviorMemory?.summary?.bestTimeOfDay,
        worstTimeOfDay: behaviorMemory?.summary?.worstTimeOfDay,
        calendarRiskLevel,
      });

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recentMissCount = commitments.filter(
        (c) => c.status === "missed" && new Date(c.scheduledDate).getTime() >= thirtyDaysAgo
      ).length;

      const pactSize = calculateAdaptivePactSize({
        action: result.first_action || result.goal,
        category: result.category,
        difficulty,
        integrityScore,
        weakestCategory: behaviorMemory?.summary?.weakestCategory,
        strongestCategory: behaviorMemory?.summary?.strongestCategory,
        recentMisses: recentMissCount,
      });

      const mergedReflection = result.reflection || "Pact structure reviewed.";
      
      const mockAnalysis: Intent = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        category: result.category,
        goal: pactSize.adjustedAction,
        first_action: result.first_action || `Start: ${pactSize.adjustedAction}`,
        reflection: `${mergedReflection} Task size adjusted because ${pactSize.reason.toLowerCase()} Deadline set because ${adaptiveDeadline.reason.toLowerCase()}`,
        confidence: result.confidence,
        suggested_stake: result.suggested_stake,
        deadline: new Date(adaptiveDeadline.suggestedDeadline).toLocaleString(),
        deadline_reason: adaptiveDeadline.reason,
        pact_size_reason: pactSize.reason,
        pact_size_level: pactSize.sizeLevel,
      };

      // Apply recovery system if user is in low integrity state
      const recoveryPlan = getRecoveryPlan(integrityScore);
      if (recoveryPlan.mode !== "none") {
        const integrityIdentity = getIntegrityIdentity(integrityScore);
        
        // Enhance reflection with recovery guidance
        mockAnalysis.reflection = `${mockAnalysis.reflection} RECOVERY MODE: ${recoveryPlan.instruction}`;
        
        // Override deadline to recovery recommendation if more aggressive
        if (recoveryPlan.deadlineHint === "Same-day only" || recoveryPlan.deadlineHint === "Today") {
          const recoveryDeadline = new Date();
          if (recoveryPlan.deadlineHint === "Same-day only") {
            // Set to 2-3 hours from now
            recoveryDeadline.setHours(recoveryDeadline.getHours() + 2.5);
          } else {
            // Set to end of today
            recoveryDeadline.setHours(23, 59, 59, 999);
          }
          mockAnalysis.deadline = recoveryDeadline.toLocaleString();
          mockAnalysis.deadline_reason = `Recovery mode: ${recoveryPlan.reason}`;
        }

        console.log("[Mock Supabase] Recovery plan applied:", {
          mode: recoveryPlan.mode,
          integrityLevel: integrityIdentity.level,
          headline: recoveryPlan.headline,
          instruction: recoveryPlan.instruction,
        });
      }
      
      setCurrentIntent(mockAnalysis);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      throw error;
    }
  };

  const clearCurrentIntent = () => setCurrentIntent(null);

  const createCommitment = async ({ creditsCost, consequenceType, scheduledDate, refundOnCompletion = true, actionText, stakeAmount, proofMethod, aiPlan, witness, }: { creditsCost: number; consequenceType: Commitment['consequenceType']; scheduledDate: Date; refundOnCompletion?: boolean; actionText?: string | null; stakeAmount?: number | null; proofMethod?: string | null; aiPlan?: any; witness?: Commitment["witness"]; }) => {
    if (!currentIntent) throw new Error("No intent found");
    if (!user) throw new Error("No user logged in");
    if (user.creditBalance < creditsCost) throw new Error("Insufficient credits");
    
    // Validate scheduled date is in the future
    const scheduledTime = scheduledDate.getTime();
    const now = new Date().getTime();
    if (scheduledTime <= now) {
      throw new Error("Scheduled date must be in the future");
    }
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    
    // Deduct credits
    const newBalance = user.creditBalance - creditsCost;
    const spendTransaction: CreditTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      type: 'spend',
      amount: creditsCost,
      balanceAfter: newBalance,
      description: `Locked in: ${currentIntent.text.slice(0, 50)}...`,
      createdAt: new Date().toISOString(),
    };
    
    const newCommitment: Commitment = {
      id: Math.random().toString(36).substr(2, 9),
      intentId: currentIntent.id,
      intent: currentIntent,
      actionText: currentIntent?.first_action ?? currentIntent?.goal ?? currentIntent?.text ?? null,
      creditsCost,
      consequenceType,
      scheduledDate: scheduledDate.toISOString(),
      status: 'scheduled',
      refundOnCompletion,
      witness: witness ?? null,
    };
    
    spendTransaction.relatedCommitmentId = newCommitment.id;
    
    setUser({ ...user, creditBalance: newBalance });
    setCreditTransactions(prev => [spendTransaction, ...prev]);
    setCommitments(prev => [newCommitment, ...prev]);
    setCurrentIntent(null);
    return newCommitment;
  };

  const completeCommitment = async (id: string) => {
    if (!user) throw new Error("No user logged in");
    
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
    
    const commitment = commitments.find(c => c.id === id);
    if (!commitment) throw new Error("Commitment not found");
    
    // Refund credits if enabled
    if (commitment.refundOnCompletion) {
      const newBalance = user.creditBalance + commitment.creditsCost;
      const refundTransaction: CreditTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        type: 'refund',
        amount: commitment.creditsCost,
        balanceAfter: newBalance,
        description: `Refund for completing: ${commitment.intent.text.slice(0, 50)}...`,
        relatedCommitmentId: commitment.id,
        createdAt: new Date().toISOString(),
      };
      
      setUser({ ...user, creditBalance: newBalance });
      setCreditTransactions(prev => [refundTransaction, ...prev]);
    }
    
    setCommitments(prev => prev.map(c => c.id === id ? { ...c, status: 'completed' } : c));
  };

  const markMissed = async (id: string) => {
    setCommitments(prev => prev.map(c => c.id === id ? { ...c, status: 'missed' } : c));
  };

  const runMissCheck = async () => {
    const now = new Date();
    let missedCount = 0;
    const updatedCommitments = commitments.map(c => {
      if (c.status === 'scheduled' && new Date(c.scheduledDate) < now) {
        missedCount++;
        return { ...c, status: 'missed' as const };
      }
      return c;
    });
    
    if (missedCount > 0) {
      setCommitments(updatedCommitments);
    }
    return `Checked for missed commitments. Found ${missedCount}.`;
  };
  
  // Passive Detection Methods
  
  const captureSignal = async (text: string, sourceType: SourceType = "manual"): Promise<DetectionResult | null> => {
    if (!user) throw new Error("User not logged in");

    // Create new signal
    const signal = await inputManager.captureManualSignal(user.id, text);
    signal.sourceType = sourceType;

    try {
      // Process through detection algorithm (now async)
      const { updatedPattern, detectionResult } = await processNewSignal(signal, intentPatterns);

      // Update state
      setIntentSignals(prev => [...prev, signal]);

      // Update or add pattern
      setIntentPatterns(prev => {
        const existingIndex = prev.findIndex(p => p.id === updatedPattern.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = updatedPattern;
          return updated;
        }
        return [...prev, updatedPattern];
      });

      return detectionResult;
    } catch (error) {
      console.log("Signal processing skipped:", error);
      // Still save the signal even if low confidence
      setIntentSignals(prev => [...prev, signal]);
      return null;
    }
  };

  const loadDemoData = () => {
    // Pre-populate with realistic examples
    const demoSignals: IntentSignal[] = [
      {
        id: 'demo_signal_1',
        userId: user?.id || '',
        sourceType: 'voice_note',
        rawText: 'I really need to start working out more consistently',
        detectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        normalizedIntent: 'start working out',
        category: 'fitness',
        confidence: 0.85,
        processed: true,
      },
      {
        id: 'demo_signal_2',
        userId: user?.id || '',
        sourceType: 'message',
        rawText: 'Should probably start going to the gym three times a week',
        detectedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        normalizedIntent: 'go gym',
        category: 'fitness',
        confidence: 0.78,
        processed: true,
      },
      {
        id: 'demo_signal_3',
        userId: user?.id || '',
        sourceType: 'journal',
        rawText: 'Thinking about finally launching that side project',
        detectedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        normalizedIntent: 'launch side project',
        category: 'work',
        confidence: 0.72,
        processed: true,
      },
      {
        id: 'demo_signal_4',
        userId: user?.id || '',
        sourceType: 'calendar',
        rawText: 'Need to call mom this weekend',
        detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        normalizedIntent: 'call mom',
        category: 'social',
        confidence: 0.92,
        processed: true,
      },
      {
        id: 'demo_signal_5',
        userId: user?.id || '',
        sourceType: 'voice_note',
        rawText: 'I keep saying I should call mom but never do',
        detectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        normalizedIntent: 'call mom',
        category: 'social',
        confidence: 0.88,
        processed: true,
      },
      {
        id: 'demo_signal_6',
        userId: user?.id || '',
        sourceType: 'message',
        rawText: 'Really should quit scrolling social media so much',
        detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        normalizedIntent: 'quit scrolling social media',
        category: 'habits',
        confidence: 0.81,
        processed: true,
      },
    ];

    const demoPatterns: IntentPattern[] = [
      {
        id: 'demo_pattern_1',
        userId: user?.id || '',
        normalizedIntent: 'call mom',
        category: 'social',
        firstDetectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastDetectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        occurrenceCount: 2,
        daySpan: 1,
        status: 'active',
        suggestedStake: 25,
        relatedSignalIds: ['demo_signal_4', 'demo_signal_5'],
      },
      {
        id: 'demo_pattern_2',
        userId: user?.id || '',
        normalizedIntent: 'start working out',
        category: 'fitness',
        firstDetectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastDetectedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        occurrenceCount: 2,
        daySpan: 3,
        status: 'active',
        suggestedStake: 50,
        relatedSignalIds: ['demo_signal_1', 'demo_signal_2'],
      },
    ];

    setIntentSignals(demoSignals);
    setIntentPatterns(demoPatterns);
  };
  
  const getActivePatterns = (): IntentPattern[] => {
    return intentPatterns.filter(p => p.status === "active");
  };
  
  const dismissPattern = (patternId: string) => {
    setIntentPatterns(prev =>
      prev.map(p => (p.id === patternId ? { ...p, status: "dismissed" as const } : p))
    );
  };
  
  const lockInPattern = (patternId: string) => {
    const pattern = intentPatterns.find(p => p.id === patternId);
    if (!pattern) return;
    
    // Set as current intent for lock-in flow
    const intent: Intent = {
      id: Math.random().toString(36).substr(2, 9),
      text: pattern.normalizedIntent,
      category: pattern.category,
      goal: pattern.normalizedIntent,
      first_action: "Complete first action within 24 hours",
      reflection: `You've mentioned this ${pattern.occurrenceCount} times over ${pattern.daySpan} days. Time to put your money where your mouth is.`,
      confidence: 0.9,
      suggested_stake: pattern.suggestedStake || 10,
    };
    
    setCurrentIntent(intent);
    setIntentPatterns(prev =>
      prev.map(p => (p.id === patternId ? { ...p, status: "locked" as const } : p))
    );
  };
  
  const syncInputSources = async () => {
    if (!user) return 0;

    // Sync all connected sources
    const newSignals = await inputManager.syncAllSources(user.id);

    // Process each signal (async)
    for (const signal of newSignals) {
      try {
        const { updatedPattern } = await processNewSignal(signal, intentPatterns);

        setIntentPatterns(prev => {
          const existingIndex = prev.findIndex(p => p.id === updatedPattern.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = updatedPattern;
            return updated;
          }
          return [...prev, updatedPattern];
        });
      } catch (error) {
        console.log("Signal processing skipped:", error);
      }
    }

    setIntentSignals(prev => [...prev, ...newSignals]);
    return newSignals.length;
  };

  const syncInputSource = async (sourceType: SourceType) => {
    if (!user) return 0;

    const newSignals = await inputManager.syncSource(user.id, sourceType);

    for (const signal of newSignals) {
      try {
        const { updatedPattern } = await processNewSignal(signal, intentPatterns);

        setIntentPatterns(prev => {
          const existingIndex = prev.findIndex(p => p.id === updatedPattern.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = updatedPattern;
            return updated;
          }
          return [...prev, updatedPattern];
        });
      } catch (error) {
        console.log("Signal processing skipped:", error);
      }
    }

    setIntentSignals(prev => [...prev, ...newSignals]);
    return newSignals.length;
  };

  // Initialize keystroke monitor when user is logged in and passive detection is enabled
  useEffect(() => {
    const passiveDetectionEnabled = localStorage.getItem("passiveDetectionEnabled") === "true";

    if (user && passiveDetectionEnabled) {
      console.log("[AppProvider] Initializing keystroke monitor for user:", user.id);

      // Set up handler for detected keystroke sessions (now fully async)
      keystrokeMonitor.enable(async (session, text) => {
        console.log("[AppProvider] Keystroke session detected, capturing signal");
        try {
          await captureSignal(text, "manual");
        } catch (error) {
          console.error("[AppProvider] Failed to capture keystroke signal:", error);
        }
      });
    } else {
      keystrokeMonitor.disable();
    }

    return () => {
      keystrokeMonitor.disable();
    };
  }, [user]); // Only depend on user, not the async function

  return (
    <AppContext.Provider value={{
      user,
      login,
      logout,
      behaviorProfile,
      psychProfile,
      refreshPsychProfile,
      currentIntent,
      analyzeIntent,
      clearCurrentIntent,
      creditBalance,
      creditTransactions,
      purchaseCredits,
      commitments,
      createCommitment,
      completeCommitment,
      markMissed,
      intentSignals,
      intentPatterns,
      captureSignal,
      loadDemoData,
      getActivePatterns,
      dismissPattern,
      lockInPattern,
      syncInputSources,
      syncInputSource,
      runMissCheck
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
