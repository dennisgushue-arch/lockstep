import React, { useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CapturePage() {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { analyzeIntent } = useApp();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleMicToggle = () => {
    // MVP Mock for voice
    setIsListening(!isListening);
    if (!isListening) {
      toast({
        title: "Microphone active",
        description: "Listening... (Mock: automatically typing for you)",
      });
      setTimeout(() => {
        setText("I want to go for a 5k run tomorrow morning at 7am");
        setIsListening(false);
      }, 2000);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    try {
      console.log("Submitting intent:", text);
      await analyzeIntent(text);
      console.log("Analysis complete, redirecting...");
      setLocation("/reflection");
    } catch (error) {
      console.error("Capture failed:", error);
      toast({
        title: "Processing Failed",
        description: "Could not understand intent. Try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12 flex flex-col h-[calc(100vh-64px)] justify-center">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-heading font-bold">DECLARE YOUR INTENT.</h1>
          <p className="text-muted-foreground text-lg">What is the one thing you must do?</p>
        </div>

        <div className="relative">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Write 500 words of my novel..."
            className="min-h-[200px] text-2xl md:text-3xl p-6 bg-transparent border-2 border-border focus:border-foreground resize-none font-medium leading-relaxed"
            autoFocus
          />
          <Button 
            size="icon" 
            variant={isListening ? "destructive" : "secondary"}
            className="absolute bottom-4 right-4 rounded-full h-12 w-12"
            onClick={handleMicToggle}
          >
            <Mic className={`w-6 h-6 ${isListening ? 'animate-pulse' : ''}`} />
          </Button>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            size="lg" 
            className="rounded-none px-8 py-6 text-xl font-bold gap-3"
            onClick={handleSubmit}
            disabled={!text.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                ANALYZING
              </>
            ) : (
              <>
                ANALYZE
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
