'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function SettingsNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from('accounts')
        .select('role')
        .eq('auth_uid', user.id)
        .single();

      if (account?.role === 'mc_admin') {
        setIsAdmin(true);
      }
    }

    checkAdmin();
  }, []);

  const tabs = [
    { href: '/settings', label: 'Account' },
    { href: '/settings/connections', label: 'Connections' },
    { href: '/settings/briefing', label: 'Briefing' },
    { href: '/settings/execution', label: 'Execution' },
    { href: '/settings/usage', label: 'Usage' },
  ];

  const adminTabs = [
    { href: '/admin/setup', label: 'System Setup' },
    { href: '/admin/services', label: 'Services' },
  ];

  return (
    <div className="flex gap-4 mb-8 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-3 px-1 border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-medium'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}

      {isAdmin && (
        <>
          <div className="border-l border-neutral-200 dark:border-neutral-700 mx-1" />
          {adminTabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`pb-3 px-1 border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-medium'
                    : 'border-transparent text-neutral-500 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}
