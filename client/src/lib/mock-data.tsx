import React, { createContext, useContext, useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { analyzeIntent as analyzeIntentAI, type StructuredIntent } from "./ai";
import type { IntentSignal, IntentPattern, DetectionResult } from "./passive-detection";
import { processNewSignal, shouldPromptCommitment } from "./passive-detection";
import { inputManager, type SourceType } from "./input-sources";
import { keystrokeMonitor } from "./keystroke-monitor";

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
};

type AppContextType = {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  
  currentIntent: Intent | null;
  analyzeIntent: (text: string) => Promise<void>;
  clearCurrentIntent: () => void;
  
  // Credits
  creditBalance: number;
  creditTransactions: CreditTransaction[];
  purchaseCredits: (amount: number, paymentIntentId: string) => Promise<void>;
  
  commitments: Commitment[];
  createCommitment: (config: { creditsCost: number; consequenceType: Commitment['consequenceType']; scheduledDate: Date; refundOnCompletion?: boolean }) => Promise<Commitment>;
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
  syncInputSources: () => Promise<void>;
  
  // Debug
  runMissCheck: () => Promise<string>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  
  // Passive detection state
  const [intentSignals, setIntentSignals] = useState<IntentSignal[]>([]);
  const [intentPatterns, setIntentPatterns] = useState<IntentPattern[]>([]);

  const creditBalance = user?.creditBalance ?? 0;

  // Initialize with some dummy data if we want, or clean slate
  useEffect(() => {
    // Check local storage for persisted "mock" session
    const storedUser = localStorage.getItem('intent_mock_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    
    const storedCommitments = localStorage.getItem('intent_mock_commitments');
    if (storedCommitments) setCommitments(JSON.parse(storedCommitments));
    
    const storedTransactions = localStorage.getItem('intent_mock_transactions');
    if (storedTransactions) setCreditTransactions(JSON.parse(storedTransactions));
    
    const storedSignals = localStorage.getItem('intent_mock_signals');
    if (storedSignals) setIntentSignals(JSON.parse(storedSignals));
    
    const storedPatterns = localStorage.getItem('intent_mock_patterns');
    if (storedPatterns) setIntentPatterns(JSON.parse(storedPatterns));
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

  const login = async (email: string) => {
    // Simulate magic link delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newUser = { id: 'user_123', email, creditBalance: 0 };
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
      const result = await analyzeIntentAI(text);
      
      const mockAnalysis: Intent = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        category: result.category,
        goal: result.goal,
        first_action: result.first_action,
        reflection: result.reflection,
        confidence: result.confidence,
        suggested_stake: result.suggested_stake
      };
      
      setCurrentIntent(mockAnalysis);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      throw error;
    }
  };

  const clearCurrentIntent = () => setCurrentIntent(null);

  const createCommitment = async ({ creditsCost, consequenceType, scheduledDate, refundOnCompletion = true }: { creditsCost: number; consequenceType: Commitment['consequenceType']; scheduledDate: Date; refundOnCompletion?: boolean }) => {
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
      // Process through detection algorithm
      const { updatedPattern, detectionResult } = processNewSignal(signal, intentPatterns);
      
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
    if (!user) return;
    
    // Sync all connected sources
    const newSignals = await inputManager.syncAllSources(user.id);
    
    // Process each signal
    for (const signal of newSignals) {
      try {
        const { updatedPattern } = processNewSignal(signal, intentPatterns);
        
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
  };

  // Initialize keystroke monitor when user is logged in and passive detection is enabled
  useEffect(() => {
    const passiveDetectionEnabled = localStorage.getItem("passiveDetectionEnabled") === "true";
    
    if (user && passiveDetectionEnabled) {
      console.log("[AppProvider] Initializing keystroke monitor for user:", user.id);
      
      // Set up handler for detected keystroke sessions
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
