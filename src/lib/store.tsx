'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { evaluate, nextState } from './policy-engine';
import { PROFILE_TEMPLATES, DEMO_RECIPIENTS } from './constitutions';
import { seedAgent } from './seed';
import { uid } from './format';
import type {
  Agent, AgentMode, Constitution, Decision, IntentRequest, RiskProfile, Treasury, Workspace,
} from './types';

const KEY = 'nomylax.workspace.v1';

interface State {
  workspace: Workspace | null;
  treasury: Treasury;
  agents: Agent[];
  decisions: Decision[];
  onboarded: boolean;
}

const DEFAULT_TREASURY: Treasury = {
  total: 24732.68,
  available: 21430.12,
  allocated: 3202.56,
  reserve: 100,
};

const initial: State = {
  workspace: null,
  treasury: DEFAULT_TREASURY,
  agents: [],
  decisions: [],
  onboarded: false,
};

interface Ctx extends State {
  ready: boolean;
  connect: (address: string) => void;
  createWorkspace: (w: Omit<Workspace, 'createdAt'>) => void;
  addAgent: (a: {
    name: string; type: Agent['type']; mode?: AgentMode; endpoint?: string;
    constitution?: Partial<Constitution>; profile?: RiskProfile;
  }) => Agent;
  updateConstitution: (agentId: string, patch: Partial<Constitution>) => void;
  setMode: (agentId: string, mode: AgentMode) => void;
  resetState: (agentId: string) => void;
  submit: (req: IntentRequest, opts?: { simulated?: boolean }) => Decision | null;
  recordDecisions: (d: Decision[]) => void;
  completeOnboarding: () => void;
  hardReset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {
      /* corrupt or unavailable storage — start clean */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode — the session still works in memory */
    }
  }, [state, ready]);

  const connect = useCallback((address: string) => {
    setState((s) => ({
      ...s,
      workspace: s.workspace ? { ...s.workspace, owner: address } : s.workspace,
    }));
  }, []);

  const createWorkspace = useCallback((w: Omit<Workspace, 'createdAt'>) => {
    setState((s) => ({ ...s, workspace: { ...w, createdAt: Date.now() } }));
  }, []);

  const addAgent: Ctx['addAgent'] = useCallback((a) => {
    const profile = a.profile ?? 'balanced';
    const agent = seedAgent(uid('agt'), a.name, a.type, {
      mode: a.mode ?? 'shadow',
      endpoint: a.endpoint,
      constitution: {
        ...PROFILE_TEMPLATES[profile],
        approvedRecipients: [...DEMO_RECIPIENTS],
        ...a.constitution,
      },
    });
    setState((s) => ({ ...s, agents: [...s.agents, agent] }));
    return agent;
  }, []);

  const updateConstitution: Ctx['updateConstitution'] = useCallback((agentId, patch) => {
    setState((s) => ({
      ...s,
      agents: s.agents.map((g) =>
        g.id === agentId ? { ...g, constitution: { ...g.constitution, ...patch } } : g,
      ),
    }));
  }, []);

  const setMode: Ctx['setMode'] = useCallback((agentId, mode) => {
    setState((s) => ({
      ...s,
      agents: s.agents.map((g) => (g.id === agentId ? { ...g, mode } : g)),
    }));
  }, []);

  /** Owner action. An agent can drop itself into Safe Mode; only this brings it back. */
  const resetState: Ctx['resetState'] = useCallback((agentId) => {
    setState((s) => ({
      ...s,
      agents: s.agents.map((g) =>
        g.id === agentId ? { ...g, state: 'autonomous', failedCount: 0 } : g,
      ),
    }));
  }, []);

  const submit: Ctx['submit'] = useCallback((req, opts = {}) => {
    let decision: Decision | null = null;
    setState((s) => {
      const agent = s.agents.find((g) => g.id === req.agentId);
      if (!agent) return s;

      const simulated = opts.simulated ?? agent.mode === 'shadow';
      const d = evaluate(agent, req, s.treasury, { simulated });
      decision = d;

      const executed = d.verdict === 'execute' && !simulated;
      const updated: Agent = {
        ...agent,
        spentToday: agent.spentToday + (executed ? req.amount : 0),
        spentMonth: agent.spentMonth + (executed ? req.amount : 0),
        failedCount: agent.failedCount + (d.verdict === 'blocked' ? 1 : 0),
        riskScore: d.risk.score,
      };
      updated.state = nextState(updated, d);

      const treasury: Treasury = executed
        ? {
            ...s.treasury,
            total: s.treasury.total - req.amount,
            available: s.treasury.available - req.amount,
          }
        : s.treasury;

      return {
        ...s,
        treasury,
        agents: s.agents.map((g) => (g.id === agent.id ? updated : g)),
        decisions: [d, ...s.decisions].slice(0, 400),
      };
    });
    return decision;
  }, []);

  const recordDecisions: Ctx['recordDecisions'] = useCallback((d) => {
    setState((s) => ({ ...s, decisions: [...d, ...s.decisions].slice(0, 400) }));
  }, []);

  const completeOnboarding = useCallback(() => setState((s) => ({ ...s, onboarded: true })), []);

  const hardReset = useCallback(() => {
    localStorage.removeItem(KEY);
    setState(initial);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state, ready, connect, createWorkspace, addAgent, updateConstitution,
      setMode, resetState, submit, recordDecisions, completeOnboarding, hardReset,
    }),
    [state, ready, connect, createWorkspace, addAgent, updateConstitution, setMode, resetState, submit, recordDecisions, completeOnboarding, hardReset],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
