'use client';
import type { GameId, Member, Pokemon } from '@/lib/contracts';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
type SavedTeam = {
  id: string;
  name: string;
  gameId: GameId;
  mode: string;
  members: { formId: number; slot: number; config: Member }[];
};
export type SavedBuild = {
  id: string;
  name: string;
  formId: number;
  gameId: GameId;
  style: string;
  moves: { moveId: number }[];
  config: { itemId?: number; abilityId?: number; nature?: string };
};
export type Personal = {
  user: {
    id: string;
    name: string;
    email: string;
    preferences: {
      game?: GameId;
      stage?: number;
      stages?: Partial<Record<GameId, number>>;
      theme?: 'dark' | 'light';
      history?: boolean;
    };
  };
  teams: SavedTeam[];
  builds: SavedBuild[];
  favorites: number[];
  history: { formId: number; gameId: GameId; createdAt: string }[];
  conversations: { id: string; title: string; messages: { role: string; content: string }[] }[];
};
export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const r = await fetch(`/api/hub/${path}`, {
    method,
    headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error ?? 'Falha na operação.');
  return json as T;
}
type HubContext = {
  catalog: Pokemon[];
  game: GameId;
  setGame: (game: GameId) => void;
  personal: Personal | null;
  personalLoading: boolean;
  refresh: () => Promise<void>;
  notify: (text: string) => void;
  draft: Member[];
  setDraft: (members: Member[], draftGame?: GameId) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  editTeamId: string | null;
  setEditTeamId: (id: string | null) => void;
};
const Context = createContext<HubContext | null>(null);
export function HubProvider({ catalog, children }: { catalog: Pokemon[]; children: ReactNode }) {
  const router = useRouter();
  const [game, setGameState] = useState<GameId>('sword');
  const [personal, setPersonal] = useState<Personal | null>(null);
  const [personalLoading, setPersonalLoading] = useState(true);
  const [draft, setDraftState] = useState<Member[]>([]);
  const [theme, setThemeState] = useState<'dark' | 'light'>('light');
  const [themeReady, setThemeReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const notify = useCallback((text: string) => {
    setNotice(text);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(id);
  }, [notice]);
  const refresh = useCallback(async () => {
    setPersonalLoading(true);
    try {
      const value = await api<Personal>('me');
      setPersonal(value);
    } catch {
      setPersonal(null);
    } finally {
      setPersonalLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const g = localStorage.getItem('hub-game');
    if (g === 'sword' || g === 'arceus' || g === 'za') setGameState(g);
    const t = localStorage.getItem('hub-theme');
    if (t === 'light' || t === 'dark') setThemeState(t);
    setThemeReady(true);
    try {
      const saved = JSON.parse(sessionStorage.getItem('hub-draft') ?? 'null');
      if (saved && Array.isArray(saved.members) && ['sword', 'arceus', 'za'].includes(saved.game)) {
        setGameState(saved.game);
        setDraftState(saved.members);
      }
    } catch {}
  }, [refresh]);
  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('hub-theme', theme);
  }, [theme, themeReady]);
  const setGame = (next: GameId) => {
    if (next !== game) {
      setDraftState([]);
      sessionStorage.removeItem('hub-draft');
      setEditTeamId(null);
    }
    setGameState(next);
    localStorage.setItem('hub-game', next);
  };
  const setDraft = (members: Member[], draftGame: GameId = game) => {
    setDraftState(members);
    sessionStorage.setItem('hub-draft', JSON.stringify({ game: draftGame, members }));
  };
  const gameCatalog = catalog.map((p) => ({ ...p, stats: p.statsByGame?.[game] ?? p.stats }));
  return (
    <Context.Provider
      value={{
        catalog: gameCatalog,
        game,
        setGame,
        personal,
        personalLoading,
        refresh,
        notify,
        draft,
        setDraft,
        theme,
        setTheme: setThemeState,
        editTeamId,
        setEditTeamId,
      }}
    >
      {children}
      <div
        className={`toast ${notice ? 'visible' : ''}`}
        role="status"
        inert={!notice}
        aria-hidden={!notice}
      >
        {notice}
        <button onClick={() => setNotice('')} aria-label="Fechar aviso">
          ×
        </button>
        {notice.includes('Entre na') && (
          <button onClick={() => router.push('/perfil')}>Entrar →</button>
        )}
      </div>
    </Context.Provider>
  );
}
export function useHub() {
  const value = useContext(Context);
  if (!value) throw new Error('HubProvider ausente.');
  return value;
}
