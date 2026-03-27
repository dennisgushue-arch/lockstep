/**
 * Analytics & Monitoring
 * Simple event tracking for key user actions
 */

import React from 'react';

type AnalyticsEvent =
  | 'journal_checkin_saved'
  | 'voice_note_recorded'
  | 'voice_note_uploaded'
  | 'intent_extracted'
  | 'commitment_created'
  | 'recommendation_accepted'
  | 'detection_sync'
  | 'calendar_connected'
  | 'error_occurred';

interface EventData {
  [key: string]: string | number | boolean | undefined;
}

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

  track(event: AnalyticsEvent, data?: EventData) {
    if (!this.enabled) {
      console.log('[Analytics Debug]', event, data);
      return;
    }

    const payload = {
      event,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      ...data,
    };

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
