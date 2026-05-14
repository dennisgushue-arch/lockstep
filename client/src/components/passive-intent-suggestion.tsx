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
            <Sparkles className="w-5 h-5 text-red-500" />
            Stop Saying It. Do It.
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-foreground/70">
            {occurrenceText} {timeText}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-lg font-semibold text-red-900">
              "{pattern.normalizedIntent}"
            </p>
            <p className="text-sm text-red-800 mt-3 font-medium">
              Category: <span className="capitalize">{pattern.category}</span>
            </p>
            {pattern.suggestedStake && (
              <p className="text-sm text-red-800 mt-2">
                Stake at risk: <span className="font-bold text-red-900">${pattern.suggestedStake}</span>
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            You've said this {pattern.occurrenceCount} times. No commitment. No skin in the game.
            <br />
            If it matters, prove it. If it doesn't, stop saying it.
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="w-full sm:w-auto h-auto py-2 leading-tight whitespace-normal flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
          >
            <X className="w-4 h-4" />
            Keep Saying It
          </Button>
          <Button onClick={handleCapture} className="w-full sm:w-auto h-auto py-2 leading-tight whitespace-normal flex items-center gap-2 bg-red-600 hover:bg-red-700">
            <Sparkles className="w-4 h-4" />
            I Mean It
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
