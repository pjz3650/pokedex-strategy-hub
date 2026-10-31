'use client';
import type { GameId } from '@/lib/contracts';
import { GAMES } from '@/lib/games';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  LogOut,
  Save,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PageHeading, SectionHeading } from './dashboard-catalog';
import { Notice } from './pokemon-detail';
import { api, SessionGate, useHub } from './providers';
import { savedStage } from '@/lib/ux-state';
import { Button } from './ui/button';
export function AccountPage() {
  const { personal, sessionStatus, refresh, notify, game, setGame, theme, setTheme, clearSession } =
    useHub();
  const params = useSearchParams();
  const token = params.get('token');
  const [mode, setMode] = useState<'login' | 'register' | 'recover' | 'reset'>(
    token ? 'reset' : 'login',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState(personal?.user.name ?? '');
  const [primary, setPrimary] = useState<GameId>(game);
  const [stage, setStage] = useState(0);
  const [history, setHistory] = useState(false);
  const hydrated = useRef<string | null>(null);
  useEffect(() => {
    if (personal && hydrated.current !== personal.user.id) {
      hydrated.current = personal.user.id;
      setName(personal.user.name);
      setPrimary(personal.user.preferences.game ?? game);
      setStage(savedStage(personal.user.preferences, personal.user.preferences.game ?? game));
      setHistory(personal.user.preferences.history ?? false);
    }
  }, [personal, game]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    try {
      if (mode === 'register') {
        await api('register', 'POST', { name: String(form.get('name')), email, password });
        const r = await signIn('credentials', { email, password, redirect: false });
        if (r?.error) throw new Error('Conta criada. Use o formulário de login para entrar.');
        await refresh();
        notify('Sua conta foi criada. Boa jornada!');
      } else if (mode === 'login') {
        const r = await signIn('credentials', { email, password, redirect: false });
        if (r?.error)
          throw new Error(
            'Não foi possível entrar. Confira seus dados ou aguarde antes de tentar novamente.',
          );
        await refresh();
        notify('Bem-vindo de volta.');
      } else if (mode === 'recover') {
        const r = await api<{ message: string }>('recover', 'POST', { email });
        setSuccess(r.message);
      } else {
        await api('reset', 'POST', { token, password });
        setSuccess('Senha redefinida. Entre com sua nova senha.');
        setMode('login');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError('');
    try {
      await api('me', 'PATCH', {
        name,
        preferences: {
          game: primary,
          stage,
          stages: { ...personal?.user.preferences.stages, [primary]: stage },
          theme,
          history,
        },
      });
      setGame(primary);
      const synced = await refresh();
      notify(
        synced
          ? 'Preferências salvas.'
          : 'Preferências gravadas; não foi possível atualizar a conta.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <PageHeading
        eyebrow="DO SEU JEITO"
        title={
          personal
            ? 'Sua jornada, suas escolhas.'
            : sessionStatus === 'visitor'
              ? 'Um lugar para guardar suas estratégias.'
              : 'Sua conta e suas estratégias.'
        }
        text={
          personal
            ? 'Gerencie sua conta, preferências e progresso selecionado.'
            : sessionStatus === 'visitor'
              ? 'Crie uma conta para salvar equipes, builds e Pokémon favoritos.'
              : 'Aguardando a confirmação da sessão para recuperar sua coleção.'
        }
      />
      {!personal && sessionStatus !== 'visitor' ? (
        <SessionGate />
      ) : personal ? (
        <div className="account-settings-grid">
          <section className="panel profile-card">
            <div className="large-avatar">{personal.user.name.slice(0, 2).toUpperCase()}</div>
            <h2>{personal.user.name}</h2>
            <p>{personal.user.email}</p>
            <span className="outline-tag">
              <ShieldCheck size={12} /> Sessão autenticada
            </span>
            <div className="profile-counts">
              <div>
                <Users size={17} />
                <b>{personal.teams.length}</b>
                <small>Equipes</small>
              </div>
              <div>
                <Heart size={17} />
                <b>{personal.favorites.length}</b>
                <small>Favoritos</small>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                clearSession();
                try {
                  await signOut({ redirect: false });
                  notify('Você saiu da conta.');
                } catch {
                  notify(
                    'Não foi possível confirmar a saída no servidor. Tente sair novamente antes de compartilhar este navegador.',
                  );
                }
              }}
            >
              <LogOut size={15} /> Sair da conta
            </Button>
          </section>
          <section className="panel settings-panel">
            <SectionHeading
              title="Preferências de treinador"
              caption="Seu progresso é registrado pela etapa selecionada, sem inventário manual."
            />
            <label>
              NOME
              <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="two-column">
              <label>
                JOGO PRINCIPAL
                <select
                  value={primary}
                  onChange={(e) => {
                    setPrimary(e.target.value as GameId);
                    setStage(personal.user.preferences.stages?.[e.target.value as GameId] ?? 0);
                  }}
                >
                  {Object.values(GAMES).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                ETAPA DA CAMPANHA
                <select value={stage} onChange={(e) => setStage(Number(e.target.value))}>
                  {GAMES[primary].stages.map((s, i) => (
                    <option value={i} key={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              TEMA
              <select value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)}>
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                checked={history}
                type="checkbox"
                onChange={(e) => setHistory(e.target.checked)}
              />
              <span>
                Guardar histórico de consultas e análises
                <small>Ao desativar e salvar, o histórico existente é excluído.</small>
              </span>
            </label>
            {error && (
              <div role="alert" className="error-notice">
                {error}
              </div>
            )}
            <Button onClick={save} disabled={busy}>
              <Save size={15} />
              {busy ? 'Salvando...' : 'Salvar preferências'}
            </Button>
            <Notice>
              As preferências de progresso estão disponíveis para o jogo principal. Etapas
              específicas de obtenção ainda têm cobertura parcial.
            </Notice>
          </section>
        </div>
      ) : (
        <div className="auth-layout">
          <section className="auth-story">
            <span className="auth-symbol">
              <span className="pokeball-mark" />
            </span>
            <h2>
              Ideias viram equipes.
              <br />
              Equipes viram <em>histórias.</em>
            </h2>
            <p>Tenha um espaço para organizar tudo que você está construindo.</p>
            <ul>
              <li>
                <Check size={16} /> Equipes e builds salvas na sua conta
              </li>
              <li>
                <Check size={16} /> Favoritos vinculados à sua conta
              </li>
              <li>
                <Check size={16} /> Senhas protegidas
              </li>
              <li>
                <Check size={16} /> Análises com critérios explicáveis
              </li>
            </ul>
          </section>
          <section className="panel auth-form">
            <div className="auth-form-top">
              <LockKeyhole size={23} />
              <h2>
                {mode === 'register'
                  ? 'Comece sua jornada.'
                  : mode === 'recover'
                    ? 'Recupere seu acesso.'
                    : mode === 'reset'
                      ? 'Escolha uma nova senha.'
                      : 'Que bom te ver por aqui.'}
              </h2>
              <p>
                {mode === 'login'
                  ? 'Entre para continuar montando sua próxima equipe.'
                  : mode === 'register'
                    ? 'Uma conta. Todas as suas estratégias.'
                    : 'Siga as instruções para redefinir sua senha.'}
              </p>
            </div>
            {(mode === 'login' || mode === 'register') && (
              <div className="auth-mode">
                <button
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                >
                  Entrar
                </button>
                <button
                  className={mode === 'register' ? 'active' : ''}
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                >
                  Criar conta
                </button>
              </div>
            )}
            <form onSubmit={submit}>
              {mode === 'register' && (
                <label>
                  SEU NOME
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder="Como podemos te chamar?"
                  />
                </label>
              )}
              {mode !== 'reset' && (
                <label>
                  E-MAIL
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    placeholder="treinador@exemplo.com"
                  />
                </label>
              )}
              {mode !== 'recover' && (
                <label>
                  SENHA
                  <div className="password-field">
                    <input
                      name="password"
                      type={visible ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={10}
                      maxLength={72}
                      required
                      placeholder="No mínimo 10 caracteres"
                    />
                    <button
                      type="button"
                      aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              )}
              {error && (
                <div className="error-notice" role="alert">
                  {error}
                </div>
              )}
              {success && (
                <div className="success-notice" role="status">
                  {success}
                </div>
              )}
              <Button type="submit" disabled={busy} className="full-width">
                {busy
                  ? 'Aguarde...'
                  : mode === 'login'
                    ? 'Entrar na minha conta'
                    : mode === 'register'
                      ? 'Criar minha conta'
                      : mode === 'reset'
                        ? 'Redefinir senha'
                        : 'Enviar instruções'}{' '}
                <ArrowRight size={16} />
              </Button>
            </form>
            {mode === 'login' ? (
              <button
                className="auth-recover text-link"
                onClick={() => {
                  setMode('recover');
                  setError('');
                }}
              >
                Esqueci minha senha
              </button>
            ) : (
              mode !== 'register' && (
                <button
                  className="auth-recover text-link"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                >
                  <ArrowLeft size={14} /> Voltar para o login
                </button>
              )
            )}
            <p className="fine-print">
              <ShieldCheck size={13} /> Entre para salvar suas estratégias. A Pokédex e as análises
              são públicas.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
