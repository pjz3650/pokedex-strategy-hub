'use client';
import type { GameId, LegalMove, Member, Style } from '@/lib/contracts';
import {
  bst,
  canUse,
  defenseProfile,
  evaluateBuild,
  recommendBuild,
  recommendItem,
  role,
  TYPE_LABELS,
  TYPES,
} from '@/lib/engine';
import { GAMES } from '@/lib/games';
import type { PokemonDetail } from '@/lib/repository';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  Info,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { SectionHeading } from './dashboard-catalog';
import { EmptyState, PokemonImage, StatBars, StatsRadar, TypeBadge } from './pokemon-ui';
import { api, useHub, type SavedBuild } from './providers';
import { Button } from './ui/button';
export function useDetail(id: number | undefined, game: GameId) {
  const [detail, setDetail] = useState<PokemonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError('');
    setDetail(null);
    api<PokemonDetail>(`pokemon/${id}?game=${game}`)
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, game]);
  return { detail, loading, error };
}
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice">
      <Info size={17} />
      <div>{children}</div>
    </div>
  );
}
export function DetailPage({ id }: { id: number }) {
  const { catalog, game, setGame, personal, notify, draft, setDraft } = useHub();
  const params = useSearchParams();
  const { detail, loading, error } = useDetail(id, game);
  const [tab, setTab] = useState('overview');
  useEffect(() => {
    const chosen = params.get('game');
    if (chosen === 'sword' || chosen === 'arceus' || chosen === 'za')
      setGame(
        chosen,
      ); /* URL selection is applied when navigating to a Pokémon, not after game toolbar changes. */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (personal && detail)
      void api('history', 'POST', { formId: id, gameId: game }).catch(() => {});
  }, [id, game, detail, personal]);
  if (error)
    return (
      <EmptyState
        title="Não foi possível consultar este Pokémon"
        text={error}
        action={
          <Button asChild>
            <Link href="/pokedex">Voltar para a Pokédex</Link>
          </Button>
        }
      />
    );
  if (loading || !detail)
    return (
      <div className="detail-skeleton" role="status">
        <div />
        <p>Carregando dados específicos de {GAMES[game].short}...</p>
      </div>
    );
  const p = detail.pokemon;
  const profile = defenseProfile(p, game);
  const compatible = canUse(p, game);
  function add() {
    if (!compatible) {
      notify('Este Pokémon não está disponível no jogo selecionado.');
      return;
    }
    if (['mega', 'gigantamax', 'battle'].includes(p.kind)) {
      notify(
        'Adicione a forma permanente. A transformação ainda exige dados próprios de configuração.',
      );
      return;
    }
    if (draft.length >= 6) {
      notify('Sua equipe já tem seis integrantes.');
      return;
    }
    setDraft([...draft, { formId: id, moves: [] }]);
    notify(`${p.name} adicionado ao rascunho da equipe.`);
  }
  return (
    <div>
      <Link className="back-link" href="/pokedex">
        <ArrowLeft size={15} /> Voltar à Pokédex
      </Link>
      <div className="detail-header">
        <div
          className="detail-portrait"
          style={{ '--poke-color': `var(--${p.types[0]}, #aacd91)` } as React.CSSProperties}
        >
          <div className="portrait-ring" />
          <span className="portrait-number">{String(p.speciesId).padStart(3, '0')}</span>
          <PokemonImage key={p.id} pokemon={p} size={300} priority />
          {p.kind === 'mega' && <span className="outline-tag">TRANSFORMAÇÃO TEMPORÁRIA</span>}
        </div>
        <div className="detail-intro">
          <div className="eyebrow">
            POKÉDEX NACIONAL <span /> #{String(p.speciesId).padStart(4, '0')}
          </div>
          <h1>{p.name}</h1>
          <p>
            {detail.genus ?? 'Classificação não verificada'} <span>·</span> Geração {p.generation}
          </p>
          <div className="type-row">
            {p.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>
          <div className="detail-measurements">
            <div>
              <small>ALTURA</small>
              <b>
                {detail.height ?? '—'} <span>m</span>
              </b>
            </div>
            <div>
              <small>PESO</small>
              <b>
                {detail.weight ?? '—'} <span>kg</span>
              </b>
            </div>
            <div>
              <small>ATRIBUTOS BASE</small>
              <b>
                {bst(p.stats)} <span>BST</span>
              </b>
            </div>
            <div>
              <small>FUNÇÃO ESTIMADA</small>
              <b className="role-text">{role(p)}</b>
            </div>
          </div>
          <div className="detail-game-options">
            {Object.values(GAMES).map((g) => (
              <button
                disabled={!canUse(p, g.id)}
                title={
                  !canUse(p, g.id)
                    ? 'Disponibilidade desta forma não verificada neste jogo'
                    : g.name
                }
                className={game === g.id ? 'active' : ''}
                onClick={() => setGame(g.id)}
                key={g.id}
              >
                {canUse(p, g.id) && game === g.id && <Check size={13} />} {g.short}
              </button>
            ))}
          </div>
          <div className="button-row">
            <Button onClick={add} disabled={!compatible}>
              <Plus size={16} /> Adicionar à equipe
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/comparador?pokemon=${p.id}`}>
                <Layers3 size={16} /> Comparar
              </Link>
            </Button>
          </div>
        </div>
      </div>
      {!compatible ? (
        <Notice>
          Disponibilidade não verificada para esta forma em {GAMES[game].name}. Selecione um jogo
          compatível acima. Movimentos e builds deste jogo não estão disponíveis.
        </Notice>
      ) : (
        <>
          <div className="tabs" role="tablist" aria-label="Seções do Pokémon">
            {[
              ['overview', 'Visão geral'],
              ['moves', 'Movimentos'],
              ['builds', 'Builds estratégicas'],
              ['availability', 'Formas e obtenção'],
            ].map(([key, label]) => (
              <button
                role="tab"
                aria-selected={tab === key}
                aria-controls="pokemon-panel"
                key={key}
                onClick={() => setTab(key)}
              >
                {label}
                {key === 'moves' && <span>{detail.moves.length}</span>}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="pokemon-panel">
            {tab === 'overview' && (
              <>
                <div className="two-column detail-stats">
                  <section className="panel">
                    <SectionHeading
                      title="Atributos base"
                      caption="Valores da forma. Não representam atributos efetivos em batalha."
                    />
                    <StatBars stats={p.stats} />
                    <div className="bst-line">
                      <span>Base Stat Total</span>
                      <b>{bst(p.stats)}</b>
                    </div>
                  </section>
                  <section className="panel">
                    <SectionHeading
                      title="Perfil de atributos"
                      caption="A distribuição ajuda a entender o papel na equipe."
                    />
                    <StatsRadar stats={p.stats} />
                  </section>
                </div>
                <section className="panel defensive-panel">
                  <SectionHeading
                    title="Como esta tipagem recebe ataques"
                    caption="Efetividade defensiva · considera os dois tipos simultaneamente, sem habilidade selecionada."
                  />
                  {[
                    ['Fraquezas', profile.filter((t) => t.multiplier > 1)],
                    ['Resistências', profile.filter((t) => t.multiplier > 0 && t.multiplier < 1)],
                    ['Imunidades', profile.filter((t) => t.multiplier === 0)],
                  ].map(([label, entries]) => (
                    <div className="defense-group" key={label as string}>
                      <h3>{label as string}</h3>
                      <div className="type-row">
                        {(entries as typeof profile).length ? (
                          (entries as typeof profile).map((t) => (
                            <TypeBadge key={t.type} type={t.type} multiplier={t.multiplier} />
                          ))
                        ) : (
                          <span className="muted">Nenhuma pela tipagem.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </section>
                <div className="two-column">
                  <section className="panel">
                    <SectionHeading
                      title="Habilidades"
                      caption={
                        GAMES[game].abilities
                          ? 'Aplicáveis a este jogo. Efeitos modelados apenas quando selecionados.'
                          : 'Mecânica não aplicável a este jogo.'
                      }
                    />
                    {detail.abilities.length ? (
                      <div className="ability-list">
                        {detail.abilities.map((a) => (
                          <div key={a.id}>
                            <ShieldCheck size={17} />
                            <b>{a.name}</b>
                            {a.hidden && <span className="outline-tag">OCULTA</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">
                        {GAMES[game].abilities
                          ? 'Nenhuma habilidade verificada na base local.'
                          : 'Habilidades convencionais não são ativadas nesta análise.'}
                      </p>
                    )}
                  </section>
                  <section className="panel">
                    <SectionHeading title="Regras que mudam a estratégia" />
                    <h3 className="mechanic-title">
                      <Sparkles size={18} />
                      {GAMES[game].mechanic}
                    </h3>
                    <p className="body-copy">{GAMES[game].note}</p>
                    <Link className="text-link" href="/fontes">
                      Entenda os critérios <ArrowUpRight size={14} />
                    </Link>
                  </section>
                </div>
              </>
            )}
            {tab === 'moves' && <MovesTable moves={detail.moves} game={game} />}{' '}
            {tab === 'builds' && <BuildWorkbench detail={detail} />}{' '}
            {tab === 'availability' && (
              <>
                <section className="panel">
                  <SectionHeading
                    title="Formas da mesma espécie"
                    caption="Cada forma mantém seus próprios atributos e tipagem. Uma Mega Evolução não é uma espécie capturável."
                  />
                  <div className="form-grid">
                    {detail.forms.map((form) => (
                      <Link
                        key={form.id}
                        href={`/pokemon/${form.id}?game=${form.availability.some((a) => a.gameId === game) ? game : (form.availability[0]?.gameId ?? game)}`}
                        className={`form-card ${form.id === id ? 'active' : ''}`}
                      >
                        <PokemonImage key={form.id} pokemon={form} size={100} />
                        <h3>{form.name}</h3>
                        <p>
                          {form.kind === 'mega'
                            ? 'Transformação em batalha'
                            : form.kind === 'regional'
                              ? 'Forma regional'
                              : 'Forma permanente/alternativa'}
                        </p>
                        <div className="type-row">
                          {form.types.map((t) => (
                            <TypeBadge key={t} type={t} />
                          ))}
                        </div>
                        <small>
                          {form.availability.map((a) => GAMES[a.gameId].short).join(' · ') ||
                            'Disponibilidade não verificada'}
                        </small>
                      </Link>
                    ))}
                  </div>
                </section>
                <section className="panel">
                  <SectionHeading title="Disponibilidade e obtenção" />
                  {p.availability.map((a) => (
                    <div className="availability-row" key={a.gameId}>
                      <div>
                        <h3>{GAMES[a.gameId].name}</h3>
                        <p>{a.acquisition}</p>
                        <small>
                          Conteúdo: {a.content} · Etapa:{' '}
                          {a.minStage === null
                            ? 'Informação não verificada'
                            : GAMES[a.gameId].stages[a.minStage]}
                        </small>
                      </div>
                      <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="text-link">
                        Fonte <ArrowUpRight size={15} />
                      </a>
                    </div>
                  ))}
                  {detail.encounters.map((e) => (
                    <p key={e.name}>
                      {e.name} · {e.method}
                    </p>
                  ))}
                  <Notice>
                    Locais de captura e métodos de evolução específicos por jogo ainda não foram
                    importados integralmente. Não são inferidos de outros jogos.
                  </Notice>
                </section>
                <section className="panel">
                  <SectionHeading
                    title="Relações evolutivas da espécie"
                    caption="Relações gerais; método e condições por jogo precisam de verificação própria."
                  />
                  <div className="type-row">
                    {detail.evolutions.length ? (
                      detail.evolutions.map((e) => {
                        const form = catalog.find((p) => p.speciesId === e.id && canUse(p, game));
                        return form ? (
                          <Link
                            className="button button-secondary"
                            href={`/pokemon/${form.id}?game=${game}`}
                            key={e.id}
                          >
                            {e.name}
                            <ArrowRight size={14} />
                          </Link>
                        ) : (
                          <span className="outline-tag" key={e.id}>
                            {e.name} · disponibilidade não verificada
                          </span>
                        );
                      })
                    ) : (
                      <p className="muted">
                        Nenhuma relação de evolução na base para esta espécie.
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
export function MovesTable({ moves, game }: { moves: LegalMove[]; game: GameId }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [method, setMethod] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const list = useMemo(
    () =>
      moves
        .filter(
          (m) =>
            (!query || m.name.toLowerCase().includes(query.toLowerCase())) &&
            (!type || m.type === type) &&
            (!category || m.category === category) &&
            (!method || m.methods.some((x) => x.method === method)),
        )
        .sort((a, b) =>
          sort === 'power'
            ? (b.power ?? -1) - (a.power ?? -1)
            : sort === 'accuracy'
              ? (b.accuracy ?? -1) - (a.accuracy ?? -1)
              : a.name.localeCompare(b.name),
        ),
    [moves, query, type, category, method, sort],
  );
  const visible = list.slice(0, page * 30);
  return (
    <section className="panel">
      <SectionHeading
        title="Learnset específico do jogo"
        caption={`${moves.length} movimentos distintos registrados. Propriedades sem evidência permanecem desconhecidas.`}
      />
      <Notice>
        {game === 'za'
          ? 'Movimentos específicos de Z-A e Mega Dimension. Cooldown base em segundos é independente de PP. Variantes plus, alcance e área não são simulados.'
          : game === 'arceus'
            ? 'Movimentos, tipo, categoria, poder, precisão e PP próprios de Legends: Arceus. Parâmetros do estilo normal; estilos Ágil/Forte e ordem de ações não são simulados.'
            : 'Learnsets de Sword/Shield. Propriedades históricas disponíveis na fonte; obtenção por versão, TM/TR e transferência ainda não discriminadas integralmente.'}
      </Notice>
      <div className="catalog-toolbar compact-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Pesquisar movimentos"
            placeholder="Buscar movimento..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Tipo do movimento"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {TYPES.map((t) => (
            <option value={t} key={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          aria-label="Categoria do movimento"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          <option value="physical">Físico</option>
          <option value="special">Especial</option>
          <option value="status">Status</option>
        </select>
        <select
          aria-label="Método de aprendizado"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="">Todos os métodos</option>
          {[...new Set(moves.flatMap((m) => m.methods.map((x) => x.method)))].map((t) => (
            <option value={t} key={t}>
              {methodLabel(t)}
            </option>
          ))}
        </select>
        <select
          aria-label="Ordenar movimentos"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">Nome A–Z</option>
          <option value="power">Maior poder</option>
          <option value="accuracy">Maior precisão</option>
        </select>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tabela com rolagem horizontal"
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Movimento</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Poder</th>
              <th>{game === 'za' ? 'Cooldown' : 'PP'}</th>
              <th>Precisão</th>
              <th>Como aprender</th>
              <th>Fonte</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr key={m.id}>
                <td>
                  <b>{m.name}</b>
                  {!m.verified && <small>Propriedades não verificadas</small>}
                </td>
                <td>
                  <TypeBadge type={m.type} />
                </td>
                <td>
                  {m.category === 'physical'
                    ? 'Físico'
                    : m.category === 'special'
                      ? 'Especial'
                      : 'Status'}
                </td>
                <td>{m.power ?? (m.verified ? '—' : '?')}</td>
                <td>
                  {game === 'za' ? (m.cooldown === null ? '?' : `${m.cooldown} s`) : (m.pp ?? '?')}
                </td>
                <td>
                  {game === 'za'
                    ? 'Não aplicável'
                    : m.accuracy === null
                      ? m.verified
                        ? '—'
                        : '?'
                      : `${m.accuracy}%`}
                </td>
                <td>
                  {[
                    ...new Set(
                      m.methods.map(
                        (x) =>
                          `${methodLabel(x.method)}${x.method === 'level-up' ? ` · ${x.level === 0 ? 'Evolução' : `Nv. ${x.level}`}` : ''}`,
                      ),
                    ),
                  ].join(', ')}
                </td>
                <td>
                  <a
                    className="icon-button"
                    href={m.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Ver fonte de ${m.name}`}
                  >
                    <ArrowUpRight size={16} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <EmptyState
          title="Nenhum movimento verificado neste recorte"
          text="A base não completa lacunas usando learnsets de outro jogo."
        />
      )}
      {visible.length < list.length && (
        <Button className="load-more" variant="secondary" onClick={() => setPage(page + 1)}>
          Carregar mais movimentos <ChevronDown size={15} />
        </Button>
      )}
    </section>
  );
}
export function methodLabel(method: string) {
  return (
    (
      {
        'level-up': 'Por nível',
        machine: 'TM / TR',
        tutor: 'Tutor',
        egg: 'Egg Move',
        train: 'Treinamento',
        'form-change': 'Mudança de forma',
        alpha: 'Pokémon Alfa',
        special: 'Método especial',
      } as Record<string, string>
    )[method] ?? method
  );
}
export function MemberEditor({
  member,
  onChange,
  detail: providedDetail,
}: {
  member: Member;
  onChange: (member: Member) => void;
  detail?: PokemonDetail;
}) {
  const { game } = useHub();
  const remote = useDetail(providedDetail ? undefined : member.formId, game);
  const detail = providedDetail ?? remote.detail;
  const loading = !providedDetail && remote.loading;
  const error = !providedDetail && remote.error;
  if (loading) return <p className="muted">Consultando movimentos legais...</p>;
  if (error) return <Notice>{error}</Notice>;
  if (!detail) return null;
  const selected = member.moves;
  const itemSuggestion = recommendItem(detail.pokemon, detail.items, game);
  const chosenItem = detail.items.find((i) => i.id === member.itemId);
  return (
    <div className="member-editor">
      <div className="move-select-grid">
        {[0, 1, 2, 3].map((i) => (
          <label key={i}>
            MOVIMENTO {i + 1}
            <select
              aria-label={`Movimento ${i + 1}`}
              value={selected[i] ?? ''}
              onChange={(e) => {
                const moves = [...selected];
                if (e.target.value) moves[i] = Number(e.target.value);
                else moves.splice(i, 1);
                onChange({ ...member, moves: moves.filter(Boolean) });
              }}
            >
              <option value="">Selecionar movimento</option>
              {detail.moves.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  disabled={selected.includes(m.id) && selected[i] !== m.id}
                >
                  {m.name} · {TYPE_LABELS[m.type]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="editor-config">
        {GAMES[game].abilities && (
          <label>
            HABILIDADE
            <select
              value={member.abilityId ?? ''}
              onChange={(e) =>
                onChange({ ...member, abilityId: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">Sem efeito de habilidade</option>
              {detail.abilities.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                  {a.hidden ? ' (Hidden)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        {GAMES[game].heldItems && (
          <label>
            ITEM
            <select
              value={member.itemId ?? ''}
              onChange={(e) =>
                onChange({ ...member, itemId: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">Nenhum item verificado selecionado</option>
              {detail.items.map((i) => (
                <option value={i.id} key={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          NATURE
          <select
            value={member.nature ?? ''}
            onChange={(e) => onChange({ ...member, nature: e.target.value || null })}
          >
            <option value="">Sem configuração</option>
            {[
              'Adamant',
              'Modest',
              'Jolly',
              'Timid',
              'Bold',
              'Calm',
              'Impish',
              'Careful',
              'Hardy',
            ].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="button-row">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const build = recommendBuild(detail.pokemon, detail.moves, game);
            onChange({ ...member, moves: build.moves.map((m) => m.id) });
          }}
          disabled={!detail.moves.length}
        >
          <Sparkles size={14} /> Sugerir movimentos
        </Button>
        {itemSuggestion && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ ...member, itemId: itemSuggestion.item.id })}
          >
            Sugerir item
          </Button>
        )}
        <Link className="text-link" href={`/pokemon/${member.formId}?game=${game}`}>
          Analisar Pokémon <ArrowUpRight size={14} />
        </Link>
      </div>
      {chosenItem && (
        <Notice>
          <b>{chosenItem.name}</b>: {chosenItem.effect}
          <br />
          {chosenItem.location}
          <br />
          Etapa:{' '}
          {chosenItem.minStage === null
            ? 'Informação não verificada'
            : GAMES[game].stages[chosenItem.minStage]}
          .<br />
          <a className="text-link" href={chosenItem.source} target="_blank" rel="noreferrer">
            Consultar fonte <ArrowUpRight size={12} />
          </a>
        </Notice>
      )}
      {!detail.moves.length && (
        <Notice>
          O learnset deste Pokémon ainda não foi verificado para este jogo. Movimentos de outros
          jogos não podem ser selecionados.
        </Notice>
      )}
    </div>
  );
}
export function BuildWorkbench({ detail, saved }: { detail: PokemonDetail; saved?: SavedBuild }) {
  const { game, notify, personal, refresh } = useHub();
  const [style, setStyle] = useState<Style>((saved?.style as Style) ?? 'balanced');
  const [buildId, setBuildId] = useState<string | undefined>(saved?.id);
  const [buildName, setBuildName] = useState(saved?.name ?? detail.pokemon.name);
  const [manual, setManual] = useState<Member | null>(
    saved
      ? { ...saved.config, formId: saved.formId, moves: saved.moves.map((m) => m.moveId) }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const temporary = ['mega', 'gigantamax', 'battle'].includes(detail.pokemon.kind);
  const recommendation = useMemo(
    () => recommendBuild(detail.pokemon, detail.moves, game, style),
    [detail, game, style],
  );
  const member =
    manual?.formId === detail.pokemon.id
      ? manual
      : { formId: detail.pokemon.id, moves: recommendation.moves.map((m) => m.id) };
  const moves = detail.moves.filter((m) => member.moves.includes(m.id));
  const evaluation = evaluateBuild(detail.pokemon, moves, game, style);
  async function save() {
    if (!personal) {
      notify('Entre na sua conta para salvar builds.');
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ id: string }>(
        `builds${buildId ? `/${buildId}` : ''}`,
        buildId ? 'PATCH' : 'POST',
        {
          name: buildName,
          gameId: game,
          style,
          member,
        },
      );
      setBuildId(result.id);
      await refresh();
      notify('Build salva na sua coleção.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Notice>
        {detail.moves.length
          ? `${detail.moves.length} movimentos específicos de ${GAMES[game].short} cadastrados para ${detail.pokemon.name}.`
          : `Ainda não há movimentos cadastrados para esta forma em ${GAMES[game].short}.`}
        {temporary &&
          ' A análise usa os atributos desta transformação. Para montar e salvar a equipe, selecione a forma permanente; a ativação da transformação ainda não é configurável.'}
      </Notice>
      <div className="build-toolbar">
        <div>
          <h2>Um conjunto com propósito.</h2>
          <p>Edite os movimentos e acompanhe o recálculo da avaliação.</p>
        </div>
        <select
          aria-label="Estilo da build"
          value={style}
          onChange={(e) => {
            setStyle(e.target.value as Style);
            setManual(null);
          }}
        >
          {(['balanced', 'offensive', 'defensive', 'support'] as Style[]).map((s) => (
            <option value={s} key={s}>
              {styleLabel(s)}
            </option>
          ))}
        </select>
        <Button onClick={save} disabled={busy || !moves.length || temporary}>
          <Bookmark size={15} />
          {busy ? 'Salvando...' : buildId ? 'Atualizar build' : 'Salvar build'}
        </Button>
      </div>
      <div className="two-column build-columns">
        <section className="panel">
          <SectionHeading
            title={styleLabel(style)}
            caption={`${recommendation.role} · ${GAMES[game].short}`}
          />
          <label className="build-name-field">
            NOME DA BUILD
            <input
              value={buildName}
              onChange={(e) => setBuildName(e.target.value)}
              maxLength={80}
            />
          </label>
          <MemberEditor member={member} onChange={setManual} detail={detail} />
          <div className="build-explanations">
            {moves.map((m) => (
              <div key={m.id}>
                <TypeBadge type={m.type} />
                <h3>{m.name}</h3>
                <p>
                  {recommendation.explanations.find((e) => e.startsWith(`${m.name}:`)) ??
                    `Movimento legal selecionado manualmente. ${m.category === 'status' ? 'Utilidade situacional.' : `Usa ${m.category === 'physical' ? 'Attack' : 'Special Attack'}.`}`}
                </p>
                <small>
                  {m.methods
                    .map((x) => `${methodLabel(x.method)}${x.level ? ` · Nv. ${x.level}` : ''}`)
                    .join(' / ')}
                </small>
              </div>
            ))}
          </div>
        </section>
        <div>
          <section className="panel build-score-panel">
            <span className="eyebrow">AVALIAÇÃO HEURÍSTICA</span>
            <div className="big-score">
              {evaluation.score}
              <span>/ 100</span>
            </div>
            <p>Índice de escolha de movimentos. Não é uma previsão de vitória.</p>
            <div className="component-scores">
              {Object.entries(evaluation.components).map(([key, value]) => (
                <div key={key}>
                  <span>
                    {
                      (
                        {
                          damage: 'Pressão de ataque',
                          coverage: 'Cobertura ofensiva',
                          utility: 'Utilidade',
                          reliability: 'Confiabilidade dos dados',
                          redundancy: 'Penalidade por redundância',
                        } as Record<string, string>
                      )[key]
                    }
                  </span>
                  <b>
                    {value}
                    {key === 'redundancy' ? ' pts' : ''}
                  </b>
                </div>
              ))}
            </div>
            <h3>Cobertura ofensiva</h3>
            <div className="type-row">
              {evaluation.coverage.length ? (
                evaluation.coverage.map((t) => <TypeBadge type={t} key={t} />)
              ) : (
                <p className="muted">Selecione movimentos ofensivos.</p>
              )}
            </div>
          </section>
          {recommendation.warnings.map((w) => (
            <Notice key={w}>{w}</Notice>
          ))}
          <section className="panel">
            <SectionHeading title="Alternativas legais" />
            {recommendation.alternatives.map((m) => (
              <div className="alternative-move" key={m.id}>
                <TypeBadge type={m.type} />
                <span>{m.name}</span>
                <small>{m.category === 'status' ? 'Status' : (m.power ?? 'Poder ?')}</small>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
export function styleLabel(style: Style) {
  return {
    balanced: 'Equilibrada',
    offensive: 'Ofensiva',
    defensive: 'Defensiva',
    support: 'Suporte',
  }[style];
}
export function PokemonPicker({
  value,
  onChange,
  label = 'Pokémon',
  exclude = [],
}: {
  value: number | undefined;
  onChange: (id: number) => void;
  label?: string;
  exclude?: number[];
}) {
  const { catalog, game } = useHub();
  const [q, setQ] = useState('');
  const available = catalog.filter(
    (p) =>
      canUse(p, game) &&
      !exclude.includes(p.id) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="pokemon-picker">
      <label className="search-field">
        <Search size={15} />
        <input
          value={q}
          aria-label={`Filtrar ${label}`}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por nome..."
        />
      </label>
      <label className="picker-label">
        {label}
        <select
          aria-label={label}
          value={value ?? ''}
          onChange={(e) => e.target.value && onChange(Number(e.target.value))}
        >
          <option value="">Selecionar Pokémon</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · #{p.speciesId}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
