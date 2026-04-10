/**
 * Input Source Integrations
 * Handles connections to voice notes, messages, calendar, etc.
 */

import { IntentSignal } from "./passive-detection";

export type SourceType = "voice_note" | "message" | "calendar" | "journal" | "manual";

export interface InputSourceConfig {
  type: SourceType;
  enabled: boolean;
  lastSync?: string;
  settings?: Record<string, any>;
}

export interface VoiceNoteMetadata {
  duration?: number;
  transcribedAt?: string;
  language?: string;
}

export interface MessageMetadata {
  platform?: "sms" | "whatsapp" | "imessage" | "telegram";
  threadId?: string;
  sender?: string;
}

export interface CalendarMetadata {
  eventId?: string;
  calendarName?: string;
  eventTitle?: string;
  eventTime?: string;
}

type JournalCheckIn = {
  id: string;
  commitmentId: string;
  note: string;
  proof: string;
  createdAt: string;
};

/**
 * Voice Note Integration (Mock for now)
 */
export class VoiceNoteSource {
  async requestPermission(): Promise<boolean> {
    // In production: Request microphone access
    console.log("[Voice] Requesting microphone permission");
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 500);
    });
  }

  async startListening(
    onTranscript: (text: string, metadata: VoiceNoteMetadata) => void
  ): Promise<void> {
    // In production: Use Web Speech API or service like Deepgram
    console.log("[Voice] Starting to listen...");
    
    // Mock transcription after 2 seconds
    setTimeout(() => {
      const mockTranscript = "I really need to start working out more consistently";
      onTranscript(mockTranscript, {
        duration: 3,
        transcribedAt: new Date().toISOString(),
        language: "en-US",
      });
    }, 2000);
  }

  async stopListening(): Promise<void> {
    console.log("[Voice] Stopped listening");
  }

  /**
   * Process audio file upload
   */
  async transcribeAudioFile(file: File): Promise<string> {
    console.log("[Voice] Transcribing audio file:", file.name);
    
    // In production: Upload to transcription service (OpenAI Whisper, Deepgram, etc.)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("I should really look into buying life insurance soon");
      }, 2000);
    });
  }
}

/**
 * Message Integration (Mock for now)
 */
export class MessageSource {
  private connectedPlatforms: Set<string> = new Set();

  async connectPlatform(platform: "sms" | "whatsapp" | "imessage"): Promise<boolean> {
    console.log(`[Messages] Connecting to ${platform}...`);
    
    // In production: OAuth flow or API integration
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connectedPlatforms.add(platform);
        resolve(true);
      }, 1000);
    });
  }

  async disconnectPlatform(platform: string): Promise<void> {
    this.connectedPlatforms.delete(platform);
  }

  /**
   * Poll for new messages containing intent signals
   */
  async pollMessages(
    userId: string,
    lastSyncTime?: string
  ): Promise<IntentSignal[]> {
    console.log("[Messages] Polling for new messages...");
    
    // In production: Query messaging APIs for recent messages
    // Use NLP to filter for intent-like statements
    
    // Mock response
    return [
      {
        id: `signal_${Date.now()}`,
        userId,
        sourceType: "message",
        sourceId: "thread_abc123",
        rawText: "I keep saying I'll start that side business but never do",
        detectedAt: new Date().toISOString(),
        processed: false,
      },
    ];
  }

  /**
   * Manual message submission
   */
  async submitMessage(userId: string, text: string, platform?: string): Promise<IntentSignal> {
    return {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      sourceType: "message",
      sourceId: platform ? `${platform}_manual` : undefined,
      rawText: text,
      detectedAt: new Date().toISOString(),
      processed: false,
    };
  }
}

/**
 * Calendar Integration (Mock for now)
 */
export class CalendarSource {
  async connectCalendar(provider: "google" | "outlook" | "apple"): Promise<boolean> {
    console.log(`[Calendar] Connecting to ${provider} Calendar...`);
    
    // In production: OAuth flow
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1500);
    });
  }

  /**
   * Analyze calendar events for intent patterns
   * e.g., repeatedly creating "Gym" events but not attending
   */
  async analyzeEvents(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IntentSignal[]> {
    console.log("[Calendar] Analyzing events...");
    
    // In production: Query calendar API
    // Look for:
    // - Repeated event titles (e.g., "Morning run" created 10 times)
    // - Events with "reminder" or "goal" keywords
    // - Pattern of creating then deleting events
    
    // Mock response
    return [
      {
        id: `signal_cal_${Date.now()}`,
        userId,
        sourceType: "calendar",
        sourceId: "event_xyz789",
        rawText: "Morning workout session (created 5 times, attended 0)",
        detectedAt: new Date().toISOString(),
        processed: false,
      },
    ];
  }
}

/**
 * Journal Integration (Mock for now)
 */
