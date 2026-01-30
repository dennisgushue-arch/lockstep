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
            <Alert className="border-blue-200 bg-blue-50">
              <Lock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Your privacy matters.</strong> Passive detection only monitors text you type in this app. No data is sent to third parties. You can disable this feature anytime.
              </AlertDescription>
            </Alert>

            {/* Main Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Enable Passive Detection</h3>
                <p className="text-sm text-muted-foreground">
                  {enablePassiveDetection
                    ? "Monitoring your typing for potential commitments"
                    : "Passive detection is currently disabled"}
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
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    What we monitor
                  </h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>✓ Text you type in text areas</li>
                    <li>✓ Duration and frequency of typing sessions</li>
                    <li>✓ Keywords and intent patterns in your text</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    What we DON'T monitor
                  </h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>✗ Password fields or sensitive input</li>
                    <li>✗ Text outside this application</li>
                    <li>✗ Your browsing history or other apps</li>
                    <li>✗ Anything you explicitly exclude</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Detection Rules */}
            {enablePassiveDetection && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Detection Rules</h4>
                <p className="text-sm text-blue-900 mb-3">
                  We'll suggest a commitment when you:
                </p>
                <ul className="text-sm text-blue-900 space-y-1">
                  <li>• Type for 30+ seconds continuously</li>
                  <li>• Enter 50+ characters about the same goal</li>
                  <li>• Mention the same goal 3+ times over time</li>
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
            <p>Additional settings coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
