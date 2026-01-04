import React, { createContext, useContext, useState, useEffect } from "react";
import { format, addDays } from "date-fns";

// Types
export type User = {
  id: string;
  email: string;
};

export type Intent = {
  id: string;
  text: string;
  category: string;
  action: string;
  confidence: number;
  reflection?: string;
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
  createCommitment: (config: { stakeAmount: number; consequenceType: Commitment['consequenceType']; scheduledDate: Date }) => Promise<void>;
  completeCommitment: (id: string) => Promise<void>;
  markMissed: (id: string) => Promise<void>;
  
  // Debug
  runMissCheck: () => Promise<string>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);

  // Initialize with some dummy data if we want, or clean slate
  useEffect(() => {
    // Check local storage for persisted "mock" session
    const storedUser = localStorage.getItem('intent_mock_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    
    const storedCommitments = localStorage.getItem('intent_mock_commitments');
    if (storedCommitments) setCommitments(JSON.parse(storedCommitments));
  }, []);

  useEffect(() => {
    localStorage.setItem('intent_mock_commitments', JSON.stringify(commitments));
  }, [commitments]);

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
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate OpenAI call
    
    // Mock OpenAI classification logic
    const mockAnalysis = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      category: text.toLowerCase().includes("run") ? "Health" : "Productivity",
      action: text.toLowerCase().includes("run") ? "Put on running shoes" : "Open your laptop",
      confidence: 0.95,
      reflection: `You said you want to "${text}". \n\nWhy haven't you done it yet? Usually, it's not about time. It's about fear or friction. \n\nBy locking this in, you are removing the option to hesitate.`
    };
    
    setCurrentIntent(mockAnalysis);
  };

  const clearCurrentIntent = () => setCurrentIntent(null);

  const createCommitment = async ({ stakeAmount, consequenceType, scheduledDate }: { stakeAmount: number; consequenceType: Commitment['consequenceType']; scheduledDate: Date }) => {
    if (!currentIntent) return;
    
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
