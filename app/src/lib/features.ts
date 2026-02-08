/**
 * Feature checking utilities
 * Maps plan tiers to available features
 */

export type PlanTier = 'free' | 'cloud' | 'cloud-developer' | 'cloud-plus';
export type ExecutionMode = 'openclaw' | 'cloud-user-keys' | 'cloud-our-keys';

export interface AccountFeatures {
  ai_enabled: boolean;
  task_limit: number | null; // null = unlimited
  models: string[];
  api_access: boolean;
  webhooks: boolean;
  custom_agents: boolean;
  priority_queue: boolean;
  team_size: number;
  shared_boards: boolean;
  role_permissions: boolean;
  storage_mb: number;
  rate_limit_hour: number;
}

/**
 * Get features for a plan tier
 */
export function getFeaturesForTier(
  planTier: PlanTier,
  executionMode: ExecutionMode
): AccountFeatures {
  // Free BYOK
  if (planTier === 'free' && executionMode === 'cloud-user-keys') {
    return {
      ai_enabled: true,
      task_limit: null,
      models: ['user_provided'],
      api_access: false,
      webhooks: false,
      custom_agents: false,
      priority_queue: false,
      team_size: 1,
      shared_boards: false,
      role_permissions: false,
      storage_mb: 100,
      rate_limit_hour: 100,
    };
  }

  // Free No-AI
  if (planTier === 'free') {
    return {
      ai_enabled: false,
      task_limit: null,
      models: [],
      api_access: false,
      webhooks: false,
      custom_agents: false,
      priority_queue: false,
      team_size: 1,
      shared_boards: false,
      role_permissions: false,
      storage_mb: 10,
      rate_limit_hour: 10,
    };
  }

  // Solo ($19/mo)
  if (planTier === 'cloud') {
    return {
      ai_enabled: true,
      task_limit: 100,
      models: ['haiku', 'sonnet', 'kimi'],
      api_access: false,
      webhooks: false,
      custom_agents: false,
      priority_queue: false,
      team_size: 1,
      shared_boards: false,
      role_permissions: false,
      storage_mb: 500,
      rate_limit_hour: 200,
    };
  }

  // Developer ($49/mo)
  if (planTier === 'cloud-developer') {
    return {
      ai_enabled: true,
      task_limit: 400,
      models: ['haiku', 'sonnet', 'opus', 'kimi', 'gemini', 'gpt4'],
      api_access: true,
      webhooks: true,
      custom_agents: true,
      priority_queue: true,
      team_size: 1,
      shared_boards: false,
      role_permissions: false,
      storage_mb: 2048,
      rate_limit_hour: 500,
    };
  }

  // Team ($99/mo)
  if (planTier === 'cloud-plus') {
    return {
      ai_enabled: true,
      task_limit: 1000,
      models: ['haiku', 'sonnet', 'opus', 'kimi', 'gemini', 'gpt4'],
      api_access: true,
      webhooks: true,
      custom_agents: true,
      priority_queue: true,
      team_size: 10,
      shared_boards: true,
      role_permissions: true,
      storage_mb: 10240,
      rate_limit_hour: 1000,
    };
  }

  // Fallback (shouldn't happen)
  return {
    ai_enabled: false,
    task_limit: null,
    models: [],
    api_access: false,
    webhooks: false,
    custom_agents: false,
    priority_queue: false,
    team_size: 1,
    shared_boards: false,
    role_permissions: false,
    storage_mb: 10,
    rate_limit_hour: 10,
  };
}

/**
 * Check if account can use a specific model
 */
export function canUseModel(features: AccountFeatures, model: string): boolean {
  if (!features.ai_enabled) return false;
  
  // Map model identifiers to feature flags
  const modelMap: Record<string, string> = {
    'claude-3-5-haiku': 'haiku',
    'claude-3-5-sonnet': 'sonnet',
    'claude-opus-4.5': 'opus',
    'claude-3-7-sonnet': 'opus', // Reasoning tier
    'kimi-k2.5': 'kimi',
    'gemini-2.0-flash': 'gemini',
    'gpt-4-turbo': 'gpt4',
  };

  const featureKey = modelMap[model];
  if (!featureKey) return false;

  // Check if user has this model in their feature list
  return features.models.includes(featureKey) || features.models.includes('user_provided');
}

/**
 * Get upgrade prompt for a locked feature
 */
export function getUpgradePrompt(
  feature: keyof AccountFeatures,
  currentTier: PlanTier
): { title: string; description: string; targetTier: string; price: string } {
  const prompts: Record<string, any> = {
    api_access: {
      title: 'API Access',
      description: 'Programmatic access to create tasks, manage agents, and get results via REST API.',
      targetTier: 'Developer',
      price: '$49/mo',
    },
    webhooks: {
      title: 'Webhooks',
      description: 'Get real-time notifications when tasks complete, agents respond, or events occur.',
      targetTier: 'Developer',
      price: '$49/mo',
    },
    custom_agents: {
      title: 'Custom Agents',
      description: 'Upload your own agent personalities, prompts, and behaviors.',
      targetTier: 'Developer',
      price: '$49/mo',
    },
    shared_boards: {
      title: 'Shared Boards',
      description: 'Collaborate with team members on shared task boards and projects.',
      targetTier: 'Team',
      price: '$99/mo',
    },
    priority_queue: {
      title: 'Priority Execution',
      description: 'Your tasks jump to the front of the queue for faster results.',
      targetTier: 'Developer',
      price: '$49/mo',
    },
  };

  return prompts[feature] || {
    title: 'Premium Feature',
    description: 'This feature requires a paid plan.',
    targetTier: 'Solo',
    price: '$19/mo',
  };
}

/**
 * Check if account is over monthly task limit
 */
export async function isOverLimit(
  accountId: string,
  features: AccountFeatures
): Promise<{ overLimit: boolean; used: number; limit: number | null }> {
  // If no limit, never over
  if (features.task_limit === null) {
    return { overLimit: false, used: 0, limit: null };
  }

  // This would normally query the database
  // For now, return structure
  return {
    overLimit: false,
    used: 0,
    limit: features.task_limit,
  };
}

/**
 * Get tier name for display
 */
export function getTierName(planTier: PlanTier): string {
  const names: Record<PlanTier, string> = {
    'free': 'Free',
    'cloud': 'Solo',
    'cloud-developer': 'Developer',
    'cloud-plus': 'Team',
  };
  return names[planTier] || 'Free';
}

/**
 * Get tier color for UI
 */
export function getTierColor(planTier: PlanTier): string {
  const colors: Record<PlanTier, string> = {
    'free': 'text-neutral-600',
    'cloud': 'text-blue-600',
    'cloud-developer': 'text-purple-600',
    'cloud-plus': 'text-green-600',
  };
  return colors[planTier] || 'text-neutral-600';
}
