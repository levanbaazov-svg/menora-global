'use client';

import * as React from 'react';

// Demo state for the Online Cheder prototype. localStorage-backed so the Rav
// can enroll the first talmid on his own iPad and it survives reloads.

export type Child = { name: string; grade: number; favorite?: string };

type Persisted = {
  child: Child | null;
  tickets: number;
  done: string[];
  raffleEntries: number;
};

type ChederState = Persisted & {
  ready: boolean;
  enroll: (child: Child) => void;
  markDone: (blockId: string, reward: number) => void;
  isDone: (blockId: string) => boolean;
  spendTickets: (n: number) => boolean;
  enterRaffle: (cost: number) => boolean;
  reset: () => void;
};

const KEY = 'cheder-demo-v1';

const EMPTY: Persisted = { child: null, tickets: 0, done: [], raffleEntries: 0 };

const ChederContext = React.createContext<ChederState | null>(null);

export function ChederProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [state, setState] = React.useState<Persisted>(EMPTY);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...(JSON.parse(raw) as Persisted) });
    } catch {
      // corrupted storage — start fresh
    }
    setReady(true);
  }, []);

  const persist = React.useCallback((next: Persisted) => {
    setState(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage unavailable (private mode) — keep in-memory state
    }
  }, []);

  const value = React.useMemo<ChederState>(() => ({
    ...state,
    ready,
    enroll: (child) => persist({ ...EMPTY, child }),
    isDone: (id) => state.done.includes(id),
    markDone: (id, reward) => {
      if (state.done.includes(id)) return;
      persist({ ...state, done: [...state.done, id], tickets: state.tickets + reward });
    },
    spendTickets: (n) => {
      if (state.tickets < n) return false;
      persist({ ...state, tickets: state.tickets - n });
      return true;
    },
    enterRaffle: (cost) => {
      if (state.tickets < cost) return false;
      persist({
        ...state,
        tickets: state.tickets - cost,
        raffleEntries: state.raffleEntries + 1,
      });
      return true;
    },
    reset: () => persist(EMPTY),
  }), [state, ready, persist]);

  return <ChederContext.Provider value={value}>{children}</ChederContext.Provider>;
}

export function useCheder(): ChederState {
  const ctx = React.useContext(ChederContext);
  if (!ctx) throw new Error('useCheder must be used inside <ChederProvider>');
  return ctx;
}
