'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SettingsNav from '@/components/SettingsNav'

interface BriefingPrefs {
  briefing_time: string;
  briefing_email: boolean;
  timezone: string;
  briefing_sections: {
    schedule: boolean;
    tasks: boolean;
    email_intel: boolean;
    agent_activity: boolean;
    suggestions: boolean;
  };
  reminder_config: {
    escalation_days: number[];
    email_escalation: boolean;
  };
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const DEFAULT_PREFS: BriefingPrefs = {
  briefing_time: '06:00',
  briefing_email: false,
  timezone: 'America/New_York',
  briefing_sections: {
    schedule: true,
    tasks: true,
    email_intel: true,
    agent_activity: true,
    suggestions: true,
  },
  reminder_config: {
    escalation_days: [1, 3, 7],
    email_escalation: true,
  },
};

export default function BriefingSettingsPage() {
  const [prefs, setPrefs] = useState<BriefingPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get account
      const { data: account } = await supabase
        .from('accounts')
        .select('id')
        .eq('auth_uid', user.id)
        .single();

      if (!account) {
        setLoading(false);
        return;
      }

      setAccountId(account.id);

      // Load preferences
      const { data: userPrefs } = await supabase
        .from('mc_user_preferences')
        .select('briefing_time, briefing_email, briefing_sections, timezone, reminder_config')
        .eq('account_id', account.id)
        .single();

      if (userPrefs) {
        setPrefs({
          briefing_time: userPrefs.briefing_time || DEFAULT_PREFS.briefing_time,
          briefing_email: userPrefs.briefing_email ?? DEFAULT_PREFS.briefing_email,
          timezone: userPrefs.timezone || DEFAULT_PREFS.timezone,
          briefing_sections: userPrefs.briefing_sections || DEFAULT_PREFS.briefing_sections,
          reminder_config: userPrefs.reminder_config || DEFAULT_PREFS.reminder_config,
        });
      }

      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    if (!accountId) return;
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('mc_user_preferences')
        .upsert({
          account_id: accountId,
          briefing_time: prefs.briefing_time,
          briefing_email: prefs.briefing_email,
          briefing_sections: prefs.briefing_sections,
          timezone: prefs.timezone,
          reminder_config: prefs.reminder_config,
        }, { onConflict: 'account_id' });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Briefing preferences saved.' });
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to save preferences.' });
    } finally {
      setSaving(false);
    }
  }

  const updateSection = (key: keyof BriefingPrefs['briefing_sections'], value: boolean) => {
    setPrefs(p => ({
      ...p,
      briefing_sections: { ...p.briefing_sections, [key]: value },
    }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <SettingsNav />
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <SettingsNav />

      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Briefing Settings
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">
        Configure your daily intelligence briefing, delivery preferences, and reminder behavior.
      </p>

      <div className="space-y-8">

        {/* Delivery Time */}
        <Section title="Delivery Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Briefing Time
              </label>
              <input
                type="time"
                value={prefs.briefing_time}
                onChange={e => setPrefs(p => ({ ...p, briefing_time: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
              />
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                When your daily briefing is generated
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Timezone
              </label>
              <select
                value={prefs.timezone}
                onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <Toggle
              label="Email briefing"
              description="Receive your daily briefing via email"
              checked={prefs.briefing_email}
              onChange={v => setPrefs(p => ({ ...p, briefing_email: v }))}
            />
          </div>
        </Section>

        {/* Briefing Sections */}
        <Section title="Briefing Sections">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            Choose which sections appear in your daily briefing.
          </p>
          <div className="space-y-3">
            <Toggle label="Schedule" description="Today's calendar events and meetings"
              checked={prefs.briefing_sections.schedule} onChange={v => updateSection('schedule', v)} />
            <Toggle label="Tasks" description="Active tasks, reviews, and blockers"
              checked={prefs.briefing_sections.tasks} onChange={v => updateSection('tasks', v)} />
            <Toggle label="Email Intelligence" description="Flights, bills, invites extracted from your inbox"
              checked={prefs.briefing_sections.email_intel} onChange={v => updateSection('email_intel', v)} />
            <Toggle label="Agent Activity" description="What your AI agents have been working on"
              checked={prefs.briefing_sections.agent_activity} onChange={v => updateSection('agent_activity', v)} />
            <Toggle label="Suggestions" description="AI-generated recommendations for your day"
              checked={prefs.briefing_sections.suggestions} onChange={v => updateSection('suggestions', v)} />
          </div>
        </Section>

        {/* Reminder Escalation */}
        <Section title="Smart Reminders">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            When you miss a reminder, Tiker escalates with increasing urgency.
          </p>
          <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300 mb-4">
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
              Day 1
            </span>
            <span className="text-neutral-400">then</span>
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs font-medium">
              Day 3
            </span>
            <span className="text-neutral-400">then</span>
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">
              Day 7
            </span>
          </div>
          <Toggle
            label="Email escalation"
            description="Send an email when a reminder reaches escalation level 2+"
            checked={prefs.reminder_config.email_escalation}
            onChange={v => setPrefs(p => ({
              ...p,
              reminder_config: { ...p.reminder_config, email_escalation: v },
            }))}
          />
        </Section>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Sub-components --

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600'
        }`}>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
          {label}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
    </label>
  );
}
