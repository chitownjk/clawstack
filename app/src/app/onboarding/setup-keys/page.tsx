'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page was removed from the onboarding flow.
// API key / model configuration lives in Settings > Integrations > Advanced.
export default function SetupKeysPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/execution');
  }, [router]);

  return null;
}
