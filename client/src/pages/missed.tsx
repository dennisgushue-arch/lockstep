import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export default function MissedPage() {
const [, setLocation] = useLocation();

// MVP: we’ll pull the “latest missed” from mock state later.
// For now, just show the screen and route people back.
return (
<div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
<h1 className="text-4xl font-heading font-bold">COMMITMENT MISSED</h1>
<p className="text-muted-foreground text-lg">You said you would act. You didn’t.</p>

<Card className="rounded-none border">
<CardHeader>
<CardTitle>Delay was a decision.</CardTitle>
</CardHeader>
<CardContent className="space-y-3 text-muted-foreground">
<p>Your stake has been transferred to another Lockstep user.</p>
</CardContent>
</Card>

<div className="grid gap-3">
<Button className="w-full rounded-none font-bold" onClick={() => setLocation("/capture")}>
SET A NEW COMMITMENT
</Button>
<Button variant="secondary" className="w-full rounded-none font-bold" onClick={() => setLocation("/dashboard")}>
RETURN TO DASHBOARD
</Button>
</div>
</div>
);
}
