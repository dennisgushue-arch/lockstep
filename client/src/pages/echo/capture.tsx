import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { EchoLayout } from "@/components/echo-layout";
import { useEcho } from "@/lib/echo-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Type,
  Mic,
  Image,
  CheckCircle2,
  Loader2,
  Square,
  MicOff,
  Upload,
  Camera,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CaptureTab = "text" | "voice" | "screenshot" | "photo";

export default function EchoCapturePage() {
  const [, setLocation] = useLocation();
  const { captureMemory, isLoading } = useEcho();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<CaptureTab>("text");
  const [textContent, setTextContent] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Voice state
  const [recording, setRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextCapture = async () => {
    if (!textContent.trim()) return;
    setCapturing(true);
    try {
      const mem = await captureMemory(textContent.trim(), "text");
      setSavedId(mem.id);
      toast({
        title: "Memory saved",
        description: "Your memory has been captured and tagged.",
      });
      setTimeout(() => {
        setTextContent("");
        setSavedId(null);
      }, 1500);
    } finally {
      setCapturing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        // Simulate transcription
        setVoiceTranscript("(Voice note recorded — AI transcription will appear here in production mode)");
      };

      mr.start();
      setRecording(true);
    } catch {
      toast({
        title: "Microphone unavailable",
        description: "Grant microphone permissions to use voice capture.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleVoiceCapture = async () => {
    if (!voiceTranscript.trim() && !audioBlob) return;
    setCapturing(true);
    try {
      const content = voiceTranscript || "Voice note captured.";
      const mem = await captureMemory(content, "voice");
      setSavedId(mem.id);
      toast({ title: "Voice memory saved", description: "Your voice note has been transcribed and saved." });
      setTimeout(() => {
        setVoiceTranscript("");
        setAudioBlob(null);
        setSavedId(null);
      }, 1500);
    } finally {
      setCapturing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "screenshot" | "photo") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setActiveTab(type);
    // Simulate AI description
    setImageDescription(
      type === "screenshot"
        ? "Screenshot captured. AI will extract text and context from this image."
        : "Photo saved. AI will identify people, places, and key details."
    );
  };

  const handleImageCapture = async (type: "screenshot" | "photo") => {
    if (!imagePreview) return;
    setCapturing(true);
    try {
      const content = imageDescription || `${type} captured.`;
      const mem = await captureMemory(content, type);
      setSavedId(mem.id);
      toast({ title: `${type === "photo" ? "Photo" : "Screenshot"} saved`, description: "Your image has been analyzed and saved." });
      setTimeout(() => {
        setImagePreview(null);
        setImageDescription("");
        setSavedId(null);
      }, 1500);
    } finally {
      setCapturing(false);
    }
  };

  const tabs: { id: CaptureTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: "text", label: "Text", icon: Type, color: "cyan" },
    { id: "voice", label: "Voice", icon: Mic, color: "violet" },
    { id: "screenshot", label: "Screenshot", icon: Image, color: "amber" },
    { id: "photo", label: "Photo", icon: Camera, color: "emerald" },
  ];

  return (
    <EchoLayout>
      <div className="container mx-auto px-4 py-8 max-w-xl pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">Capture a Memory</h1>
          <p className="text-sm text-muted-foreground">
            Don't let it slip away. Any format, any moment.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                activeTab === id
                  ? `border-${color}-500/40 bg-${color}-500/10 text-${color}-300`
                  : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>

        {/* Text capture */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <div className="border border-cyan-500/25 bg-card/30 rounded-2xl p-4 focus-within:border-cyan-500/50 transition-all">
              <Textarea
                placeholder="What happened? What did someone say? What's the idea?

No need to write perfectly — just capture it."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="bg-transparent border-0 resize-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/40 p-0 min-h-[160px]"
                rows={7}
                autoFocus
              />
            </div>

            {savedId ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Memory saved!
              </div>
            ) : (
              <Button
                onClick={handleTextCapture}
                disabled={!textContent.trim() || capturing}
                className="w-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
                variant="outline"
              >
                {capturing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {capturing ? "Saving…" : "Remember this"}
              </Button>
            )}
          </div>
        )}

        {/* Voice capture */}
        {activeTab === "voice" && (
          <div className="space-y-4">
            <div className="border border-violet-500/25 bg-card/30 rounded-2xl p-6 text-center">
              {recording ? (
                <div className="space-y-4">
                  <div className="relative inline-flex">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto">
                      <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping" />
                  </div>
                  <p className="text-sm text-red-400 font-medium">Recording…</p>
                  <Button
                    onClick={stopRecording}
                    variant="outline"
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Recording
                  </Button>
                </div>
              ) : audioBlob ? (
                <div className="space-y-3">
                  <MicOff className="w-10 h-10 text-violet-400 mx-auto" />
                  <p className="text-sm text-violet-300">Recording complete</p>
                  <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <Mic className="w-12 h-12 text-violet-400/60 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Tap to start recording. Say what you want to remember.
                  </p>
                  <Button
                    onClick={startRecording}
                    className="bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30"
                    variant="outline"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                </div>
              )}
            </div>

            {voiceTranscript && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-mono uppercase tracking-wide">Transcript</p>
                <Textarea
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  className="text-sm min-h-[80px] bg-card/30 border-border/40"
                  rows={3}
                />
              </div>
            )}

            {audioBlob && (
              <Button
                onClick={handleVoiceCapture}
                disabled={capturing}
                className="w-full bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30"
                variant="outline"
              >
                {capturing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {capturing ? "Saving…" : "Save Voice Memory"}
              </Button>
            )}
          </div>
        )}

        {/* Screenshot / Photo capture */}
        {(activeTab === "screenshot" || activeTab === "photo") && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, activeTab)}
            />

            {imagePreview ? (
              <div className="space-y-3">
                <div className="border border-border/40 rounded-xl overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-60 object-contain bg-black/20" />
                </div>
                <Textarea
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  placeholder="Add context or let AI describe it…"
                  className="text-sm min-h-[80px] bg-card/30 border-border/40"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-border/40 text-muted-foreground"
                    onClick={() => {
                      setImagePreview(null);
                      setImageDescription("");
                    }}
                  >
                    Change
                  </Button>
                  <Button
                    onClick={() => handleImageCapture(activeTab)}
                    disabled={capturing}
                    className={`flex-1 ${activeTab === "screenshot" ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30" : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"}`}
                    variant="outline"
                  >
                    {capturing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {capturing ? "Saving…" : "Save Memory"}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  activeTab === "screenshot"
                    ? "border-amber-500/25 hover:border-amber-500/50 hover:bg-amber-500/5"
                    : "border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={`w-10 h-10 mx-auto mb-3 ${activeTab === "screenshot" ? "text-amber-400/60" : "text-emerald-400/60"}`} />
                <p className="text-sm text-muted-foreground">
                  {activeTab === "screenshot"
                    ? "Drop a screenshot or tap to select"
                    : "Drop a photo or tap to select"}
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  {activeTab === "screenshot"
                    ? "AI will extract text and context from the image"
                    : "AI will identify people, places, and key details"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Privacy note */}
        <p className="text-[11px] text-muted-foreground/40 text-center mt-6">
          🔒 Your memories never train AI models. Your data stays yours.
        </p>
      </div>
    </EchoLayout>
  );
}
