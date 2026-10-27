'use client';
import type { Pokemon } from '@/lib/contracts';
import { analyzeTeam, bst, canUse, TYPE_LABELS, TYPES } from '@/lib/engine';
import { GAMES } from '@/lib/games';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Filter,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  Shuffle,
  Swords,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmptyState, PokemonCard, PokemonImage } from './pokemon-ui';
import { useHub } from './providers';
import { Button } from './ui/button';
export function PageHeading({
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
export function SectionHeading({
  title,
  caption,
  href,
  link = 'Ver todos',
}: {
  title: string;
  caption?: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {caption && <p>{caption}</p>}
      </div>
      {href && (
        <Link href={href}>
          {link}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Dashboard() {
  const { catalog, game, setGame, personal } = useHub();
  const available = catalog.filter((p) => canUse(p, game));
  const highlights = [448, 6, 282, 445, 94, 130]
    .map((id) => available.find((p) => p.id === id))
    .filter((p): p is Pokemon => !!p);
  for (const p of available.filter((p) => p.isDefault && bst(p.stats) > 500)) {
    if (highlights.length >= 6) break;
    if (!highlights.includes(p)) highlights.push(p);
  }
  const hero = catalog.find((p) => p.id === 448);
  const saves = personal?.teams.filter((t) => t.gameId === game) ?? [];
  const summaryTeam = saves[0];
  const summaryMembers =
    summaryTeam?.members
      .map((member) => catalog.find((pokemon) => pokemon.id === member.formId))
      .filter((pokemon): pokemon is Pokemon => !!pokemon) ?? [];
  const teamSummary =
    summaryMembers.length > 0
      ? analyzeTeam(
          summaryMembers.map((pokemon) => ({ pokemon, moves: [] })),
          game,
        )
      : null;
  const teamRiskTypes =
    teamSummary?.matrix.filter((type) => type.weak >= 2 && type.resist + type.immune === 0) ?? [];
  return (
    <div className="dashboard">
      <PageHeading
        eyebrow="SEU CENTRO DE ESTRATÉGIA"
        title={
          personal
            ? `Boa jornada, ${personal.user.name.split(' ')[0]}.`
            : 'Toda grande equipe começa aqui.'
        }
        text="Explore possibilidades. Encontre sinergias. Planeje a sua próxima vitória."
        action={
          <span className="data-status">
            <span /> Dados locais · por jogo
          </span>
        }
      />
      <div className="hero-grid">
        <section className="hero-main">
          <div className="hero-text">
            <h2>
              Seu instinto. Uma estratégia <em>melhor.</em>
            </h2>
            <p>
              Transforme seus Pokémon favoritos em uma equipe que faz sentido. Cada escolha tem um
              porquê.
            </p>
            <div className="hero-buttons">
              <Button asChild>
                <Link href="/equipes">
                  Construir minha equipe <ArrowUpRight size={16} />
                </Link>
              </Button>
              <Link className="hero-secondary" href="/pokedex">
                Explorar Pokédex <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hero-footnote">
              <span>
                <Check size={12} /> Análises explicáveis
              </span>
              <span>
                <Check size={12} /> Regras por jogo
              </span>
              <span>
                <Check size={12} /> 18 tipos
              </span>
            </div>
          </div>
          <div className="hero-art">
            {hero && <PokemonImage pokemon={hero} size={440} priority />}
            <div className="hero-pokemon-label">
              <Layers3 size={18} />
              <div>
                <b>Lucario</b>
                <small>Pokédex #0448</small>
              </div>
            </div>
          </div>
        </section>
        <section className="generator-promo">
          <div className="promo-top">
            <span className="promo-icon">
              <Shuffle size={23} />
            </span>
          </div>
          <div className="mini-team-visual">
            {[6, 282, 445].map((id) => {
              const p = catalog.find((p) => p.id === id);
              return p ? (
                <span key={id}>
                  <PokemonImage pokemon={p} size={82} />
                </span>
              ) : null;
            })}
            <span className="mini-plus">
              <Plus size={20} />
            </span>
          </div>
          <h2>
            O próximo encaixe
            <br />
            pode mudar tudo.
          </h2>
          <p>Encontre combinações com cobertura, equilíbrio e complementaridade.</p>
          <Link href="/gerador">
            Gerar uma equipe <ArrowUpRight size={18} />
          </Link>
          <div className="promo-foot">
            <ShieldCheck size={14} /> Cobertura e equilíbrio por jogo
          </div>
        </section>
      </div>
      <div className="game-section">
        <SectionHeading
          title="Qual é a sua próxima aventura?"
          caption="Dados e mecânicas que respeitam cada universo."
        />
        <div className="game-cards">
          {Object.values(GAMES).map((g, i) => (
            <button
              key={g.id}
              className={`game-card ${game === g.id ? 'game-card-active' : ''}`}
              style={{ '--game-color': g.color } as React.CSSProperties}
              onClick={() => setGame(g.id)}
            >
              <div className="game-emblem">
                {i === 0 ? (
                  <Swords size={28} />
                ) : i === 1 ? (
                  <Compass size={28} />
                ) : (
                  <span className="za-emblem">Z-A</span>
                )}
              </div>
              <div>
                <small>{g.region.toUpperCase()}</small>
                <h3>{g.name.replace('Pokémon ', '')}</h3>
                <p>{g.mechanic}</p>
              </div>
              <span className="game-card-check">
                {game === g.id ? <Check size={14} /> : <ArrowUpRight size={16} />}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="metrics-strip">
        <div>
          <BookOpen size={19} />
          <span>
            <b>{new Set(available.map((p) => p.speciesId)).size}</b>
            <small>Espécies no catálogo do jogo</small>
          </span>
        </div>
        <div>
          <Layers3 size={19} />
          <span>
            <b>{available.filter((p) => !p.isDefault).length}</b>
            <small>Formas alternativas catalogadas</small>
          </span>
        </div>
        <div>
          <Users size={19} />
          <span>
            <b>{saves.length.toString().padStart(2, '0')}</b>
            <small>Suas equipes salvas</small>
          </span>
        </div>
        <div>
          <ShieldCheck size={19} />
          <span>
            <b>18 tipos</b>
            <small>Cobertura calculada por código</small>
          </span>
        </div>
      </div>
      <section className="featured-section">
        <SectionHeading
          title="Um lugar no seu próximo time?"
          caption={`Conheça as possibilidades em ${GAMES[game].name}.`}
          href="/pokedex"
          link="Explorar Pokédex"
        />
        <div
          className="pokemon-grid featured-grid"
          tabIndex={0}
          role="region"
          aria-label="Pokémon em destaque"
        >
          {highlights.map((p, i) => (
            <PokemonCard key={p.id} pokemon={p} index={i} />
          ))}
        </div>
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <SectionHeading
            title="Seu laboratório de equipes"
            href="/minhas-equipes"
            link="Minha coleção"
          />
          {saves.length ? (
            <div className="compact-team-list">
              {saves.slice(0, 3).map((t) => (
                <Link href="/minhas-equipes" key={t.id}>
                  <div>
                    <h3>{t.name}</h3>
                    <p>
                      {t.members.length} integrantes · {GAMES[t.gameId].short}
                    </p>
                  </div>
                  <div className="compact-sprites">
                    {t.members.slice(0, 6).map((m, i) => {
                      const p = catalog.find((p) => p.id === m.formId);
                      return p ? <PokemonImage pokemon={p} size={52} key={i} /> : null;
                    })}
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="team-empty-inline">
              <div className="empty-team-slots">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i}>
                    <Plus size={17} />
                  </span>
                ))}
              </div>
              <h3>Seis escolhas. Infinitas possibilidades.</h3>
              <p>Monte sua primeira equipe e veja onde seus Pokémon se complementam.</p>
              <Button variant="secondary" asChild>
                <Link href="/equipes">
                  <Plus size={15} /> Criar primeira equipe
                </Link>
              </Button>
            </div>
          )}
          {summaryTeam && teamSummary && (
            <div className="team-snapshot">
              <div className="team-snapshot-heading">
                <div>
                  <span className="eyebrow">RESUMO TÁTICO</span>
                  <h3>{summaryTeam.name}</h3>
                </div>
                <Link href="/minhas-equipes" aria-label={`Abrir a equipe ${summaryTeam.name}`}>
                  <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="team-snapshot-metrics">
                <div>
                  <b>{summaryMembers.length}/6</b>
                  <small>integrantes</small>
                </div>
                <div>
                  <b>{teamSummary.averageSpeed}</b>
                  <small>Speed base média</small>
                </div>
                <div>
                  <b>{new Set(summaryMembers.flatMap((pokemon) => pokemon.types)).size}</b>
                  <small>tipos distintos</small>
                </div>
              </div>
              <p className="team-snapshot-note">
                {teamRiskTypes.length ? (
                  <>
                    Fraquezas compartilhadas sem resposta defensiva:{' '}
                    {teamRiskTypes
                      .slice(0, 3)
                      .map((type) => TYPE_LABELS[type.type])
                      .join(', ')}
                    .
                  </>
                ) : (
                  'Nenhuma fraqueza compartilhada sem resistência ou imunidade foi encontrada pela tipagem.'
                )}{' '}
                Habilidades e movimentos não entram neste resumo.
              </p>
            </div>
          )}
        </section>
        <section className="knowledge-panel panel">
          <div className="knowledge-icon">
            <ShieldCheck size={26} />
          </div>
          <h2>
            Uma boa estratégia
            <br />
            começa com confiança.
          </h2>
          <p>
            Tipagem, learnsets e disponibilidade separados por jogo. Quando falta uma informação, a
            gente mostra.
          </p>
          <Link href="/fontes">
            Conheça os dados e critérios <ArrowUpRight size={16} />
          </Link>
          <div className="knowledge-divider" />
          <div>
            <span className="small-check">
              <Check size={13} />
            </span>
            <small>Notas calculadas ≠ rankings comunitários</small>
          </div>
        </section>
      </div>
      {!!personal?.history.length && (
        <section>
          <SectionHeading
            title="Continue explorando"
            caption="Suas últimas consultas, com histórico habilitado."
          />
          <div className="pokemon-grid featured-grid">
            {[...new Set(personal.history.map((h) => h.formId))].slice(0, 6).map((id) => {
              const p = catalog.find((p) => p.id === id);
              return p ? <PokemonCard key={id} pokemon={p} /> : null;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
export function Catalog({ favorites = false }: { favorites?: boolean }) {
  const { catalog, game, personal } = useHub();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [secondary, setSecondary] = useState('');
  const [generation, setGeneration] = useState('');
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState('dex');
  const [evolution, setEvolution] = useState('');
  const [availability, setAvailability] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const list = useMemo(() => {
    let list = catalog.filter(
      (p) =>
        canUse(p, game) &&
        (!favorites || personal?.favorites.includes(p.id)) &&
        (!search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          String(p.speciesId) === search.replace('#', '')) &&
        (!type || p.types.includes(type)) &&
        (!secondary || p.types[1] === secondary) &&
        (!generation || p.generation === Number(generation)) &&
        (!kind || p.kind === kind) &&
        (!evolution ||
          (evolution === 'evolved' ? p.evolvesFromId !== null : p.evolvesFromId === null)) &&
        (!availability ||
          p.availability.some(
            (a) =>
              a.gameId === game &&
              (availability === 'base' ? a.content === 'base' : a.minStage !== null),
          )),
    );
    if (sort === 'name') list = list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'bst') list = list.sort((a, b) => bst(b.stats) - bst(a.stats));
    if (sort === 'attack') list = list.sort((a, b) => b.stats.attack - a.stats.attack);
    if (sort === 'speed') list = list.sort((a, b) => b.stats.speed - a.stats.speed);
    return list;
  }, [
    catalog,
    game,
    favorites,
    personal,
    search,
    type,
    secondary,
    generation,
    kind,
    sort,
    evolution,
    availability,
  ]);
  const maxPage = Math.max(1, Math.ceil(list.length / 36));
  const actualPage = Math.min(page, maxPage);
  const update = (fn: () => void) => {
    fn();
    setPage(1);
  };
  return (
    <div>
      <PageHeading
        eyebrow={favorites ? 'SUA COLEÇÃO' : 'ENCICLOPÉDIA ESTRATÉGICA'}
        title={
          favorites ? 'Seus favoritos, sempre por perto.' : 'Cada Pokémon. Novas possibilidades.'
        }
        text={
          favorites
            ? 'Uma seleção feita por você, salva na sua conta.'
            : `Explore espécies, atributos e formas disponíveis em ${GAMES[game].name}.`
        }
      />
      {favorites && !personal ? (
        <EmptyState
          title="Sua coleção começa com uma conta"
          text="Entre para salvar seus Pokémon favoritos e encontrá-los em qualquer sessão."
          action={
            <Button asChild>
              <Link href="/perfil">
                Entrar ou criar conta <ArrowRight size={16} />
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="catalog-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input
                value={search}
                placeholder="Busque por nome ou número..."
                aria-label="Pesquisar Pokémon"
                onChange={(e) => update(() => setSearch(e.target.value))}
              />
              {search && (
                <button aria-label="Limpar busca" onClick={() => setSearch('')}>
                  ×
                </button>
              )}
            </label>
            <select
              aria-label="Filtrar por tipo"
              value={type}
              onChange={(e) => update(() => setType(e.target.value))}
            >
              <option value="">Todos os tipos</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              aria-label="Ordenar Pokémon"
              value={sort}
              onChange={(e) => update(() => setSort(e.target.value))}
            >
              <option value="dex">Nº da Pokédex</option>
              <option value="name">Nome A–Z</option>
              <option value="bst">Maior BST</option>
              <option value="attack">Maior Attack</option>
              <option value="speed">Maior Speed</option>
            </select>
            <Button
              variant="secondary"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              <Filter size={15} /> Filtros <ChevronDown size={14} />
            </Button>
          </div>
          {expanded && (
            <div className="advanced-filters panel">
              <label>
                Geração
                <select
                  value={generation}
                  onChange={(e) => update(() => setGeneration(e.target.value))}
                >
                  <option value="">Todas</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <option key={n} value={n}>
                      Geração {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo secundário
                <select
                  value={secondary}
                  onChange={(e) => update(() => setSecondary(e.target.value))}
                >
                  <option value="">Qualquer</option>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Forma
                <select value={kind} onChange={(e) => update(() => setKind(e.target.value))}>
                  <option value="">Todas</option>
                  <option value="base">Original</option>
                  <option value="regional">Regional</option>
                  <option value="mega">Mega Evolução</option>
                  <option value="alternative">Alternativa</option>
                </select>
              </label>
              <label>
                Evolução
                <select
                  value={evolution}
                  onChange={(e) => update(() => setEvolution(e.target.value))}
                >
                  <option value="">Qualquer estágio</option>
                  <option value="base">Sem pré-evolução</option>
                  <option value="evolved">Possui pré-evolução</option>
                </select>
              </label>
              <label>
                Disponibilidade
                <select
                  value={availability}
                  onChange={(e) => update(() => setAvailability(e.target.value))}
                >
                  <option value="">Todo conteúdo</option>
                  <option value="base">Pokédex base</option>
                  <option value="known">Etapa verificada</option>
                </select>
              </label>
              <button
                className="text-link"
                onClick={() => {
                  setType('');
                  setSecondary('');
                  setGeneration('');
                  setKind('');
                  setEvolution('');
                  setAvailability('');
                  setSearch('');
                }}
              >
                Limpar filtros
              </button>
            </div>
          )}
          <div className="results-label">
            <span>
              <b>{list.length}</b> formas encontradas <span className="subtle-dot">·</span>{' '}
              {GAMES[game].short}
            </span>
            <span>
              Dados por versão <ShieldCheck size={13} />
            </span>
          </div>
          {list.length ? (
            <div className="pokemon-grid">
              {list.slice((actualPage - 1) * 36, actualPage * 36).map((p, i) => (
                <PokemonCard key={p.id} pokemon={p} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhum Pokémon por aqui"
              text="Experimente outro nome, jogo ou uma combinação diferente de filtros."
            />
          )}
          <div className="pagination">
            <Button
              variant="secondary"
              size="sm"
              disabled={actualPage <= 1}
              onClick={() => {
                setPage(actualPage - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <ChevronLeft size={16} /> Anterior
            </Button>
            <span>
              Página <b>{actualPage}</b> de {maxPage}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={actualPage >= maxPage}
              onClick={() => {
                setPage(actualPage + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Próxima <ChevronRight size={16} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
