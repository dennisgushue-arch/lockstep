/**
 * Keystroke Monitor Service
 * Passively monitors user typing in text areas/inputs and detects intent patterns
 * Only activates if user has explicitly enabled passive detection
 */

import { type SourceType } from "./input-sources";

export interface KeystrokeSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  text: string;
  duration: number; // milliseconds
  characterCount: number;
  wordCount: number;
  elementId?: string;
  elementType?: string; // textarea, input, contenteditable, etc.
}

export interface DetectionThresholds {
  minDurationMs: number; // Minimum typing duration before considering for analysis
  minCharacters: number; // Minimum characters typed
  minWords: number; // Minimum words
  inactivityTimeoutMs: number; // Time without typing to consider session ended
  checkIntervalMs: number; // How often to check for pattern matches
}

export const DEFAULT_THRESHOLDS: DetectionThresholds = {
  minDurationMs: 30000, // 30 seconds of typing
  minCharacters: 50,
  minWords: 10,
  inactivityTimeoutMs: 3000, // 3 seconds of no typing = session ended
  checkIntervalMs: 5000, // Check every 5 seconds
};

type OnSessionDetected = (session: KeystrokeSession, text: string) => Promise<void>;

export class KeystrokeMonitor {
  private enabled: boolean = false;
  private sessions: Map<string, KeystrokeSession> = new Map();
  private currentSessionId: string | null = null;
  private lastKeystrokeTime: number = 0;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private checkIntervalTimer: NodeJS.Timeout | null = null;
  private thresholds: DetectionThresholds;
  private onSessionDetected: OnSessionDetected | null = null;
  private bufferedText: string = "";
  private typedElements: Set<HTMLElement> = new Set();

  constructor(thresholds: Partial<DetectionThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Enable monitoring globally
   */
  enable(onDetected?: OnSessionDetected): void {
    if (this.enabled) return;

    this.enabled = true;
    this.onSessionDetected = onDetected || null;
    this.attachGlobalListeners();
    this.startCheckInterval();

    console.log("[KeystrokeMonitor] Enabled");
  }

  /**
   * Disable monitoring
   */
  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    this.detachGlobalListeners();
    this.stopCheckInterval();
    this.clearInactivityTimer();

    console.log("[KeystrokeMonitor] Disabled");
  }

  /**
   * Attach listeners to document for typing events
   */
  private attachGlobalListeners(): void {
    document.addEventListener("keydown", this.handleKeyDown.bind(this), true);
    document.addEventListener("input", this.handleInput.bind(this), true);
    document.addEventListener("paste", this.handlePaste.bind(this), true);
  }

  /**
   * Remove global listeners
   */
  private detachGlobalListeners(): void {
    document.removeEventListener("keydown", this.handleKeyDown.bind(this), true);
    document.removeEventListener("input", this.handleInput.bind(this), true);
    document.removeEventListener("paste", this.handlePaste.bind(this), true);
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    const target = event.target as HTMLElement;

    // Skip if typing in excluded elements
    if (this.shouldSkipElement(target)) return;

    // Track this element as being typed in
    this.typedElements.add(target);

    // Reset inactivity timer
    this.resetInactivityTimer();

    // Update last keystroke time
    this.lastKeystrokeTime = Date.now();

    // Start or continue session
    if (!this.currentSessionId) {
      this.startNewSession(target);
    }
  }

  /**
   * Handle input events (for more comprehensive tracking)
   */
  private handleInput(event: Event): void {
    if (!this.enabled) return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;

    if (this.shouldSkipElement(target as HTMLElement)) return;

    // Update buffered text from the target element
    if (target.value) {
      this.bufferedText = target.value;
    }

    this.resetInactivityTimer();
    this.lastKeystrokeTime = Date.now();
  }

  /**
   * Handle paste events
   */
  private handlePaste(event: ClipboardEvent): void {
    if (!this.enabled) return;

    const target = event.target as HTMLElement;

    if (this.shouldSkipElement(target)) return;

    // Get pasted text
    const pastedText = event.clipboardData?.getData("text") || "";
    if (pastedText) {
      this.bufferedText += pastedText;
    }

    this.lastKeystrokeTime = Date.now();
    this.resetInactivityTimer();
  }

