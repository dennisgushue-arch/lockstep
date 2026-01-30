import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import type { IntentPattern } from "@/lib/passive-detection";

interface PassiveIntentSuggestionProps {
  pattern: IntentPattern | null;
  onCapture?: (pattern: IntentPattern) => void;
  onDismiss?: (pattern: IntentPattern) => void;
}

export function PassiveIntentSuggestion({
  pattern,
  onCapture,
  onDismiss,
}: PassiveIntentSuggestionProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pattern && pattern.status === "active") {
      // Add slight delay for better UX
      const timer = setTimeout(() => {
        setOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setOpen(false);
    }
  }, [pattern]);

  const handleCapture = () => {
    if (pattern && onCapture) {
      onCapture(pattern);
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    if (pattern && onDismiss) {
      onDismiss(pattern);
      setOpen(false);
    }
  };

  if (!pattern) return null;

  const occurrenceText = 
    pattern.occurrenceCount === 1
      ? "You mentioned this once"
      : `You've mentioned this ${pattern.occurrenceCount} times`;

  const timeText = 
    pattern.daySpan === 1
      ? "today"
      : `over ${pattern.daySpan} days`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Time to Commit?
          </DialogTitle>
          <DialogDescription>
            {occurrenceText} {timeText}. Let's lock this in.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-lg font-semibold text-blue-900">
              "{pattern.normalizedIntent}"
            </p>
            <p className="text-sm text-blue-800 mt-2">
              Category: <span className="font-medium">{pattern.category}</span>
            </p>
            {pattern.suggestedStake && (
              <p className="text-sm text-blue-800 mt-1">
                Suggested stake: <span className="font-medium">${pattern.suggestedStake}</span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Dismiss
          </Button>
          <Button onClick={handleCapture} className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Lock It In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
