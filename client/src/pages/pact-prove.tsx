import React, { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { readSourceBanner } from "@/lib/deeplink";
import {
  getProofConfidence,
  getProofMethodLabel,
  validateTextProofAgainstTask,
  type ProofSubmission,
} from "@/lib/proof";
import { useToast } from "@/hooks/use-toast";

export default function PactProvePage() {
  const [, params] = useRoute("/pact/:id/prove");
  const [, setLocation] = useLocation();
  const { commitments, completeCommitment } = useApp();
  const { toast } = useToast();
  const [proofText, setProofText] = useState("");
  const [witnessConfirmed, setWitnessConfirmed] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const commitment = useMemo(
    () => commitments.find((item) => item.id === params?.id) ?? null,
    [commitments, params?.id],
  );

  const sourceBanner = useMemo(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    return readSourceBanner(search);
  }, []);

  if (!commitment) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12 space-y-4">
        <div className="text-zinc-300">Pact not found.</div>
        <Button onClick={() => setLocation("/momentum")}>Back to Momentum</Button>
      </div>
    );
  }

  const actionLabel = commitment.actionText || commitment.intent.goal || commitment.intent.text;

  async function readImageAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleProofFileChange = async (file: File | null) => {
    if (!file) {
      setPhotoDataUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }

    const dataUrl = await readImageAsDataUrl(file);
    setPhotoDataUrl(dataUrl);
  };

  const handleSubmit = async () => {
    const method = commitment.proofMethod;
    const confidence = getProofConfidence(method);
    let proofSubmission: ProofSubmission | null = null;

    if (method === "checkin") {
      proofSubmission = {
        method,
        confidence,
        text: "I did it.",
        submittedAt: new Date().toISOString(),
      };
    }

    if (method === "photo") {
      if (!photoDataUrl) {
        toast({ title: "Photo required", description: "Upload a photo to prove it.", variant: "destructive" });
        return;
      }
      proofSubmission = {
        method,
        confidence,
        photoDataUrl,
        submittedAt: new Date().toISOString(),
      };
    }

    if (method === "text") {
      if (!proofText.trim()) {
        toast({ title: "Text proof required", description: "Type what you completed.", variant: "destructive" });
        return;
      }
      proofSubmission = {
        method,
        confidence,
        text: proofText.trim(),
        submittedAt: new Date().toISOString(),
        aiValidation: validateTextProofAgainstTask(actionLabel || "", proofText.trim()),
      };
    }

    if (method === "witness") {
      if (!witnessConfirmed) {
        toast({ title: "Witness required", description: "Confirm witness acknowledgement.", variant: "destructive" });
        return;
      }
      proofSubmission = {
        method,
        confidence,
        witnessConfirmed: true,
        text: proofText.trim() || "Witness confirmation submitted.",
        submittedAt: new Date().toISOString(),
      };
    }

    if (!proofSubmission) return;

    setSubmitting(true);
    try {
      await completeCommitment(commitment.id, proofSubmission);
      setLocation(`/result/${commitment.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12 min-h-[calc(100vh-64px)] flex items-center">
      <div className="w-full space-y-6 border border-zinc-800 bg-black/40 p-8">
        {sourceBanner && (
          <div className="border border-red-900/40 bg-red-950/10 p-4">
            <div className="text-xs uppercase tracking-widest text-red-300">{sourceBanner.title}</div>
            <div className="text-sm text-zinc-300 mt-2">{sourceBanner.body}</div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Prove it</div>
          <h1 className="text-4xl font-heading font-bold text-white">{actionLabel}</h1>
        </div>

        <div className="border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Proof type</div>
          <div className="text-xl font-semibold text-white mt-2">{getProofMethodLabel(commitment.proofMethod)}</div>
        </div>

        {commitment.proofMethod === "photo" && (
          <input type="file" accept="image/*" onChange={(e) => void handleProofFileChange(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
        )}

        {commitment.proofMethod === "text" && (
          <textarea
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
            rows={5}
            placeholder="Type the proof. Keep it specific."
            className="w-full bg-black/40 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-white"
          />
        )}

        {commitment.proofMethod === "witness" && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-zinc-200">
              <input type="checkbox" checked={witnessConfirmed} onChange={(e) => setWitnessConfirmed(e.target.checked)} />
              Witness confirmed
            </label>
            <input
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Optional witness note"
              className="w-full bg-black/40 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-white"
            />
          </div>
        )}

        {commitment.proofMethod === "checkin" && (
          <div className="text-sm text-zinc-300 border border-zinc-800 bg-black/30 p-4">
            This pact accepts a direct check-in. Submit proof now.
          </div>
        )}

        <Button className="rounded-none h-14 text-lg font-bold bg-red-600 hover:bg-red-700 text-white" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "SUBMITTING…" : "SUBMIT PROOF"}
        </Button>
      </div>
    </div>
  );
}