  /**
   * Determine if we should skip monitoring this element
   */
  private shouldSkipElement(element: HTMLElement): boolean {
    // Skip password fields
    if (element instanceof HTMLInputElement && element.type === "password") return true;

    // Skip elements in excluded containers
    const classList = element.className?.toLowerCase() || "";
    const excludedClasses = ["password", "secret", "hidden", "no-monitor"];
    if (excludedClasses.some((cls) => classList.includes(cls))) return true;

    // Skip elements with data-no-monitor attribute
    if (element.hasAttribute("data-no-monitor")) return true;

    return false;
  }

  /**
   * Start a new typing session
   */
  private startNewSession(element: HTMLElement): void {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: KeystrokeSession = {
      id: sessionId,
      startTime: new Date(),
      text: "",
      duration: 0,
      characterCount: 0,
      wordCount: 0,
      elementId: element.id,
      elementType: element.tagName.toLowerCase(),
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    this.bufferedText = "";

    console.log(`[KeystrokeMonitor] Started session ${sessionId}`);
  }

  /**
   * Reset inactivity timer
   */
  private resetInactivityTimer(): void {
    this.clearInactivityTimer();

    this.inactivityTimer = setTimeout(() => {
      this.endCurrentSession();
    }, this.thresholds.inactivityTimeoutMs);
  }

  /**
   * Clear inactivity timer
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * End current session and check if it meets detection criteria
   */
  private endCurrentSession(): void {
    if (!this.currentSessionId) return;

    const session = this.sessions.get(this.currentSessionId);
    if (!session) return;

    session.endTime = new Date();
    session.text = this.bufferedText;
    session.duration = session.endTime.getTime() - session.startTime.getTime();
    session.characterCount = this.bufferedText.length;
    session.wordCount = this.bufferedText.trim().split(/\s+/).length;

    console.log(`[KeystrokeMonitor] Ended session ${this.currentSessionId}`, {
      duration: session.duration,
      characters: session.characterCount,
      words: session.wordCount,
      text: session.text.substring(0, 50) + "...",
    });

    // Check if session meets thresholds
    const meetsThresholds = this.sessionMeetsThresholds(session);

    if (meetsThresholds && this.onSessionDetected) {
      console.log("[KeystrokeMonitor] Session meets thresholds, triggering detection");
      this.onSessionDetected(session, session.text);
    }

    this.currentSessionId = null;
    this.bufferedText = "";
    this.typedElements.clear();
  }

  /**
   * Check if session meets minimum thresholds for intent detection
   */
  private sessionMeetsThresholds(session: KeystrokeSession): boolean {
    const { minDurationMs, minCharacters, minWords } = this.thresholds;

    const meetsTime = session.duration >= minDurationMs;
    const meetsChars = session.characterCount >= minCharacters;
    const meetsWords = session.wordCount >= minWords;

    const meets = meetsTime && meetsChars && meetsWords;

    console.log(`[KeystrokeMonitor] Threshold check:`, {
      duration: `${session.duration}ms >= ${minDurationMs}ms: ${meetsTime}`,
      chars: `${session.characterCount} >= ${minCharacters}: ${meetsChars}`,
      words: `${session.wordCount} >= ${minWords}: ${meetsWords}`,
      overall: meets,
    });

    return meets;
  }

  /**
   * Periodic check for patterns (can be used for real-time suggestions)
   */
  private startCheckInterval(): void {
    this.checkIntervalTimer = setInterval(() => {
      if (!this.enabled) return;

      // Scan active elements for text that might be an intent
      this.scanActiveElements();
    }, this.thresholds.checkIntervalMs);
  }

  /**
   * Stop check interval
   */
  private stopCheckInterval(): void {
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
    }
  }

  /**
   * Scan currently focused text inputs for potential intents (optional)
   */
  private scanActiveElements(): void {
    const activeElement = document.activeElement as HTMLElement;

    if (!activeElement) return;

    if (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement) {
      if (!this.shouldSkipElement(activeElement)) {
        // Could perform real-time analysis here if desired
        // For now, we rely on session-based detection
      }
    }
  }

  /**
   * Get all completed sessions
   */
  getCompletedSessions(): KeystrokeSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.endTime);
  }

  /**
   * Get current session if active
   */
  getCurrentSession(): KeystrokeSession | null {
    if (!this.currentSessionId) return null;
    return this.sessions.get(this.currentSessionId) || null;
  }

  /**
   * Clear session history
   */
  clearHistory(): void {
    this.sessions.clear();
    this.currentSessionId = null;
    this.bufferedText = "";
  }

  /**
   * Get monitor status
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const keystrokeMonitor = new KeystrokeMonitor();
