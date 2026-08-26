import type { AgentType, Constitution, RiskProfile } from './types';

/** Recommended defaults by risk profile. Shown as templates in the builder. */
export const PROFILE_TEMPLATES: Record<RiskProfile, Constitution> = {
  conservative: {
    dailyLimit: 25,
    maxTransaction: 10,
    monthlyLimit: 500,
    allowedTokens: ['USDC'],
    approvedRecipients: [],
    unknownRecipient: 'block',
    emergencyReserve: 100,
    failedTxThreshold: 3,
    velocityThreshold: 150,
    riskThreshold: 40,
    permissionExpiryDays: 30,
  },
  balanced: {
    dailyLimit: 50,
    maxTransaction: 25,
    monthlyLimit: 1200,
    allowedTokens: ['USDC', 'ETH'],
    approvedRecipients: [],
    unknownRecipient: 'review',
    emergencyReserve: 100,
    failedTxThreshold: 4,
    velocityThreshold: 200,
    riskThreshold: 55,
    permissionExpiryDays: 60,
  },
  autonomous: {
    dailyLimit: 250,
    maxTransaction: 100,
    monthlyLimit: 5000,
    allowedTokens: ['USDC', 'ETH', 'cbBTC'],
    approvedRecipients: [],
    unknownRecipient: 'review',
    emergencyReserve: 250,
    failedTxThreshold: 5,
    velocityThreshold: 250,
    riskThreshold: 70,
    permissionExpiryDays: 90,
  },
};

export const PROFILE_COPY: Record<RiskProfile, { title: string; body: string }> = {
  conservative: {
    title: 'Conservative',
    body: 'Small ceilings, allowlist only, low risk tolerance. Use this for an agent you have not watched run before.',
  },
  balanced: {
    title: 'Balanced',
    body: 'Working limits for a production agent. Unknown recipients are held for review rather than refused outright.',
  },
  autonomous: {
    title: 'Autonomous',
    body: 'Wide authority for an agent with a track record. Reserve floors and Safe Mode still apply.',
  },
};

export const AGENT_TEMPLATES: Record<
  Exclude<AgentType, 'custom'>,
  { name: string; blurb: string; constitution: Partial<Constitution> }
> = {
  research: {
    name: 'Research Scout',
    blurb: 'Buys datasets, API credits and compute. Many small payments.',
    constitution: { dailyLimit: 25, maxTransaction: 10, monthlyLimit: 500, unknownRecipient: 'block' },
  },
  trading: {
    name: 'Trading Agent',
    blurb: 'Executes swaps inside hard position boundaries.',
    constitution: { dailyLimit: 50, maxTransaction: 25, monthlyLimit: 1200, riskThreshold: 45 },
  },
  yield: {
    name: 'Yield Agent',
    blurb: 'Allocates to allowlisted venues under a reserve floor.',
    constitution: { dailyLimit: 35, maxTransaction: 30, monthlyLimit: 900, emergencyReserve: 150 },
  },
  ops: {
    name: 'Ops Agent',
    blurb: 'Pays recurring infrastructure on a fixed recipient list.',
    constitution: { dailyLimit: 8, maxTransaction: 8, monthlyLimit: 240, unknownRecipient: 'block' },
  },
  social: {
    name: 'Social Agent',
    blurb: 'Pays for distribution, boosts and content services.',
    constitution: { dailyLimit: 15, maxTransaction: 10, monthlyLimit: 300 },
  },
};

export const DEMO_RECIPIENTS = [
  '0x9c12aA4b7E1f0000000000000000000000001d44',
  '0x4a6bC0dE9f1200000000000000000000000008f2',
  '0x7bA3E1420000000000000000000000000000ac90',
];
