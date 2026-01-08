import React from "react";
import { Link } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2, XCircle, AlertCircle, Plus } from "lucide-react";

export default function Dashboard() {
  const { commitments, user, completeCommitment } = useApp();

  const sortedCommitments = [...commitments].sort((a, b) => 
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );
  const [isCompleting, setIsCompleting] = useState<string | null>(null);

  const handleMarkComplete = async (commitmentId: string) => {
  try {
  setIsCompleting(commitmentId);

  const { error } = await supabase.functions.invoke("complete_commitment", {
  body: { commitment_id: commitmentId },
  });

  if (error) throw error;

  toast({
  title: "Completed",
  description: "Stake released.",
  variant: "default",
  });
    <Button
    onClick={() => handleMarkComplete(c.id)}
    disabled={isCompleting === c.id}
    className="rounded-none font-bold"
    >
    {isCompleting === c.id ? "RELEASING..." : "MARK COMPLETE"}
    </Button>
  // Refresh data (use whatever your app uses)
  // e.g. refetch(), router reload, or just optimistic update
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
          <p className="text-muted-foreground">Welcome back, warrior.</p>
        </div>
        <Link href="/capture">
          <Button size="lg" className="gap-2 rounded-none font-bold">
            <Plus className="w-4 h-4" />
            NEW INTENT
          </Button>
        </Link>
      </div>

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
            <CommitmentCard key={c.id} commitment={c} onComplete={() => completeCommitment(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommitmentCard({ commitment, onComplete }: { commitment: any, onComplete: () => void }) {
  const isOverdue = new Date(commitment.scheduledDate) < new Date() && commitment.status === 'scheduled';
  
  return (
    <Card className={`border-l-4 ${
      commitment.status === 'completed' ? 'border-l-green-500' : 
      commitment.status === 'missed' ? 'border-l-red-500' : 
      'border-l-yellow-500'
    } bg-card hover:bg-zinc-900/50 transition-colors`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
            {commitment.intent.category}
          </Badge>
          <StatusBadge status={commitment.status} />
        </div>
        <CardTitle className="text-xl font-heading mt-2 leading-tight">
          {commitment.intent.action}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Stake: <span className="text-foreground font-mono font-bold">${commitment.stakeAmount}</span></p>
          <p>Consequence: <span className="capitalize">{commitment.consequenceType}</span></p>
          <p>Due: {format(new Date(commitment.scheduledDate), "PPP 'at' p")}</p>
        </div>
        
        {isOverdue && (
           <div className="mt-4 p-2 bg-red-900/20 border border-red-900/50 text-red-200 text-xs flex items-center gap-2">
             <AlertCircle className="w-4 h-4" />
             OVERDUE - RISK OF FORFEITURE
           </div>
        )}
      </CardContent>
      <CardFooter>
        {commitment.status === 'scheduled' && (
          <Button 
            className="w-full rounded-none font-bold" 
            variant={isOverdue ? "destructive" : "secondary"}
            onClick={onComplete}
          >
            MARK COMPLETED
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <Badge className="bg-green-900/20 text-green-400 border-green-900 hover:bg-green-900/30">COMPLETED</Badge>;
  }
  if (status === 'missed') {
    return <Badge className="bg-red-900/20 text-red-400 border-red-900 hover:bg-red-900/30">MISSED</Badge>;
  }
  return <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-900 hover:bg-yellow-900/30 animate-pulse">SCHEDULED</Badge>;
}
