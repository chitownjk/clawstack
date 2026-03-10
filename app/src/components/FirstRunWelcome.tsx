'use client';

import { useState, useEffect } from 'react';

interface FirstRunWelcomeProps {
  firstName?: string | null;
  onBriefingReady: () => void;
}

const STEPS = [
  { label: 'Scanning your inbox...', icon: '📬', duration: 8000 },
  { label: 'Finding flights, bills, and events...', icon: '🔍', duration: 10000 },
  { label: 'Building your briefing...', icon: '✨', duration: 12000 },
  { label: 'Almost ready...', icon: '🚀', duration: 15000 },
];

// Demo data showing what a briefing looks like
const DEMO_ITEMS = [
  { type: 'flight', icon: '✈️', title: 'Flight to LAX', detail: 'Mar 15, 8:30 AM - Delta DL1234', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { type: 'bill', icon: '💳', title: 'Electric bill due', detail: '$142.50 due Mar 20', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { type: 'invite', icon: '📅', title: 'Team standup', detail: 'Today at 10:00 AM - Google Meet', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
];

export default function FirstRunWelcome({ firstName, onBriefingReady }: FirstRunWelcomeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // Advance through visual steps
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    STEPS.forEach((step, i) => {
      if (i > 0) {
        timers.push(setTimeout(() => setCurrentStep(i), step.duration));
      }
    });

    // Show connect prompt after 10 seconds if still on early steps
    timers.push(setTimeout(() => setShowConnectPrompt(true), 10000));

    return () => timers.forEach(clearTimeout);
  }, []);

  // Poll for briefing readiness
  useEffect(() => {
    const interval = setInterval(async () => {
      setPollCount(prev => {
        if (prev >= 12) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });

      try {
        const res = await fetch('/api/briefing/generate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: false }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.briefing?.sections?.summary || data.briefing?.summary) {
            clearInterval(interval);
            onBriefingReady();
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onBriefingReady]);

  return (
    <div className="flex flex-col h-full overflow-y-auto scroll-smooth">
      <div className="max-w-2xl w-full mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Welcome header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Welcome to Tiker{firstName ? `, ${firstName}` : ''}! 🎉
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-lg">
            Setting up your personal briefing...
          </p>
        </div>

        {/* Progress steps */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  i <= currentStep ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <span className="text-xl flex-shrink-0">{step.icon}</span>
                <span className={`text-sm font-medium ${
                  i === currentStep
                    ? 'text-blue-600 dark:text-blue-400'
                    : i < currentStep
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-neutral-400 dark:text-neutral-500'
                }`}>
                  {i < currentStep ? step.label.replace('...', ' done!') : step.label}
                </span>
                {i === currentStep && (
                  <div className="flex gap-1 ml-auto">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
                {i < currentStep && (
                  <span className="ml-auto text-green-500 text-sm">&#10003;</span>
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-6 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(((currentStep + 1) / STEPS.length) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Connect Gmail prompt */}
        {showConnectPrompt && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-3">
              Connect Gmail to see your flights, bills, and invites in every briefing
            </p>
            <a
              href="/settings/connections"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/>
              </svg>
              Connect Gmail
            </a>
          </div>
        )}

        {/* Preview: what your briefing will look like */}
        <div>
          <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-3 text-center">
            Here's a preview of what your daily briefing will look like
          </p>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 opacity-70">
            <div className="space-y-3">
              {DEMO_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800"
                >
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.color} flex-shrink-0`}>
                    {item.icon} {item.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-4 italic">
              Sample data -- your real briefing will appear here shortly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
