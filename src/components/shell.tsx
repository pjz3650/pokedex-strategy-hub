'use client';
import { GAMES } from '@/lib/games';
import {
  ArrowUpRight,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  FolderHeart,
  GitCompareArrows,
  Heart,
  Layers3,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Moon,
  PanelLeftClose,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Shuffle,
  Sun,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PokemonImage } from './pokemon-ui';
import { useHub } from './providers';
export const NAV = [
  { href: '/', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/pokedex', label: 'Pokédex', icon: BookOpen },
  { href: '/analisador', label: 'Analisador', icon: ScanLine },
  { href: '/builds', label: 'Builds', icon: Layers3 },
  { href: '/equipes', label: 'Construtor de equipes', icon: Users },
  { href: '/gerador', label: 'Gerador automático', icon: Shuffle },
  { href: '/tiers', label: 'Tier lists', icon: ChartNoAxesColumnIncreasing },
  { href: '/comparador', label: 'Comparador', icon: GitCompareArrows },
  { href: '/assistente', label: 'Assistente estratégico', icon: MessagesSquare },
  { href: '/minhas-equipes', label: 'Minhas equipes', icon: FolderHeart },
  { href: '/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/perfil', label: 'Perfil e configurações', icon: Settings },
];
export function Shell({ children }: { children: ReactNode }) {
  const { game, setGame, personal, theme, setTheme, catalog } = useHub();
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState('');
  const modal = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 961px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMobile(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () =>
      [
        ...(sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ??
          []),
      ].filter((element) => element.offsetParent !== null);
    controls()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobile(false);
      if (event.key !== 'Tab') return;
      const elements = controls();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [mobile]);
  function openSearch() {
    modal.current?.showModal();
    input.current?.focus();
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const matches = query.trim()
    ? catalog
        .filter(
          (p) =>
            p.availability.some((a) => a.gameId === game) &&
            (p.name.toLowerCase().includes(query.toLowerCase()) ||
              String(p.speciesId) === query.replace('#', '')),
        )
        .slice(0, 8)
    : [];
  const current =
    NAV.find((n) => n.href === pathname)?.label ??
    (pathname === '/fontes' ? 'Fontes e critérios' : 'Detalhes do Pokémon');
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        Ir para o conteúdo
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobile(false)}
          aria-label="Fechar menu"
        />
      )}
      <aside
        ref={sidebar}
        id="main-navigation"
        className={`sidebar ${mobile ? 'sidebar-open' : ''}`}
        role={mobile ? 'dialog' : undefined}
        aria-modal={mobile || undefined}
        aria-label="Menu do Pokétactics"
      >
        <Link href="/" className="brand" onClick={() => setMobile(false)}>
          <span className="brand-icon">
            <span className="pokeball-mark" />
          </span>
          <span>
            poké<span className="brand-light">tactics</span>
            <small>Pokédex e estratégia</small>
          </span>
        </Link>
        <div className="nav-label">
          Explorar{' '}
          <button
            className="mobile-only icon-button"
            onClick={() => setMobile(false)}
            aria-label="Fechar navegação"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <nav aria-label="Navegação principal">
          {NAV.map((item, i) => (
            <div key={item.href}>
              {i === 2 && <div className="nav-label collection-label">Planejar e analisar</div>}
              {i === 9 && <div className="nav-label collection-label">Sua coleção</div>}
              <Link
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'selected' : ''}`}
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={() => setMobile(false)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.href === '/assistente' && <span className="nav-new">Beta</span>}
                {pathname === item.href && <i />}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status">
            <span /> Dados separados por jogo
            <ShieldCheck size={13} />
          </div>
          <Link href="/perfil" className="account-link">
            <span className="avatar">
              {personal ? personal.user.name.slice(0, 2).toUpperCase() : <UserRound size={18} />}
            </span>
            <span>
              <b>{personal?.user.name ?? 'Olá, treinador'}</b>
              <small>{personal ? 'Sua jornada, organizada' : 'Entre para salvar equipes'}</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </aside>
      <div className="workspace" inert={mobile}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-only"
              onClick={() => setMobile(true)}
              aria-label="Abrir navegação"
              aria-expanded={mobile}
              aria-controls="main-navigation"
            >
              <Menu size={22} />
            </button>
            <span>Pokétactics</span>
            <span className="breadcrumb-slash">/</span>
            <b>{current}</b>
          </div>
          <div className="topbar-actions">
            <button className="global-search" aria-label="Buscar Pokémon" onClick={openSearch}>
              <Search size={16} />
              <span>Buscar Pokémon...</span>
              <kbd>Ctrl K</kbd>
            </button>
            <div className={`game-select game-${game}`}>
              <span className="status-dot" />
              <select
                aria-label="Jogo selecionado"
                value={game}
                onChange={(e) => setGame(e.target.value as typeof game)}
              >
                {Object.values(GAMES).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.short}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <button
              className="icon-button theme-toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Ativar tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/perfil" className="avatar small-avatar" aria-label="Abrir perfil">
              {personal ? personal.user.name.slice(0, 1).toUpperCase() : <UserRound size={17} />}
            </Link>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {children}
          <footer className="site-footer">
            <span>
              <span className="pokeball-mark" /> Feito para pensar o próximo movimento.
            </span>
            <Link href="/fontes">
              Fontes, critérios e cobertura <ArrowUpRight size={12} />
            </Link>
            <small>Projeto de fãs · Sem vínculo com Nintendo ou The Pokémon Company</small>
          </footer>
        </main>
      </div>
      <dialog
        ref={modal}
        className="search-dialog"
        aria-label="Buscar Pokémon"
        onClick={(e) => {
          if (e.target === modal.current) modal.current?.close();
        }}
      >
        <div className="search-dialog-inner">
          <div className="search-dialog-input">
            <Search size={20} />
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome ou número do Pokémon"
              aria-label="Busca global"
            />
            <button
              className="icon-button"
              onClick={() => modal.current?.close()}
              aria-label="Fechar busca"
            >
              <X size={20} />
            </button>
          </div>
          <div className="search-results">
            {!query && <p>Explore os Pokémon disponíveis em {GAMES[game].name}.</p>}
            {query && !matches.length && <p>Nenhum Pokémon encontrado neste jogo.</p>}
            {matches.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  modal.current?.close();
                  router.push(`/pokemon/${p.id}?game=${game}`);
                }}
              >
                <PokemonImage pokemon={p} size={48} />
                <span>
                  <b>{p.name}</b>
                  <small>#{String(p.speciesId).padStart(4, '0')}</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          <div className="search-hint">
            <kbd>esc</kbd> para fechar <span>Busca em dados locais</span>
          </div>
        </div>
      </dialog>
    </div>
  );
}
