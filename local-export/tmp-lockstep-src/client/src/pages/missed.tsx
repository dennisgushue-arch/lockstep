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
<h1 className="text-4xl font-heading font-bold">YOU DIDN'T DO IT.</h1>
<p className="text-muted-foreground text-lg">The deadline passed. You're still here. It's done.</p>

<Card className="rounded-none border border-red-200 bg-red-50">
<CardHeader>
<CardTitle className="text-red-900">What You Said vs. What You Did</CardTitle>
</CardHeader>
<CardContent className="space-y-4 text-red-900">
<p className="font-semibold">You locked in a commitment. Then you didn't follow through.</p>
<p className="text-sm">That's not a judgment. That's a fact.</p>
<p className="border-t border-red-200 pt-3 text-sm">Your stake has been charged. The money is gone.</p>
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