export class JournalSource {
  private storageKey = "intent_checkins";
  private lastSyncKey = "intent_checkins_last_sync";

  /**
   * Parse journal entries for intent signals
   */
  async parseEntry(
    userId: string,
    entryText: string,
    sourceId?: string
  ): Promise<IntentSignal[]> {
    console.log("[Journal] Parsing entry for intents...");
    
    // In production: Use NLP to extract intent sentences
    // Look for patterns like:
    // - "I want to..."
    // - "I need to..."
    // - "I should..."
    
    const signals: IntentSignal[] = [];
    const lines = entryText.split(/[.!?]+/);
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        /\b(want to|need to|should|must|have to|going to)\b/.test(lower) &&
        line.trim().length > 20
      ) {
        signals.push({
          id: `signal_journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          sourceType: "journal",
          sourceId,
          rawText: line.trim(),
          detectedAt: new Date().toISOString(),
          processed: false,
        });
      }
    }
    
    return signals;
  }

  /**
   * Sync local check-ins as journal signals (browser-only)
   */
  async syncCheckIns(userId: string): Promise<IntentSignal[]> {
    if (typeof window === "undefined" || !window.localStorage) return [];

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return [];

    const lastSyncRaw = window.localStorage.getItem(this.lastSyncKey);
    const lastSync = lastSyncRaw ? new Date(lastSyncRaw) : null;

    let entries: JournalCheckIn[] = [];
    try {
      const parsed = JSON.parse(raw) as JournalCheckIn[];
      entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }

    const newSignals: IntentSignal[] = [];
    let latestSeen: Date | null = lastSync;

    for (const entry of entries) {
      const createdAt = new Date(entry.createdAt);
      if (lastSync && createdAt <= lastSync) continue;

      const combined = [entry.note?.trim(), entry.proof?.trim()]
        .filter(Boolean)
        .join("\n");

      if (!combined) continue;

      const signals = await this.parseEntry(userId, combined, entry.id);
      newSignals.push(...signals);

      if (!latestSeen || createdAt > latestSeen) {
        latestSeen = createdAt;
      }
    }

    if (latestSeen) {
      window.localStorage.setItem(this.lastSyncKey, latestSeen.toISOString());
    }

    return newSignals;
  }

  /**
   * Connect to external journaling apps (Day One, Notion, etc.)
   */
  async connectJournalingApp(app: "dayone" | "notion" | "evernote"): Promise<boolean> {
    console.log(`[Journal] Connecting to ${app}...`);
    
    // In production: OAuth or API integration
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1000);
    });
  }
}

/**
 * Unified Input Manager
 */
export class InputSourceManager {
  private voiceSource = new VoiceNoteSource();
  private messageSource = new MessageSource();
  private calendarSource = new CalendarSource();
  private journalSource = new JournalSource();

  /**
   * Get all available source types
   */
  getAvailableSources(): SourceType[] {
    return ["voice_note", "message", "calendar", "journal", "manual"];
  }

  /**
   * Get source handler by type
   */
  getSource(type: SourceType) {
    switch (type) {
      case "voice_note":
        return this.voiceSource;
      case "message":
        return this.messageSource;
      case "calendar":
        return this.calendarSource;
      case "journal":
        return this.journalSource;
      default:
        throw new Error(`Unknown source type: ${type}`);
    }
  }

  /**
   * Sync all connected sources
   */
  async syncAllSources(userId: string): Promise<IntentSignal[]> {
    console.log("[InputManager] Syncing all sources...");
    
    const signals: IntentSignal[] = [];
    
    // Poll each source in parallel
    const [messages, calendar] = await Promise.all([
      this.messageSource.pollMessages(userId),
      this.calendarSource.analyzeEvents(userId, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
    ]);
    
    signals.push(...messages, ...calendar);

    const journalSignals = await this.journalSource.syncCheckIns(userId);
    signals.push(...journalSignals);
    
    return signals;
  }

  /**
   * Sync a specific source only
   */
  async syncSource(userId: string, source: SourceType): Promise<IntentSignal[]> {
    console.log(`[InputManager] Syncing source: ${source}`);

    switch (source) {
      case "message":
        return this.messageSource.pollMessages(userId);
      case "calendar":
        return this.calendarSource.analyzeEvents(
          userId,
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          new Date()
        );
      case "journal":
        return this.journalSource.syncCheckIns(userId);
      case "voice_note":
      case "manual":
      default:
        return [];
    }
  }

  /**
   * Create signal from manual input
   */
  async captureManualSignal(userId: string, text: string): Promise<IntentSignal> {
    return {
      id: `signal_manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      sourceType: "manual",
      rawText: text,
      detectedAt: new Date().toISOString(),
      processed: false,
    };
  }
}

// Singleton instance
export const inputManager = new InputSourceManager();
