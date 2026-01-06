import React, { useState } from "react";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const { runMissCheck, commitments } = useApp();
  const [logs, setLogs] = useState<string[]>([]);

  const handleRunJob = async () => {
    const result = await runMissCheck();
    setLogs(prev => [result, ...prev]);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-heading font-bold text-red-500">ADMIN / DEBUG</h1>
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cron Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manually trigger the "Missed Commitment" check. In prod, this runs every 10 mins via cron.
            </p>
            <Button onClick={handleRunJob} variant="destructive">Run Miss Check Logic</Button>
            
            <div className="mt-4 bg-black p-4 rounded text-xs font-mono h-48 overflow-y-auto border border-zinc-800">
              {logs.length === 0 ? <span className="text-zinc-600">No logs yet...</span> : logs.map((log, i) => (
                <div key={i} className="mb-1 text-green-400">{`> ${log}`}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Check</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm font-mono">
              <li className="flex justify-between"><span>SUPABASE_URL</span> <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">ACTIVE</Badge></li>
              <li className="flex justify-between"><span>STRIPE_SECRET</span> <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">ACTIVE</Badge></li>
              <li className="flex justify-between"><span>OPENAI_API_KEY</span> <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">ACTIVE</Badge></li>
              <li className="flex justify-between"><span>TWILIO_SID</span> <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">ACTIVE</Badge></li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raw Data Store</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-black p-4 overflow-auto border border-zinc-800 text-zinc-400">
            {JSON.stringify(commitments, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
