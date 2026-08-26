import { PROFILE_TEMPLATES, DEMO_RECIPIENTS } from './constitutions';
import type { Agent, AgentType } from './types';

export const seedAgent = (
  id: string,
  name: string,
  type: AgentType,
  over: Partial<Agent> = {},
): Agent => ({
  id,
  name,
  type,
  mode: 'live',
  state: 'autonomous',
  constitution: { ...PROFILE_TEMPLATES.balanced, approvedRecipients: [...DEMO_RECIPIENTS] },
  spentToday: 0,
  spentMonth: 0,
  failedCount: 0,
  riskScore: 12,
  createdAt: Date.now(),
  ...over,
});

/** Treasury performance series used by the overview and treasury charts. */
export const TREASURY_SERIES = [
  22.41, 22.62, 22.35, 22.98, 22.81, 23.34, 23.19, 23.72, 23.58, 24.11, 23.96, 24.44, 24.61, 24.73,
];

export const DAILY_BURN = [212, 288, 176, 204, 141, 266, 312];
export const ALLOCATION = [
  { name: 'USDC', pct: 58.3, color: '#2962FF' },
  { name: 'ETH', pct: 20.1, color: '#66E1FF' },
  { name: 'ETH LSTs', pct: 12.7, color: '#5C6784' },
  { name: 'Other assets', pct: 8.9, color: '#D4AF37' },
];
