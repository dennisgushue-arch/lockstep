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
import {
  getProofConfidence,
  type ProofMethod,
  type ProofSubmission,
} from "./proof";
import { calculateAdaptiveProof } from "./adaptive-proof";
import { syncNativeConsequenceNotifications } from "./native-consequence-notifications";
import { buildFirstPact, type FirstPactInput } from "@/lib/first-pact";
import { buildEscalationLadder, type EscalationStage } from "@/lib/escalation-ladder";
import {
  createEmptyNotificationState,
  markAppOpened,
  planPressureNotifications,
  readLastAppOpenedAt,
  type PressureNotificationState,
} from "./pressure-notifications";
import {
  schedulePactNotifications,
  cancelPactNotifications,
} from "@/lib/pact-notifications";

const MOCK_USER_STORAGE_KEY = "intent_mock_user";
const MOCK_COMMITMENTS_STORAGE_KEY = "intent_mock_commitments";
const MOCK_TRANSACTIONS_STORAGE_KEY = "intent_mock_transactions";
const MOCK_CASHOUTS_STORAGE_KEY = "intent_mock_cashout_requests";
const MOCK_SIGNALS_STORAGE_KEY = "intent_mock_signals";
const MOCK_PATTERNS_STORAGE_KEY = "intent_mock_patterns";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getDefaultMockUser(): User {
  return {
    id: "guest_demo_user",
    email: "guest@lockstep.demo",
    purchasedCreditsBalance: 100,
    earnedCreditsBalance: 0,
    creditBalance: 100,
  };
}

