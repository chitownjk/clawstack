'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsNav() {
  const pathname = usePathname();

  const tabs = [
    { href: '/settings', label: 'Account' },
    { href: '/settings/connections', label: 'Connections' },
    { href: '/settings/briefing', label: 'Briefing' },
    { href: '/settings/execution', label: 'Execution' },
    { href: '/settings/usage', label: 'Usage' },
  ];

  return (
    <div className="flex gap-4 mb-8 border-b border-neutral-200 dark:border-neutral-800">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              isActive
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-medium'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
