import React, { createContext, useContext, useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { analyzeIntent as analyzeIntentAI, type StructuredIntent } from "./ai";
import type { IntentSignal, IntentPattern, DetectionResult } from "./passive-detection";
import { processNewSignal, shouldPromptCommitment } from "./passive-detection";
import { inputManager, type SourceType } from "./input-sources";

// Types
export type User = {
  id: string;
  email: string;
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
  stakeAmount: number;
  consequenceType: 'money' | 'social' | 'escalate';
  scheduledDate: string;
  status: 'scheduled' | 'completed' | 'missed';
  stripePaymentIntentId?: string;
};

type AppContextType = {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  
  currentIntent: Intent | null;
  analyzeIntent: (text: string) => Promise<void>;
  clearCurrentIntent: () => void;
  
  commitments: Commitment[];
  createCommitment: (config: { stakeAmount: number; consequenceType: Commitment['consequenceType']; scheduledDate: Date }) => Promise<Commitment>;
  completeCommitment: (id: string) => Promise<void>;
  markMissed: (id: string) => Promise<void>;
  
  // Passive Detection
  intentSignals: IntentSignal[];
  intentPatterns: IntentPattern[];
  captureSignal: (text: string, sourceType?: SourceType) => Promise<DetectionResult | null>;
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
  
  // Passive detection state
  const [intentSignals, setIntentSignals] = useState<IntentSignal[]>([]);
  const [intentPatterns, setIntentPatterns] = useState<IntentPattern[]>([]);

  // Initialize with some dummy data if we want, or clean slate
  useEffect(() => {
    // Check local storage for persisted "mock" session
    const storedUser = localStorage.getItem('intent_mock_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    
    const storedCommitments = localStorage.getItem('intent_mock_commitments');
    if (storedCommitments) setCommitments(JSON.parse(storedCommitments));
    
    const storedSignals = localStorage.getItem('intent_mock_signals');
    if (storedSignals) setIntentSignals(JSON.parse(storedSignals));
    
    const storedPatterns = localStorage.getItem('intent_mock_patterns');
    if (storedPatterns) setIntentPatterns(JSON.parse(storedPatterns));
  }, []);

  useEffect(() => {
    localStorage.setItem('intent_mock_commitments', JSON.stringify(commitments));
  }, [commitments]);
  
  useEffect(() => {
    localStorage.setItem('intent_mock_signals', JSON.stringify(intentSignals));
  }, [intentSignals]);
  
  useEffect(() => {
    localStorage.setItem('intent_mock_patterns', JSON.stringify(intentPatterns));
  }, [intentPatterns]);

  const login = async (email: string) => {
    // Simulate magic link delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newUser = { id: 'user_123', email };
    setUser(newUser);
    localStorage.setItem('intent_mock_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('intent_mock_user');
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

  const createCommitment = async ({ stakeAmount, consequenceType, scheduledDate }: { stakeAmount: number; consequenceType: Commitment['consequenceType']; scheduledDate: Date }) => {
    if (!currentIntent) throw new Error("No intent found");
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate Stripe
    
    const newCommitment: Commitment = {
      id: Math.random().toString(36).substr(2, 9),
      intentId: currentIntent.id,
      intent: currentIntent,
      stakeAmount,
      consequenceType,
      scheduledDate: scheduledDate.toISOString(),
      status: 'scheduled',
      stripePaymentIntentId: 'pi_mock_123456789'
    };
    
    setCommitments(prev => [newCommitment, ...prev]);
    setCurrentIntent(null);
    return newCommitment;
  };

  const completeCommitment = async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
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

  return (
    <AppContext.Provider value={{
      user,
      login,
      logout,
      currentIntent,
      analyzeIntent,
      clearCurrentIntent,
      commitments,
      createCommitment,
      completeCommitment,
      markMissed,
      intentSignals,
      intentPatterns,
      captureSignal,
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
