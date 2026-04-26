import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import Step1Capture from "@/components/onboarding/Step1Capture";
import Step2Transform from "@/components/onboarding/Step2Transform";
import Step3Commit from "@/components/onboarding/Step3Commit";
import Step4Live from "@/components/onboarding/Step4Live";
import FirstPactShell from "@/components/onboarding/FirstPactShell";
import { useApp, type Intent } from "@/lib/mock-data";
import { triggerTinyStepHaptic } from "@/lib/mobile-haptics";

const ONBOARDING_STORAGE_KEY = "onboarding_completed_v1";
const LIVE_BANNER_STORAGE_KEY = "lockstep_onboarding_live_banner_v1";

function mapIntentProofMethod(method?: string | null) {
  if (method === "photo" || method === "text" || method === "witness") {
    return method;
  }

  if (method === "location") return "photo";
  return "checkin";
}

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [input, setInput] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const previousStepRef = useRef(step);

  const { analyzeIntent, createCommitment, commitments, user } = useApp();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
      return;
    }

    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    const hasExistingPact = commitments.length > 0;

    if (completed || hasExistingPact) {
      setLocation("/momentum");
    }
  }, [commitments.length, setLocation, user]);

  useEffect(() => {
    if (previousStepRef.current !== step) {
      const previousStep = previousStepRef.current;
      const strength = previousStep === 3 && step === 4 ? "medium" : "light";
      previousStepRef.current = step;
      void triggerTinyStepHaptic(strength);
    }
  }, [step]);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeIntent(input);
      setIntent(result);
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLockIn = async () => {
    if (!intent) return;

    setIsLocking(true);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      localStorage.setItem(LIVE_BANNER_STORAGE_KEY, "true");

      await createCommitment({
        creditsCost: intent.stake ?? intent.suggested_stake,
        consequenceType: "money",
        scheduledDate: new Date(intent.deadline ?? new Date().toISOString()),
        actionText: intent.action,
        proofMethod: mapIntentProofMethod(intent.proof_method),
        aiPlan: intent.ai_plan,
      });

      setStep(4);
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <FirstPactShell step={step} totalSteps={4}>
        {step === 1 && (
          <Step1Capture
            input={input}
            setInput={setInput}
            onNext={handleAnalyze}
            isLoading={isAnalyzing}
          />
        )}

        {step === 2 && intent && (
          <Step2Transform intent={intent} onNext={() => setStep(3)} />
        )}

        {step === 3 && intent && (
          <Step3Commit intent={intent} onNext={handleLockIn} isLoading={isLocking} />
        )}

        {step === 4 && <Step4Live />}
    </FirstPactShell>
  );
}
