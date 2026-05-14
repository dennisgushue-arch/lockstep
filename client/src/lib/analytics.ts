/**
 * Analytics & Monitoring
 * Simple event tracking for key user actions
 */

import React from 'react';

const ANALYTICS_LOCAL_EXPORT_KEY = 'lockstep_analytics_events';
const ANALYTICS_LOCAL_EXPORT_LIMIT = 2000;

type AnalyticsEvent =
  | 'landing_cta_clicked'
  | 'signup_started'
  | 'signup_completed'
  | 'first_intent_submitted'
  | 'first_pact_preset_selected'
  | 'first_pact_created'
  | 'first_pact_completed'
  | 'first_pact_completed_24h'
  | 'ai_suggestion_adjusted'
  | 'recovery_prompt_clicked'
  | 'recovery_option_selected'
  | 'recovery_pact_started'
  | 'recovery_pact_created'
  | 'result_share_clicked'
  | 'journal_checkin_saved'
  | 'voice_note_recorded'
  | 'voice_note_uploaded'
  | 'intent_extracted'
  | 'commitment_created'
  | 'recommendation_accepted'
  | 'detection_sync'
  | 'calendar_connected'
  | 'paywall_viewed'
  | 'paywall_cta_clicked'
  | 'paywall_dismissed'
  | 'error_occurred';

interface EventData {
  [key: string]: string | number | boolean | null | undefined;
}

type AnalyticsPayload = {
  event: AnalyticsEvent;
  userId: string | null;
  timestamp: string;
} & EventData;

class Analytics {
  private enabled: boolean;
  private userId: string | null = null;

  constructor() {
    this.enabled = import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
  }

  identify(userId: string) {
    this.userId = userId;
    if (this.enabled) {
      console.log('[Analytics] User identified:', userId);
      // Add your analytics provider here (PostHog, Mixpanel, etc.)
    }
  }

  private canUseLocalStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private pushLocalEvent(payload: AnalyticsPayload) {
    if (!this.canUseLocalStorage()) return;

    try {
      const raw = window.localStorage.getItem(ANALYTICS_LOCAL_EXPORT_KEY);
      const existing = raw ? (JSON.parse(raw) as AnalyticsPayload[]) : [];
      const next = [...existing, payload].slice(-ANALYTICS_LOCAL_EXPORT_LIMIT);
      window.localStorage.setItem(ANALYTICS_LOCAL_EXPORT_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('[Analytics] Failed to persist local event export:', error);
    }
  }

  getLocalEvents() {
    if (!this.canUseLocalStorage()) return [] as AnalyticsPayload[];

    try {
      const raw = window.localStorage.getItem(ANALYTICS_LOCAL_EXPORT_KEY);
      if (!raw) return [] as AnalyticsPayload[];
      const parsed = JSON.parse(raw) as AnalyticsPayload[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as AnalyticsPayload[];
    }
  }

  clearLocalEvents() {
    if (!this.canUseLocalStorage()) return;
    window.localStorage.removeItem(ANALYTICS_LOCAL_EXPORT_KEY);
  }

  track(event: AnalyticsEvent, data?: EventData) {
    const payload: AnalyticsPayload = {
      event,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      ...data,
    };

    this.pushLocalEvent(payload);

    if (!this.enabled) {
      console.log('[Analytics Debug]', event, data);
      return;
    }

    console.log('[Analytics]', payload);

    // Send to your analytics backend
    // Example: PostHog, Mixpanel, or custom endpoint
    try {
      // Uncomment and configure your analytics provider:
      
      // PostHog example:
      // if (window.posthog) {
      //   window.posthog.capture(event, data);
      // }

      // Custom endpoint example:
      // fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }

  error(message: string, context?: Record<string, unknown>) {
    this.track('error_occurred', {
      message,
      context: JSON.stringify(context),
    });

    // Optional: Send to error tracking service (Sentry, etc.)
    if (this.enabled && typeof window !== 'undefined') {
      // Example: Sentry
      // Sentry.captureException(new Error(message), { extra: context });
    }
  }

  page(name: string) {
    if (this.enabled) {
      console.log('[Analytics] Page view:', name);
      // Track page views
    }
  }
}

export const analytics = new Analytics();

// Helper hook for tracking page views
export function usePageView(pageName: string) {
  const hasTracked = React.useRef(false);

  React.useEffect(() => {
    if (!hasTracked.current) {
      analytics.page(pageName);
      hasTracked.current = true;
    }
  }, [pageName]);
}
