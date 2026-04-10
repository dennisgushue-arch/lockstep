import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Bell, Lock, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { user } = useApp();
  const [enablePassiveDetection, setEnablePassiveDetection] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Load setting from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("passiveDetectionEnabled");
    if (saved) {
      setEnablePassiveDetection(JSON.parse(saved));
    }
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setSaveStatus("saving");
    
    // Save to localStorage (in production, would sync to backend)
    localStorage.setItem("passiveDetectionEnabled", JSON.stringify(enabled));
    setEnablePassiveDetection(enabled);

    // Simulate save delay
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 300);
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your preferences</p>
        </div>
      </div>

      {/* Passive Detection Section */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Passive Intent Detection
            </CardTitle>
            <CardDescription>
              Automatically detect and suggest commitments based on your typing patterns
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Privacy Alert */}
            <Alert className="border-red-200 bg-red-50">
              <Lock className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>This monitors your typing.</strong> Only text you type in this app. No third parties. You control it, and can turn it off anytime. But if you want better results, you have to be honest with yourself — and the system.
              </AlertDescription>
            </Alert>

            {/* AI Disclaimer */}
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-900">
                <strong>AI disclaimer:</strong> AI responses are for informational purposes only and may not be accurate.
              </AlertDescription>
            </Alert>

            {/* Main Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Enable Passive Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  {enablePassiveDetection
                    ? "We're watching what you actually care about"
                    : "Monitoring is off"}
                </p>
              </div>
              <Switch
                checked={enablePassiveDetection}
                onCheckedChange={handleToggle}
                disabled={saveStatus === "saving"}
              />
            </div>

            {/* Status Message */}
            {saveStatus === "saved" && (
              <p className="text-sm text-green-600 font-medium">✓ Settings saved</p>
            )}

            {/* What Gets Monitored */}
            {enablePassiveDetection && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-900">
                    <Eye className="w-4 h-4" />
                    We monitor
                  </h4>
                  <ul className="text-sm space-y-2 text-red-800">
                    <li>✓ Text you type in this app</li>
                    <li>✓ How long you focus on one thing</li>
                    <li>✓ What you keep saying you'll do</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-900">
                    <EyeOff className="w-4 h-4" />
                    We don't monitor
                  </h4>
                  <ul className="text-sm space-y-2 text-green-800">
                    <li>✗ Password fields (ever)</li>
                    <li>✗ Text outside this app</li>
                    <li>✗ Other websites or apps</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Detection Rules */}
            {enablePassiveDetection && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm text-red-900">When We'll Call You Out</h4>
                <p className="text-sm text-red-900 mb-3">
                  If you mention the same goal 3+ times, we're going to ask you to commit:
                </p>
                <ul className="text-sm text-red-900 space-y-1">
                  <li>• You typed about it for 30+ seconds</li>
                  <li>• You said it at least 3 times over weeks</li>
                  <li>• But you never staked money on it</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other Settings Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Other Preferences</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p className="mb-3">Additional settings coming soon...</p>
            <div className="flex gap-2 flex-wrap">
              <a href="/privacy.html" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">Privacy Policy</Button>
              </a>
              <a href="/terms.html" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">Terms of Service</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
