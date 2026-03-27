/**
 * Google Calendar OAuth & Sync
 * Handles authentication and event synchronization with Google Calendar
 */

import { supabase } from './supabase';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/auth/calendar-callback`;

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  description?: string;
  location?: string;
  isAllDay: boolean;
}

export interface CalendarPattern {
  eventCount: number;
  busyMinutes: number;
  daysOverbooked: number;
  likelyFailureRisk: 'low' | 'medium' | 'high';
  suggestions: string[];
  busyDays: string[];
}

/**
 * Initiate Google OAuth flow
 */
export async function initiateCalendarAuth() {
  const scope = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  window.location.href = authUrl.toString();
}

/**
 * Handle OAuth callback
 */
export async function handleCalendarAuthCallback(code: string) {
  try {
    const { data, error } = await supabase.functions.invoke(
      'exchange_calendar_token',
      {
        body: { code },
      }
    );

    if (error) throw error;

    // Token stored securely in database via function
    return { success: true, ...data };
  } catch (error) {
    console.error('Calendar auth error:', error);
    throw error;
  }
}

/**
 * Sync calendar events for authenticated user
 */
export async function syncCalendarEvents() {
  try {
    const { data, error } = await supabase.functions.invoke(
      'sync_google_calendar',
      { body: {} }
    );

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Calendar sync error:', error);
    throw error;
  }
}

/**
 * Get upcoming calendar events
 */
export async function getUpcomingEvents(daysAhead: number = 7) {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', new Date().toISOString())
      .lte(
        'start_time',
        new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString()
      )
      .order('start_time', { ascending: true });

    if (error) throw error;

    return (data || []).map((event: any) => ({
      id: event.external_id,
      title: event.title,
      startTime: new Date(event.start_time),
      endTime: new Date(event.end_time),
      duration:
        (new Date(event.end_time).getTime() -
          new Date(event.start_time).getTime()) /
        (1000 * 60),
      description: event.description,
      location: event.location,
      isAllDay: event.is_all_day || false,
    }));
  } catch (error) {
    console.error('Fetch events error:', error);
    return [];
  }
}

/**
 * Detect calendar patterns (overload, busy days, etc.)
 */
export async function detectCalendarPatterns(
  daysAhead: number = 7
): Promise<CalendarPattern> {
  try {
    const events = await getUpcomingEvents(daysAhead);

    // Group by day
    const eventsByDay = new Map<string, CalendarEvent[]>();
    events.forEach((event: CalendarEvent) => {
      const dayKey = event.startTime.toDateString();
      if (!eventsByDay.has(dayKey)) {
        eventsByDay.set(dayKey, []);
      }
      eventsByDay.get(dayKey)!.push(event);
    });

    // Calculate metrics
    let daysOverbooked = 0;
    const busyDays: string[] = [];
    let totalBusyMinutes = 0;

    eventsByDay.forEach((dayEvents, dayKey) => {
      const dayMinutes = dayEvents.reduce(
        (sum, event) => sum + event.duration,
        0
      );
      totalBusyMinutes += dayMinutes;

      // > 8 hours = overbooked
      if (dayMinutes > 480) {
        daysOverbooked++;
        busyDays.push(dayKey);
      }
    });

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (daysOverbooked >= 2) {
      riskLevel = 'high';
    } else if (daysOverbooked === 1) {
      riskLevel = 'medium';
    }

    // Generate suggestions
    const suggestions: string[] = [];
    if (daysOverbooked > 0) {
      suggestions.push(
        `Your ${busyDays.join(', ')} is fully booked—reduce new commitments.`
      );
    }
    if (totalBusyMinutes > 2880) {
      // 48 hours
      suggestions.push(
        'You have high calendar load this week. Focus on existing commitments.'
      );
    }
    if (eventsByDay.size === 0) {
      suggestions.push('Your calendar is clear—good time for new commitments.');
    }

    return {
      eventCount: events.length,
      busyMinutes: totalBusyMinutes,
      daysOverbooked,
      likelyFailureRisk: riskLevel,
      suggestions,
      busyDays,
    };
  } catch (error) {
    console.error('Pattern detection error:', error);
    return {
      eventCount: 0,
      busyMinutes: 0,
      daysOverbooked: 0,
      likelyFailureRisk: 'low',
      suggestions: ['Unable to analyze calendar'],
      busyDays: [],
    };
  }
}

/**
 * Check if user has calendar connected
 */
export async function hasCalendarConnected() {
  try {
    const { data, error } = await supabase
      .from('user_source_connections')
      .select('is_connected')
      .eq('source_type', 'google_calendar')
      .single();

    if (error) return false;
    return data?.is_connected || false;
  } catch {
    return false;
  }
}

/**
 * Get last sync time
 */
export async function getLastSyncTime() {
  try {
    const { data, error } = await supabase
      .from('user_source_connections')
      .select('last_sync_time')
      .eq('source_type', 'google_calendar')
      .single();

    if (error) return null;
    return data?.last_sync_time ? new Date(data.last_sync_time) : null;
  } catch {
    return null;
  }
}
