'use client';
import type { GameId, Member, Pokemon } from '@/lib/contracts';
import { useRouter } from 'next/navigation';
import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
export type SavedTeam = {
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
  conversations: {
    id: string;
    title: string;
    messages: {
      role: string;
      content: string;
      context?: { gameId?: GameId; formId?: number } | null;
    }[];
  }[];
};
import { api } from '@/lib/client-api';
import {
  changeDraft,
  emptyStore,
  exportDraft,
  isPermanent,
  newDraft,
  parseDraftStore,
  reconcileStore,
  sessionFailure,
  type BuildDraft,
  type DraftStore,
  type SessionStatus,
  type TeamDraft,
} from '@/lib/ux-state';
import { GAMES } from '@/lib/games';
import { canUse } from '@/lib/engine';
import { Button } from './ui/button';
export { api } from '@/lib/client-api';
export function downloadDraft(draft: TeamDraft) {
  const url = URL.createObjectURL(new Blob([exportDraft(draft)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'poketactics-equipe.json';
  a.click();
  URL.revokeObjectURL(url);
}
type HubContext = {
  catalog: Pokemon[];
  game: GameId;
  setGame: (game: GameId) => void;
  personal: Personal | null;
  personalLoading: boolean;
  sessionStatus: SessionStatus;
  refresh: () => Promise<boolean>;
  clearSession: () => void;
  notify: (text: string) => void;
  draft: Member[];
  teamDraft: TeamDraft;
  setDraft: (members: Member[], draftGame?: GameId) => void;
  setDraftName: (name: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  editTeamId: string | null;
  setEditTeamId: (id: string | null) => void;
  replaceTeam: (draft: TeamDraft) => Promise<boolean>;
  startNewTeam: (game: GameId) => Promise<boolean>;
  markTeamSaved: (snapshot: TeamDraft, id: string, owner: string) => void;
  detachTeam: (id: string) => void;
  buildDrafts: Record<string, BuildDraft>;
  setBuildDraft: (key: string, value: BuildDraft) => void;
  detachBuild: (id: string) => void;
  owner: string | null;
  storageWarning: string;
  privateDraftPending: boolean;
};
const Context = createContext<HubContext | null>(null);
export function HubProvider({ catalog, children }: { catalog: Pokemon[]; children: ReactNode }) {
  const router = useRouter();
  const [game, setGameState] = useState<GameId>('sword');
  const gameRef = useRef<GameId>('sword');
  const [personal, setPersonal] = useState<Personal | null>(null);
  const [sessionStatus, setStatus] = useState<SessionStatus>('loading');
  const [personalLoading, setPersonalLoading] = useState(true);
  const [store, setStore] = useState<DraftStore>(emptyStore);
  const storeRef = useRef(store);
  const pendingStore = useRef<DraftStore | null>(null);
  const ownerRef = useRef<string | null>(null);
  const sessionRequest = useRef(0);
  const [theme, setThemeState] = useState<'dark' | 'light'>('light');
  const [themeReady, setThemeReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [privateDraftPending, setPrivateDraftPending] = useState(false);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [replacement, setReplacement] = useState<{
    next: TeamDraft;
    resolve: (ok: boolean) => void;
  } | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const notify = useCallback((text: string) => setNotice(text), []);
  const persist = useCallback((next: DraftStore) => {
    storeRef.current = next;
    setStore(next);
    try {
      sessionStorage.setItem('hub-drafts-v2', JSON.stringify(next));
      sessionStorage.removeItem('hub-draft');
    } catch {
      setStorageWarning(
        'Armazenamento indisponível: o rascunho está apenas na memória. Exporte para guardar uma cópia.',
      );
    }
  }, []);
  const clearSession = useCallback(() => {
    setSessionEpoch((value) => value + 1);
    sessionRequest.current++;
    ownerRef.current = null;
    pendingStore.current = null;
    setPrivateDraftPending(false);
    setPersonal(null);
    setStatus('visitor');
    setPersonalLoading(false);
    persist(emptyStore());
    setReplacement((r) => {
      r?.resolve(false);
      return null;
    });
  }, [persist]);
  const refresh = useCallback(async () => {
    const request = ++sessionRequest.current;
    setPersonalLoading(true);
    try {
      const value = await api<Personal>('me');
      if (request !== sessionRequest.current) return false;
      if (!value?.user?.id || !Array.isArray(value.teams))
        throw new Error('Resposta de sessão inválida.');
      const source = pendingStore.current ?? storeRef.current;
      const next = reconcileStore(source, value.user.id, value.teams);
      for (const key of Object.keys(next.builds)) {
        const build = next.builds[key];
        if (build.buildId && !value.builds.some((b) => b.id === build.buildId))
          next.builds[key] = { ...build, buildId: undefined };
      }
      for (const d of Object.values(source.drafts))
        if (d?.editTeamId && !next.drafts[d.gameId]?.editTeamId && source.owner === value.user.id)
          notify('A equipe original não existe mais. Seu conteúdo foi mantido como cópia local.');
      pendingStore.current = null;
      setPrivateDraftPending(false);
      if (ownerRef.current && ownerRef.current !== value.user.id)
        setSessionEpoch((epoch) => epoch + 1);
      ownerRef.current = value.user.id;
      persist(next);
      setPersonal(value);
      setStatus('authenticated');
      return true;
    } catch (error) {
      if (request !== sessionRequest.current) return false;
      if (sessionFailure(error) === 'visitor') {
        // An anonymous draft remains anonymous. Confirmed account loss discards private drafts.
        if (ownerRef.current || pendingStore.current?.owner) clearSession();
        else {
          pendingStore.current = null;
          setPersonal(null);
          setStatus('visitor');
        }
      } else setStatus('unavailable');
      return false;
    } finally {
      if (request === sessionRequest.current) setPersonalLoading(false);
    }
  }, [clearSession, notify, persist]);
  useEffect(() => {
    try {
      const g = localStorage.getItem('hub-game');
      if (g === 'sword' || g === 'arceus' || g === 'za') {
        gameRef.current = g;
        setGameState(g);
      }
      const t = localStorage.getItem('hub-theme');
      if (t === 'light' || t === 'dark') setThemeState(t);
    } catch {
      setStorageWarning(
        'Armazenamento indisponível: preferências e rascunhos podem não sobreviver ao reload.',
      );
    }
    setThemeReady(true);
    try {
      const saved = parseDraftStore(
        sessionStorage.getItem('hub-drafts-v2') ?? sessionStorage.getItem('hub-draft'),
      );
      if (saved.owner) {
        pendingStore.current = saved;
        setPrivateDraftPending(true);
      } else {
        storeRef.current = saved;
        setStore(saved);
      }
    } catch {
      setStorageWarning(
        'Não foi possível recuperar o rascunho salvo. Você pode continuar editando ou importar uma cópia.',
      );
    }
    void refresh();
    window.addEventListener('hub-session-expired', clearSession);
    return () => {
      // This ref is a request revision, not a DOM ref; invalidate the latest request on unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sessionRequest.current++;
      window.removeEventListener('hub-session-expired', clearSession);
    };
  }, [clearSession, refresh]);
  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('hub-theme', theme);
    } catch {}
  }, [theme, themeReady]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (replacement) {
      modal.current?.showModal();
      cancel.current?.focus();
    } else modal.current?.close();
  }, [replacement]);
  useEffect(
    () => () => {
      replacement?.resolve(false);
    },
    [replacement],
  );
  function setGame(next: GameId) {
    if (next !== gameRef.current && storeRef.current.drafts[gameRef.current]?.members.length)
      notify(`Rascunho de ${GAMES[gameRef.current].short} preservado nesta sessão.`);
    gameRef.current = next;
    setGameState(next);
    if (['/pokedex', '/favoritos'].includes(window.location.pathname)) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('game') !== next) {
        url.searchParams.set('game', next);
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }
    try {
      localStorage.setItem('hub-game', next);
    } catch {}
  }
  function update(patch: Partial<TeamDraft>, target = gameRef.current) {
    const current = storeRef.current;
    const d = changeDraft(current.drafts[target] ?? newDraft(target), patch);
    persist({ ...current, drafts: { ...current.drafts, [target]: d } });
  }
  async function replaceTeam(next: TeamDraft) {
    const current = storeRef.current.drafts[next.gameId];
    if (current?.dirty && (current.members.length || current.name !== newDraft(next.gameId).name)) {
      if (replacement) return false;
      const ok = await new Promise<boolean>((resolve) => setReplacement({ next, resolve }));
      if (!ok) return false;
    }
    const valid = next.members.every((m) =>
      catalog.some((p) => p.id === m.formId && canUse(p, next.gameId) && isPermanent(p)),
    );
    if (!valid) {
      notify('O rascunho contém uma forma sem disponibilidade permanente neste jogo.');
      return false;
    }
    persist({ ...storeRef.current, drafts: { ...storeRef.current.drafts, [next.gameId]: next } });
    setGame(next.gameId);
    return true;
  }
  const teamDraft = store.drafts[game] ?? newDraft(game);
  return (
    <Context.Provider
      value={{
        catalog: catalog.map((p) => ({ ...p, stats: p.statsByGame?.[game] ?? p.stats })),
        game,
        setGame,
        personal,
        personalLoading,
        sessionStatus,
        refresh,
        clearSession,
        notify,
        draft: teamDraft.members,
        teamDraft,
        setDraft: (members, target = gameRef.current) => update({ members }, target),
        setDraftName: (name) => update({ name }),
        theme,
        setTheme: setThemeState,
        editTeamId: teamDraft.editTeamId,
        setEditTeamId: (id) => update({ editTeamId: id }),
        replaceTeam,
        startNewTeam: (target) => replaceTeam(newDraft(target)),
        markTeamSaved: (snapshot, id, owner) => {
          if (ownerRef.current === owner)
            update(
              { editTeamId: id, baseline: { name: snapshot.name, members: snapshot.members } },
              snapshot.gameId,
            );
        },
        detachTeam: (id) => {
          const next = { ...storeRef.current, drafts: { ...storeRef.current.drafts } };
          for (const d of Object.values(next.drafts))
            if (d?.editTeamId === id) next.drafts[d.gameId] = changeDraft(d, { editTeamId: null });
          persist(next);
        },
        owner: store.owner,
        storageWarning,
        privateDraftPending,
        buildDrafts: store.builds,
        setBuildDraft: (key, value) =>
          persist({ ...storeRef.current, builds: { ...storeRef.current.builds, [key]: value } }),
        detachBuild: (id) => {
          const builds = { ...storeRef.current.builds };
          for (const key of Object.keys(builds))
            if (builds[key].buildId === id) {
              builds[key] = { ...builds[key], buildId: undefined };
              const [game, form] = key.split(':');
              if (['sword', 'arceus', 'za'].includes(game))
                builds[game + ':' + form + ':new'] = builds[key];
            }
          persist({ ...storeRef.current, builds });
        },
      }}
    >
      {storageWarning && (
        <div className="notice" role="status">
          {storageWarning}
        </div>
      )}
      {sessionStatus === 'unavailable' && (
        <div className="error-notice" role="alert">
          Não foi possível sincronizar a sessão.{' '}
          {personal
            ? 'Último conteúdo desta sessão, desatualizado.'
            : 'Não foi possível consultar sua conta.'}{' '}
          <Button
            size="sm"
            variant="secondary"
            disabled={personalLoading}
            onClick={() => void refresh()}
          >
            Repetir
          </Button>
        </div>
      )}
      <Fragment key={sessionEpoch}>{children}</Fragment>
      <dialog
        ref={modal}
        className="import-dialog"
        aria-label="Substituir rascunho"
        onCancel={() => {
          replacement?.resolve(false);
          setReplacement(null);
        }}
      >
        <h2>Há alterações no rascunho de {replacement && GAMES[replacement.next.gameId].short}.</h2>
        <p>
          Para abrir esta equipe, o rascunho desse jogo será substituído. Você pode exportar antes
          de descartar.
        </p>
        <div className="button-row">
          <Button
            ref={cancel}
            variant="secondary"
            onClick={() => {
              replacement?.resolve(false);
              setReplacement(null);
            }}
          >
            Continuar editando
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const d = replacement && storeRef.current.drafts[replacement.next.gameId];
              if (d) downloadDraft(d);
            }}
          >
            Exportar rascunho
          </Button>
          <Button
            onClick={() => {
              replacement?.resolve(true);
              setReplacement(null);
            }}
          >
            Descartar e abrir
          </Button>
        </div>
      </dialog>
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
export function SessionGate() {
  const { sessionStatus, personalLoading } = useHub();
  return sessionStatus === 'loading' || personalLoading ? (
    <p role="status">Consultando sua sessão...</p>
  ) : sessionStatus === 'unavailable' ? (
    <p>Conta indisponível. Use Repetir para recuperar sua coleção.</p>
  ) : null;
}
export function useHub() {
  const value = useContext(Context);
  if (!value) throw new Error('HubProvider ausente.');
  return value;
}
