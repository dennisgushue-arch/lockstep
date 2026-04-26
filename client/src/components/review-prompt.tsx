import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/mock-data";
import { getReviewPrompt, type ReviewPromptType } from "@/lib/engagement";
import { requestNativeReview } from "@/lib/native-review";

const STORAGE_KEY = "lockstep_review_prompts_v1";

type ReviewPromptState = {
  dismissed: ReviewPromptType[];
};

function readState(): ReviewPromptState {
  if (typeof window === "undefined") return { dismissed: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dismissed: [] };
    return JSON.parse(raw) as ReviewPromptState;
  } catch {
    return { dismissed: [] };
  }
}

function writeState(state: ReviewPromptState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function ReviewPrompt() {
  const { commitments } = useApp();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ReviewPromptState>(() => readState());

  const prompt = useMemo(() => getReviewPrompt(commitments, state.dismissed), [commitments, state.dismissed]);

  useEffect(() => {
    setOpen(Boolean(prompt));
  }, [prompt?.type]);

  if (!prompt) return null;

  const dismiss = (type: ReviewPromptType) => {
    const next = {
      dismissed: Array.from(new Set([...state.dismissed, type])),
    };
    setState(next);
    writeState(next);
    setOpen(false);
  };

  const handleReview = async () => {
    await requestNativeReview();
    dismiss(prompt.type);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-zinc-800 bg-zinc-950 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">{prompt.title}</DialogTitle>
          <DialogDescription className="text-zinc-400">{prompt.body}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-3 sm:gap-3">
          <Button variant="outline" className="rounded-none border-zinc-700" onClick={() => dismiss(prompt.type)}>
            Not now
          </Button>
          <Button className="rounded-none bg-red-600 text-white hover:bg-red-700" onClick={handleReview}>
            {prompt.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