function readStoredJson<T>(key: string): T | null {
  if (!canUseLocalStorage()) return null;

  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getInitialUser(): User | null {
  const storedUser = readStoredJson<User>(MOCK_USER_STORAGE_KEY);

  if (storedUser) {
    const purchasedCreditsBalance =
      typeof storedUser.purchasedCreditsBalance === "number"
        ? storedUser.purchasedCreditsBalance
        : Math.max(storedUser.creditBalance ?? 0, 0);
    const earnedCreditsBalance =
      typeof storedUser.earnedCreditsBalance === "number"
        ? storedUser.earnedCreditsBalance
        : 0;

    return {
      ...storedUser,
      email: storedUser.email || "user@example.com",
      purchasedCreditsBalance,
      earnedCreditsBalance,
      creditBalance: purchasedCreditsBalance + earnedCreditsBalance,
    };
  }

  return getDefaultMockUser();
}

function getInitialPsychProfile(): PsychProfile | null {
  if (!canUseLocalStorage()) return null;
  return getPsychProfile();
}

// Types
export type User = {
  id: string;
  email: string;
  purchasedCreditsBalance: number;
  earnedCreditsBalance: number;
  creditBalance: number;
};

export type CreditTransaction = {
  id: string;
  userId: string;
  type: 'purchase' | 'spend' | 'earn' | 'cashout_request' | 'cashout_completed';
  amount: number;
  balanceAfter: number;
  description: string;
  purchasedPortion?: number;
  earnedPortion?: number;
  cashoutRequestId?: string;
  usdAmount?: number;
  stripePaymentIntentId?: string;
  relatedCommitmentId?: string;
  createdAt: string;
};

export type CashoutRequest = {
  id: string;
  userId: string;
  creditsRequested: number;
  usdAmount: number;
  status: "pending" | "completed";
  payoutMethod: "batch";
  requestedAt: string;
  processedAt?: string;
};

export type Intent = {
  id: string;
  text: string;
  category: string;
  goal: string;
  first_action: string;
  action?: string;
  stake?: number;
  reflection: string;
  confidence: number;
  suggested_stake: number;
  stake_reason?: string | null;
  deadline?: string | null;
  deadline_reason?: string | null;
  pact_size_reason?: string | null;
  pact_size_level?: string | null;
  proof_method?: string | null;
  proof_reason?: string | null;
  proof_confidence?: "low" | "medium" | "high" | null;
  ai_plan?: any;
  is_first_pact?: boolean;
  first_pact_reason?: string | null;
  escalation_stage?: EscalationStage | null;
  escalation_reason?: string | null;
  parsed_intent?: {
    category?: string;
    difficulty?: 1 | 2 | 3 | 4 | 5;
    proof_method?: string;
  };
};

export type Commitment = {
  id: string;
  intentId: string;
  intent: Intent;
  createdAt: string;
  actionText: string | null;
  creditsCost: number; // Changed from stakeAmount
  consequenceType: 'money' | 'social' | 'escalate';
  scheduledDate: string;
  status: 'scheduled' | 'completed' | 'missed';
  refundOnCompletion: boolean; // Whether to refund credits if completed
  proofMethod: ProofMethod;
  proofSubmission?: ProofSubmission | null;
  witness?: {
    name: string;
    contact?: string | null;
    relationship?: string | null;
  } | null;
  notificationIds?: string[];
  ai_plan?: any;
  notificationState: PressureNotificationState;
};

type AppContextType = {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;

  behaviorProfile: UserBehaviorProfile;
  psychProfile: PsychProfile | null;
  refreshPsychProfile: () => void;
  
  currentIntent: Intent | null;
  analyzeIntent: (text: string) => Promise<Intent>;
  clearCurrentIntent: () => void;
  
  // Credits
  creditBalance: number;
  purchasedCreditsBalance: number;
  earnedCreditsBalance: number;
  cashoutEligibleCredits: number;
  creditTransactions: CreditTransaction[];
  cashoutRequests: CashoutRequest[];
  purchaseCredits: (amount: number, paymentIntentId: string) => Promise<void>;
  requestCashout: (credits: number) => Promise<CashoutRequest>;
  processPendingCashouts: () => Promise<number>;
  
  commitments: Commitment[];
  createCommitment: (config: { creditsCost: number; consequenceType: Commitment['consequenceType']; scheduledDate: Date; refundOnCompletion?: boolean; actionText?: string | null; stakeAmount?: number | null; proofMethod?: ProofMethod | null; aiPlan?: any; witness?: Commitment["witness"]; }) => Promise<Commitment>;
  completeCommitment: (id: string, proofSubmission?: ProofSubmission | null) => Promise<void>;
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

function mapCategoryToFirstPact(category?: string): FirstPactInput["category"] {
  switch (category) {
    case "fitness":
      return "health";
    case "work":
      return "work";
    case "growth":
      return "money";
    case "social":
      return "relationships";
    default:
      return "personal";
  }
}

function getFallbackCreatedAt(scheduledDate: string) {
  const dueDate = new Date(scheduledDate);
  if (Number.isNaN(dueDate.getTime())) {
    return new Date().toISOString();
  }

  return new Date(dueDate.getTime() - 6 * 60 * 60 * 1000).toISOString();
}

function normalizeCommitment(commitment: Commitment): Commitment {
  return {
    ...commitment,
    createdAt: commitment.createdAt ?? getFallbackCreatedAt(commitment.scheduledDate),
    notificationIds: commitment.notificationIds ?? [],
    notificationState: commitment.notificationState ?? createEmptyNotificationState(),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getInitialUser());
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>(() => {
    const stored = readStoredJson<Commitment[]>(MOCK_COMMITMENTS_STORAGE_KEY) ?? [];
    return stored.map((commitment) => normalizeCommitment(commitment));
  });
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>(() => readStoredJson<CreditTransaction[]>(MOCK_TRANSACTIONS_STORAGE_KEY) ?? []);
  const [cashoutRequests, setCashoutRequests] = useState<CashoutRequest[]>(() => readStoredJson<CashoutRequest[]>(MOCK_CASHOUTS_STORAGE_KEY) ?? []);
  const [psychProfile, setPsychProfile] = useState<PsychProfile | null>(() => getInitialPsychProfile());
  
  // Passive detection state
  const [intentSignals, setIntentSignals] = useState<IntentSignal[]>(() => readStoredJson<IntentSignal[]>(MOCK_SIGNALS_STORAGE_KEY) ?? []);
  const [intentPatterns, setIntentPatterns] = useState<IntentPattern[]>(() => readStoredJson<IntentPattern[]>(MOCK_PATTERNS_STORAGE_KEY) ?? []);

  const creditBalance = user?.creditBalance ?? 0;
  const purchasedCreditsBalance = user?.purchasedCreditsBalance ?? 0;
  const earnedCreditsBalance = user?.earnedCreditsBalance ?? 0;
  const cashoutEligibleCredits = earnedCreditsBalance;

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

  useEffect(() => {
    if (user) {
      localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(MOCK_COMMITMENTS_STORAGE_KEY, JSON.stringify(commitments));
  }, [commitments]);

  useEffect(() => {
    const lastAppOpenedAt = readLastAppOpenedAt();
    const { notifications, updatedCommitments } = planPressureNotifications(commitments, {
      now: Date.now(),
      worstTimeOfDay: behaviorProfile.worstTimeOfDay,
      lastAppOpenedAt,
    });

    const notificationStateChanged = updatedCommitments.some((commitment: Commitment, index: number) => {
      const before = commitments[index]?.notificationState;
      const after = commitment.notificationState;
      return JSON.stringify(before) !== JSON.stringify(after);
    });

    if (notificationStateChanged) {
      setCommitments(updatedCommitments);
      return;
    }

    void syncNativeConsequenceNotifications(notifications);
  }, [behaviorProfile.worstTimeOfDay, commitments]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateAppPresence = () => {
      markAppOpened();
      setCommitments((prev) => prev.map((commitment) => {
        if (commitment.status !== "scheduled") return commitment;
        if (commitment.proofSubmission) return commitment;
        if (new Date(commitment.scheduledDate).getTime() > Date.now()) return commitment;
        return {
          ...commitment,
          status: "missed",
        };
      }));
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updateAppPresence();
      }
    };

    updateAppPresence();
    const interval = window.setInterval(updateAppPresence, 60_000);
    window.addEventListener("focus", updateAppPresence);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", updateAppPresence);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
  
  useEffect(() => {
    localStorage.setItem(MOCK_TRANSACTIONS_STORAGE_KEY, JSON.stringify(creditTransactions));
  }, [creditTransactions]);

  useEffect(() => {
    localStorage.setItem(MOCK_CASHOUTS_STORAGE_KEY, JSON.stringify(cashoutRequests));
  }, [cashoutRequests]);
  
  useEffect(() => {
    localStorage.setItem(MOCK_SIGNALS_STORAGE_KEY, JSON.stringify(intentSignals));
  }, [intentSignals]);
  
  useEffect(() => {
    localStorage.setItem(MOCK_PATTERNS_STORAGE_KEY, JSON.stringify(intentPatterns));
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
    const newUser = {
      id: 'user_123',
      email: safeEmail,
      purchasedCreditsBalance: 100,
      earnedCreditsBalance: 0,
      creditBalance: 100,
    };
    setUser(newUser);
    localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(MOCK_USER_STORAGE_KEY);
  };

  const purchaseCredits = async (amount: number, paymentIntentId: string) => {
    if (!user) throw new Error("No user logged in");
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate payment processing
    
    const newPurchasedBalance = user.purchasedCreditsBalance + amount;
    const newBalance = newPurchasedBalance + user.earnedCreditsBalance;
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
    
    setUser({
      ...user,
      purchasedCreditsBalance: newPurchasedBalance,
      creditBalance: newBalance,
    });
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

      const adaptiveProof = calculateAdaptiveProof({
        category: result.category,
        difficulty,
        integrityScore,
        weakestCategory: behaviorMemory?.summary?.weakestCategory,
        strongestCategory: behaviorMemory?.summary?.strongestCategory,
        recentMisses: recentMissCount,
        hasWitness: false, // updated to true if witness is selected at lock-in
      });

      const mergedReflection = result.reflection || "Pact structure reviewed.";
      const completedCount = commitments.filter((c) => c.status === "completed").length;
      const isFirstPact = completedCount === 0;
      const normalizedDifficulty = (result.parsed_intent?.difficulty ?? difficulty) as 1 | 2 | 3 | 4 | 5;
      const normalizedCategory = mapCategoryToFirstPact(result.parsed_intent?.category ?? result.category);
      const firstPact = isFirstPact
        ? buildFirstPact({
            action: pactSize.adjustedAction,
            category: normalizedCategory,
            difficulty: normalizedDifficulty,
          })
        : null;
      const escalation = !isFirstPact
        ? buildEscalationLadder({
            action: pactSize.adjustedAction,
            category: normalizedCategory,
            completedCount,
            adaptiveStake: result.suggested_stake,
            adaptiveProofMethod: adaptiveProof.method,
            adaptiveSizeLevel: pactSize.sizeLevel,
          })
        : null;

      const resolvedAction = firstPact
        ? firstPact.action
        : escalation?.action ?? pactSize.adjustedAction;
      const resolvedDeadline = firstPact ? firstPact.deadlineAt : adaptiveDeadline.suggestedDeadline;
      const resolvedStake = firstPact
        ? firstPact.stake
        : escalation?.stake ?? result.suggested_stake;
      const resolvedProofMethod = firstPact
        ? firstPact.proofMethod
        : escalation?.proofMethod ?? adaptiveProof.method;
      const resolvedPactSizeLevel = firstPact
        ? "tiny"
        : escalation?.sizeLevel ?? pactSize.sizeLevel;
      const reflectionMessage = isFirstPact && firstPact
        ? `${result.risk?.at_risk_warning || "Pact structure reviewed."} ${firstPact.reason}`
        : escalation
          ? result.reflection_message || `${result.risk?.at_risk_warning || mergedReflection} ${escalation.reason}`
        : result.reflection_message || `${result.risk?.at_risk_warning || mergedReflection} Task size adjusted because ${pactSize.reason.toLowerCase()}`;

      const mockAnalysis: Intent = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        category: result.category,
        goal: resolvedAction,
        first_action:
          result.recommendation?.suggested_first_step ||
          result.first_action ||
          `Start: ${resolvedAction}`,
        action: resolvedAction,
        stake: resolvedStake,
        reflection: reflectionMessage,
        confidence: result.confidence,
        suggested_stake: resolvedStake,
        stake_reason: firstPact
          ? "First pacts use lower stakes to reduce friction and build belief."
          : escalation
            ? escalation.stakeReason
          : result.stake_reason || "Stake suggested from intent difficulty and current behavior pattern.",
        deadline: new Date(resolvedDeadline).toLocaleString(),
        deadline_reason: firstPact
          ? "First pacts use shorter deadlines to create a quick win."
          : result.deadline_reason || adaptiveDeadline.reason,
        pact_size_reason: firstPact
          ? "First pacts are intentionally reduced to something winnable."
          : escalation
            ? escalation.sizeReason
          : result.pact_size_reason || pactSize.reason,
        pact_size_level: resolvedPactSizeLevel,
        proof_method: resolvedProofMethod.replace("_", " "),
        proof_reason: firstPact
          ? "First pacts use low-friction proof so the system feels usable immediately."
          : escalation
            ? escalation.proofReason
          : result.proof_reason || adaptiveProof.reason,
        proof_confidence: firstPact ? "low" : result.proof_confidence || adaptiveProof.confidence,
        ai_plan: result.ai_plan ?? null,
        is_first_pact: isFirstPact,
        first_pact_reason: firstPact?.reason || null,
        escalation_stage: escalation?.stage || null,
        escalation_reason: escalation?.reason || null,
        parsed_intent: {
          category: result.parsed_intent?.category ?? result.category,
          difficulty: normalizedDifficulty,
          proof_method: resolvedProofMethod,
        },
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
      return mockAnalysis;
    } catch (error) {
      console.error("AI Analysis failed:", error);
      throw error;
    }
  };

  const clearCurrentIntent = () => setCurrentIntent(null);

  const createCommitment = async ({ creditsCost, consequenceType, scheduledDate, refundOnCompletion = true, actionText, stakeAmount, proofMethod, aiPlan, witness, }: { creditsCost: number; consequenceType: Commitment['consequenceType']; scheduledDate: Date; refundOnCompletion?: boolean; actionText?: string | null; stakeAmount?: number | null; proofMethod?: ProofMethod | null; aiPlan?: any; witness?: Commitment["witness"]; }) => {
    if (!currentIntent) throw new Error("No intent found");
    if (!user) throw new Error("No user logged in");
    if ((user.purchasedCreditsBalance + user.earnedCreditsBalance) < creditsCost) throw new Error("Insufficient credits");
    
    // Validate scheduled date is in the future
    const scheduledTime = scheduledDate.getTime();
    const now = new Date().getTime();
    if (scheduledTime <= now) {
      throw new Error("Scheduled date must be in the future");
    }
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    
    // Deduct purchased credits first, then earned credits
    const spendFromPurchased = Math.min(user.purchasedCreditsBalance, creditsCost);
    const spendFromEarned = creditsCost - spendFromPurchased;
    const newPurchasedBalance = user.purchasedCreditsBalance - spendFromPurchased;
    const newEarnedBalance = user.earnedCreditsBalance - spendFromEarned;
    const newBalance = newPurchasedBalance + newEarnedBalance;
    const spendTransaction: CreditTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      type: 'spend',
      amount: creditsCost,
      balanceAfter: newBalance,
      purchasedPortion: spendFromPurchased,
      earnedPortion: spendFromEarned,
      description: `Locked in: ${currentIntent.text.slice(0, 50)}...`,
      createdAt: new Date().toISOString(),
    };
    
    const newCommitment: Commitment = {
      id: Math.random().toString(36).substr(2, 9),
      intentId: currentIntent.id,
      intent: currentIntent,
      createdAt: new Date().toISOString(),
      actionText: actionText ?? currentIntent?.action ?? currentIntent?.first_action ?? currentIntent?.goal ?? currentIntent?.text ?? null,
      creditsCost,
      consequenceType,
      scheduledDate: scheduledDate.toISOString(),
      status: 'scheduled',
      refundOnCompletion,
      proofMethod: proofMethod ?? "checkin",
      proofSubmission: null,
      witness: witness ?? null,
      notificationIds: [],
      ai_plan: aiPlan ?? currentIntent?.ai_plan ?? null,
      notificationState: createEmptyNotificationState(),
    };

    const notificationIds = await schedulePactNotifications({
      pactId: newCommitment.id,
      actionText:
        newCommitment.actionText ||
        newCommitment.intent?.action ||
        newCommitment.intent?.text ||
        "Your pact",
      scheduledDate: newCommitment.scheduledDate,
    });

    newCommitment.notificationIds = notificationIds;
    
    spendTransaction.relatedCommitmentId = newCommitment.id;
    
    setUser({
      ...user,
      purchasedCreditsBalance: newPurchasedBalance,
      earnedCreditsBalance: newEarnedBalance,
      creditBalance: newBalance,
    });
    setCreditTransactions(prev => [spendTransaction, ...prev]);
    setCommitments(prev => [newCommitment, ...prev]);
    setCurrentIntent(null);
    return newCommitment;
  };

  const completeCommitment = async (id: string, proofSubmission?: ProofSubmission | null) => {
    if (!user) throw new Error("No user logged in");
    
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
    
    const commitment = commitments.find(c => c.id === id);
    if (!commitment) throw new Error("Commitment not found");

    await cancelPactNotifications(commitment.notificationIds || []);
    
    // Earn credits back if completion refund is enabled
    if (commitment.refundOnCompletion) {
      const newEarnedBalance = user.earnedCreditsBalance + commitment.creditsCost;
      const newBalance = user.purchasedCreditsBalance + newEarnedBalance;
      const earnTransaction: CreditTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        type: 'earn',
        amount: commitment.creditsCost,
        balanceAfter: newBalance,
        description: `Earned back for completing: ${commitment.intent.text.slice(0, 50)}...`,
        relatedCommitmentId: commitment.id,
        createdAt: new Date().toISOString(),
      };
      
      setUser({
        ...user,
        earnedCreditsBalance: newEarnedBalance,
        creditBalance: newBalance,
      });
      setCreditTransactions(prev => [earnTransaction, ...prev]);
    }
    
    setCommitments(prev => prev.map((c) => {
      if (c.id !== id) return c;

      const normalizedProof = proofSubmission
        ? {
            ...proofSubmission,
            confidence: proofSubmission.confidence ?? getProofConfidence(proofSubmission.method),
            submittedAt: proofSubmission.submittedAt || new Date().toISOString(),
          }
        : c.proofSubmission ?? null;

      return {
        ...c,
        status: 'completed',
        notificationIds: [],
        proofSubmission: normalizedProof,
        notificationState: createEmptyNotificationState(),
      };
    }));
  };

  const markMissed = async (id: string) => {
    const pact = commitments.find((c) => c.id === id);
    if (pact) {
      await cancelPactNotifications(pact.notificationIds || []);
    }

    setCommitments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: 'missed', notificationIds: [] }
          : c
      )
    );
  };

  const requestCashout = async (credits: number) => {
    if (!user) throw new Error("No user logged in");
    if (!Number.isFinite(credits) || credits <= 0) throw new Error("Invalid cashout amount");
    if (credits < 100) throw new Error("Minimum cashout is 100 credits ($10)");
    if (credits > user.earnedCreditsBalance) {
      throw new Error("You can only cash out earned credits");
    }

    await new Promise((resolve) => setTimeout(resolve, 400));

    const usdAmount = credits / 10;
    const requestedAt = new Date().toISOString();
    const request: CashoutRequest = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      creditsRequested: credits,
      usdAmount,
      status: "pending",
      payoutMethod: "batch",
      requestedAt,
    };

    const newEarnedBalance = user.earnedCreditsBalance - credits;
    const newBalance = user.purchasedCreditsBalance + newEarnedBalance;
    const requestTransaction: CreditTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      type: "cashout_request",
      amount: credits,
      balanceAfter: newBalance,
      description: `Cashout requested: ${credits} credits ($${usdAmount.toFixed(2)})`,
      usdAmount,
      cashoutRequestId: request.id,
      createdAt: requestedAt,
    };

    setUser({
      ...user,
      earnedCreditsBalance: newEarnedBalance,
      creditBalance: newBalance,
    });
    setCashoutRequests((prev) => [request, ...prev]);
    setCreditTransactions((prev) => [requestTransaction, ...prev]);

    return request;
  };

  const processPendingCashouts = async () => {
    if (!user) return 0;

    await new Promise((resolve) => setTimeout(resolve, 600));

    const now = new Date().toISOString();
    const pending = cashoutRequests.filter((request) => request.userId === user.id && request.status === "pending");
    if (!pending.length) return 0;

    const updatedRequests = cashoutRequests.map((request) =>
      request.userId === user.id && request.status === "pending"
        ? { ...request, status: "completed" as const, processedAt: now }
        : request
    );

    const completionTransactions: CreditTransaction[] = pending.map((request) => ({
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      type: "cashout_completed",
      amount: request.creditsRequested,
      balanceAfter: user.creditBalance,
      description: `Batch payout completed: ${request.creditsRequested} credits -> $${request.usdAmount.toFixed(2)}`,
      cashoutRequestId: request.id,
      usdAmount: request.usdAmount,
      createdAt: now,
    }));

    setCashoutRequests(updatedRequests);
    setCreditTransactions((prev) => [...completionTransactions, ...prev]);
    return pending.length;
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
      purchasedCreditsBalance,
      earnedCreditsBalance,
      cashoutEligibleCredits,
      creditTransactions,
      cashoutRequests,
      purchaseCredits,
      requestCashout,
      processPendingCashouts,
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
