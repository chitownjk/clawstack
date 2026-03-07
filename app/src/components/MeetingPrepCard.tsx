'use client';

import { useState, useCallback } from 'react';

interface MeetingPrepData {
  summary: string;
  talking_points: string[];
  questions: string[];
  attendee_notes: Array<{ name: string; note: string }>;
}

interface AttendeeProfile {
  email?: string;
  name?: string;
  title?: string;
  company?: string;
  linkedin_url?: string;
  headline?: string;
  location?: string;
  source: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  htmlLink?: string;
  attendees?: number | Array<{ email: string; name?: string; responseStatus?: string }>;
}

interface MeetingPrepCardProps {
  event: CalendarEvent;
}

export default function MeetingPrepCard({ event }: MeetingPrepCardProps) {
  const [prep, setPrep] = useState<MeetingPrepData | null>(null);
  const [attendees, setAttendees] = useState<AttendeeProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePrep = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build attendee list from event
      const attendeeList = Array.isArray(event.attendees)
        ? event.attendees.map(a => ({ email: a.email, name: a.name }))
        : [];

      const res = await fetch('/api/meeting-prep', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          event_title: event.title,
          attendees: attendeeList,
          start: event.start,
          description: event.description,
          location: event.location,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate meeting prep');
      }

      const data = await res.json();
      setPrep(data.prep);
      setAttendees(data.attendees || []);
      setExpanded(true);
    } catch (err: any) {
      console.error('Meeting prep error:', err);
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [event]);

  const eventTime = event.allDay
    ? 'All day'
    : new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const isUpcoming = new Date(event.start).getTime() - Date.now() < 2 * 60 * 60 * 1000; // Within 2 hours

  return (
    <div className={`rounded-lg border transition-all ${
      isUpcoming
        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
    }`}>
      {/* Event Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-1.5 rounded-full bg-green-500 self-stretch min-h-[36px] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {event.title}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {eventTime}
            {event.location && ` \u00B7 ${event.location}`}
            {typeof event.attendees === 'number' && event.attendees > 0 && ` \u00B7 ${event.attendees} attendees`}
            {Array.isArray(event.attendees) && event.attendees.length > 0 && ` \u00B7 ${event.attendees.length} attendees`}
          </p>
        </div>

        {/* Prep button */}
        {!prep && (
          <button
            onClick={generatePrep}
            disabled={loading}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex-shrink-0 ${
              isUpcoming
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50'
            }`}
          >
            {loading ? 'Preparing...' : 'Prep'}
          </button>
        )}

        {/* Toggle if prep exists */}
        {prep && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs px-2 py-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            {expanded ? 'Collapse' : 'Show prep'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Expanded Prep Content */}
      {prep && expanded && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 pb-4 pt-3 space-y-4">

          {/* AI Summary */}
          <div>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{prep.summary}</p>
          </div>

          {/* Attendee Profiles */}
          {attendees.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                Attendees
              </h4>
              <div className="space-y-2">
                {attendees.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-600 dark:text-neutral-300 flex-shrink-0">
                      {(a.name || a.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {a.name || a.email}
                        </p>
                        {a.linkedin_url && (
                          <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0">
                            LinkedIn
                          </a>
                        )}
                      </div>
                      {a.title && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {a.title}{a.company ? ` at ${a.company}` : ''}
                        </p>
                      )}
                      {/* Attendee note from AI */}
                      {prep.attendee_notes?.find(n => n.name === a.name)?.note && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 italic">
                          {prep.attendee_notes.find(n => n.name === a.name)?.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talking Points */}
          {prep.talking_points.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                Talking Points
              </h4>
              <div className="space-y-1.5">
                {prep.talking_points.map((point, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 flex-shrink-0 mt-0.5 font-mono text-xs">{i + 1}.</span>
                    <span className="text-neutral-700 dark:text-neutral-300">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions */}
          {prep.questions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                Questions to Ask
              </h4>
              <div className="space-y-1.5">
                {prep.questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 flex-shrink-0 mt-0.5">?</span>
                    <span className="text-neutral-700 dark:text-neutral-300">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
