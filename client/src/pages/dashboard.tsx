import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatternSummaryWidget } from "@/components/detection-notifications";

import { format } from "date-fns";
import { AlertCircle, Plus } from "lucide-react";

function StatusBadge({ status }: { status: 'scheduled' | 'completed' | 'missed' }) {
  const variants: Record<typeof status, { label: string; className: string }> = {
    scheduled: { label: 'Active', className: 'bg-blue-500/10 text-blue-500 border-blue-500/50' },
    completed: { label: 'Complete', className: 'bg-green-500/10 text-green-500 border-green-500/50' },
    missed: { label: 'Missed', className: 'bg-red-500/10 text-red-500 border-red-500/50' },
  };
  const { label, className } = variants[status];
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

export default function Dashboard() {
const { commitments, completeCommitment } = useApp();
const { toast } = useToast();
const [, setLocation] = useLocation();

const [isCompleting, setIsCompleting] = useState<string | null>(null);
const [isFailing, setIsFailing] = useState(false);

const sortedCommitments = useMemo(() => {
return [...commitments].sort(
(a, b) =>
new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
);
}, [commitments]);

// ✅ MVP: Auto-detect overdue and trigger fail -> redirect to /missed
useEffect(() => {
if (isFailing) return;

const overdue = sortedCommitments.find((c) => {
const deadlineMs = new Date(c.scheduledDate).getTime();
return c.status === "scheduled" && deadlineMs <= Date.now();
});

if (!overdue) return;

(async () => {
try {
setIsFailing(true);

const { error } = await supabase.functions.invoke("fail_commitment", {
body: { commitment_id: overdue.id },
// If your function requires a secret header, we can add it later.
});

if (error) throw error;

toast({
title: "Commitment missed",
description: "Delay was a decision.",
variant: "destructive",
});

// Optional: update local mock UI if your mock-data supports it.
// If completeCommitment only marks completed, ignore this.
// We'll still redirect to /missed regardless.
} catch (e: any) {
console.error(e);
toast({
title: "Could not process missed commitment",
description: e?.message || "Fail function error.",
variant: "destructive",
});
setIsFailing(false);
return;
}

setLocation("/missed");
})();
}, [sortedCommitments, isFailing, setLocation, toast]);

const handleMarkComplete = async (commitmentId: string) => {
if (isCompleting) return;

try {
setIsCompleting(commitmentId);

const { error } = await supabase.functions.invoke("complete_commitment", {
body: { commitment_id: commitmentId },
});

if (error) throw error;

toast({
title: "Completed",
description: "Stake released.",
});

// Update local (mock) UI immediately
completeCommitment(commitmentId);
} catch (e: any) {
console.error(e);
toast({
title: "Error",
description: e?.message || "Could not mark complete.",
variant: "destructive",
});
} finally {
setIsCompleting(null);
}
};

return (
<div className="container mx-auto px-4 py-8 space-y-8">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<h1 className="text-3xl font-heading font-bold">DASHBOARD</h1>
<p className="text-muted-foreground">Delay is a decision.</p>
</div>

<Link href="/capture">
<Button size="lg" className="gap-2 rounded-none font-bold">
<Plus className="w-4 h-4" />
NEW INTENT
</Button>
</Link>
</div>

{/* Pattern Detection Widget */}
<PatternSummaryWidget />

{sortedCommitments.length === 0 ? (
<div className="py-24 text-center border border-dashed border-border rounded-lg bg-zinc-900/20">
<h3 className="text-xl font-heading font-semibold mb-2">No active commitments</h3>
<p className="text-muted-foreground mb-6">You are drifting. Set an anchor.</p>
<Link href="/capture">
<Button variant="secondary">Create Commitment</Button>
</Link>
</div>
) : (
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
{sortedCommitments.map((c) => (
<CommitmentCard
key={c.id}
commitment={c}
onComplete={handleMarkComplete}
isCompleting={isCompleting === c.id}
/>
))}
</div>
)}
</div>
);
}

function CommitmentCard({
commitment,
onComplete,
isCompleting,
}: {
commitment: any;
onComplete: (id: string) => void;
isCompleting: boolean;
}) {
const deadlineMs = new Date(commitment.scheduledDate).getTime();
const nowMs = Date.now();

const isScheduled = commitment.status === "scheduled";
const isEligible = isScheduled && deadlineMs > nowMs;
const isOverdue = isScheduled && deadlineMs <= nowMs;

const borderClass =
commitment.status === "completed"
? "border-l-green-500"
: commitment.status === "missed"
? "border-l-red-500"
: isOverdue
? "border-l-red-500"
: "border-l-yellow-500";

return (
<Card className={`border-l-4 ${borderClass} bg-card hover:bg-zinc-900/50 transition-colors`}>
<CardHeader className="pb-2">
<div className="flex justify-between items-start">
<Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
{commitment.intent?.category ?? "intent"}
</Badge>
<StatusBadge status={commitment.status} />
</div>

<CardTitle className="text-xl font-heading mt-2 leading-tight">
{commitment.intent?.action ?? "—"}
</CardTitle>
</CardHeader>

<CardContent className="pb-4">
<div className="text-sm text-muted-foreground space-y-1">
<p>
                    Credits Cost:{" "}
                    <span className="text-yellow-500 font-bold">
                      {commitment.creditsCost} credits
                    </span>
                    {commitment.refundOnCompletion && (
                      <span className="text-xs ml-2 text-muted-foreground">(refundable)</span>
                    )}
                  </p>
                  <p>Consequence: <span className="capitalize">{commitment.consequenceType}</span></p>
                  <p>Due: {format(new Date(commitment.scheduledDate), "PPP 'at' p")}</p>
                </div>

                {isOverdue && (
                  <div className="mt-4 p-2 bg-red-900/20 border border-red-900/50 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    OVERDUE — CREDITS LOST
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                {isEligible && (
                  <Button
                    className="w-full rounded-none font-bold"
                    variant="secondary"
                    onClick={() => onComplete(commitment.id)}
                    disabled={isCompleting}
                  >
                    {isCompleting ? "RELEASING..." : "MARK COMPLETE"}
                  </Button>
                )}

                {isOverdue && (
                  <Button className="w-full rounded-none font-bold" variant="destructive" disabled>
                    MISSED DEADLINE
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        }


