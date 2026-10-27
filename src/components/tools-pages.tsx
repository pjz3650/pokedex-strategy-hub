'use client';
import type { Pokemon } from '@/lib/contracts';
import { bst, canUse, defenseProfile, role, TYPE_LABELS, TYPES } from '@/lib/engine';
import { GAMES } from '@/lib/games';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  GitCompareArrows,
  LoaderCircle,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PageHeading, SectionHeading } from './dashboard-catalog';
import { BuildWorkbench, Notice, PokemonPicker, useDetail } from './pokemon-detail';
import { EmptyState, PokemonImage, StatBars, StatsRadar, TypeBadge } from './pokemon-ui';
import { api, useHub, type SavedBuild } from './providers';
import { Button } from './ui/button';
export function Analyzer({ builds = false }: { builds?: boolean }) {
  const { catalog, game, setGame, personal, notify, refresh } = useHub();
  const [editing, setEditing] = useState<SavedBuild | undefined>();
  const [selected, setSelected] = useState<number>(448);
  const eligible = catalog.filter((p) => canUse(p, game));
  const id = eligible.some((p) => p.id === selected) ? selected : eligible[0]?.id;
  const { detail, loading, error } = useDetail(id, game);
  return (
    <div>
      <PageHeading
        eyebrow={builds ? 'MOVIMENTOS COM PROPÓSITO' : 'LEIA ALÉM DOS ATRIBUTOS'}
        title={builds ? 'A build certa tem um porquê.' : 'Conheça o potencial de cada escolha.'}
        text="Recomendações explicáveis com learnsets do jogo selecionado."
      />
      <div className="analyzer-picker panel">
        <PokemonPicker
          value={id}
          onChange={(id) => {
            setSelected(id);
            setEditing(undefined);
          }}
          label="Pokémon para analisar"
        />
        {detail && (
          <div className="selected-pokemon-mini">
            <PokemonImage pokemon={detail.pokemon} size={85} />
            <div>
              <h3>{detail.pokemon.name}</h3>
              <p>
                {role(detail.pokemon)} · BST {bst(detail.pokemon.stats)}
              </p>
            </div>
            <Link className="text-link" href={`/pokemon/${id}?game=${game}`}>
              Ficha completa <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
      </div>
      {error && <Notice>{error}</Notice>}
      {loading && (
        <p className="loading-line">
          <LoaderCircle size={17} className="spin" /> Consultando learnset...
        </p>
      )}
      {detail && (
        <BuildWorkbench
          key={`${detail.pokemon.id}-${game}-${editing?.id ?? 'new'}`}
          detail={detail}
          saved={
            editing?.formId === detail.pokemon.id && editing.gameId === game ? editing : undefined
          }
        />
      )}{' '}
      {builds && personal && (
        <section className="panel saved-builds">
          <SectionHeading title="Suas builds salvas" caption="Registros vinculados à sua conta." />
          {personal.builds.length ? (
            personal.builds.map((b) => (
              <div className="saved-build-row" key={b.id}>
                <div>
                  <h3>{b.name}</h3>
                  <p>
                    {GAMES[b.gameId].short} · {b.moves.length} movimentos
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setGame(b.gameId);
                    setSelected(b.formId);
                    setEditing(b);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Editar build
                </Button>
                <Link href={`/pokemon/${b.formId}?game=${b.gameId}`} className="text-link">
                  Ver Pokémon <ArrowUpRight size={14} />
                </Link>
                <button
                  className="icon-button danger"
                  aria-label={`Excluir build ${b.name}`}
                  onClick={async () => {
                    try {
                      await api(`builds/${b.id}`, 'DELETE');
                      await refresh();
                      notify('Build excluída.');
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <p className="muted">Você ainda não salvou builds.</p>
          )}
        </section>
      )}
    </div>
  );
}
export function Comparator() {
  const { catalog, game } = useHub();
  const params = useSearchParams();
  const [left, setLeft] = useState(Number(params.get('pokemon')) || 448);
  const [right, setRight] = useState(282);
  const pool = catalog.filter((p) => canUse(p, game));
  const a = pool.find((p) => p.id === left) ?? pool[0];
  const b = pool.find((p) => p.id === right) ?? pool[1];
  if (!a || !b)
    return (
      <EmptyState
        title="Dados insuficientes para comparar"
        text="Importe os dados e selecione um jogo com pelo menos dois Pokémon disponíveis."
      />
    );
  const defs = [a, b].map((p) => defenseProfile(p, game));
  return (
    <div>
      <PageHeading
        eyebrow="LADO A LADO"
        title="Duas escolhas. Contextos diferentes."
        text="Compare atributos e respostas defensivas, sem um vencedor universal."
      />
      <div className="comparator-controls">
        <PokemonPicker value={a.id} onChange={setLeft} label="Primeiro Pokémon" />
        <span className="compare-symbol">
          <GitCompareArrows size={23} />
        </span>
        <PokemonPicker value={b.id} onChange={setRight} label="Segundo Pokémon" />
      </div>
      <div className="compare-cards">
        {[a, b].map((p, i) => (
          <section className="panel compare-card" key={i}>
            <span className="dex-number">#{String(p.speciesId).padStart(4, '0')}</span>
            <PokemonImage key={p.id} pokemon={p} size={210} />
            <h2>{p.name}</h2>
            <div className="type-row">
              {p.types.map((t) => (
                <TypeBadge type={t} key={t} />
              ))}
            </div>
            <p>
              {role(p)} · BST {bst(p.stats)}
            </p>
            <StatBars stats={p.stats} compare={i === 0 ? b.stats : a.stats} />
            <Link className="text-link" href={`/pokemon/${p.id}?game=${game}`}>
              Consultar movimentos e builds <ArrowUpRight size={14} />
            </Link>
          </section>
        ))}
      </div>
      <div className="two-column">
        <section className="panel">
          <SectionHeading title="Atributos sobrepostos" />
          <StatsRadar stats={a.stats} other={b.stats} />
        </section>
        <section className="panel">
          <SectionHeading title="O que muda para sua equipe" />
          <p className="body-copy">
            <b>{a.name}</b> apresenta {role(a).toLowerCase()}, com {a.stats.speed} de Speed base e{' '}
            {Math.max(a.stats.attack, a.stats.specialAttack)} na maior estatística ofensiva.
          </p>
          <p className="body-copy">
            <b>{b.name}</b> apresenta {role(b).toLowerCase()}, com {b.stats.speed} de Speed base e{' '}
            {Math.max(b.stats.attack, b.stats.specialAttack)} na maior estatística ofensiva.
          </p>
          <Notice>
            A escolha depende das fraquezas e funções que sua equipe precisa cobrir. Atributos base
            não substituem a avaliação dos movimentos, da obtenção e das regras do jogo.
          </Notice>
        </section>
      </div>
      <section className="panel">
        <SectionHeading
          title="Efetividade defensiva comparada"
          caption="Multiplicadores por tipagem; sem efeitos de habilidades."
        />
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela com rolagem horizontal"
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo do ataque</th>
                <th>{a.name}</th>
                <th>{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {TYPES.map((t, i) => (
                <tr key={t}>
                  <td>
                    <TypeBadge type={t} />
                  </td>
                  <td>{defs[0][i].multiplier}×</td>
                  <td>{defs[1][i].multiplier}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
export function attributeEstimate(p: Pokemon) {
  const offense = Math.min(100, (Math.max(p.stats.attack, p.stats.specialAttack) / 180) * 100);
  const bulk = Math.min(
    100,
    (Math.sqrt((p.stats.hp * (p.stats.defense + p.stats.specialDefense)) / 2) / 180) * 100,
  );
  const speed = Math.min(100, (p.stats.speed / 180) * 100);
  return Math.round(offense * 0.45 + bulk * 0.35 + speed * 0.2);
}
export function tierOf(score: number) {
  return score >= 80
    ? 'S'
    : score >= 65
      ? 'A'
      : score >= 50
        ? 'B'
        : score >= 40
          ? 'C'
          : score >= 30
            ? 'D'
            : 'F';
}
export function Tiers() {
  const { catalog, game } = useHub();
  const [tab, setTab] = useState('engine');
  const [type, setType] = useState('');
  const [stage, setStage] = useState('all');
  const [showTransform, setShowTransform] = useState(false);
  const list = catalog
    .filter(
      (p) =>
        canUse(p, game) &&
        (!type || p.types.includes(type)) &&
        (showTransform || !['mega', 'battle', 'gigantamax'].includes(p.kind)) &&
        (stage === 'all' ||
          p.availability.some(
            (a) => a.gameId === game && a.minStage !== null && a.minStage <= Number(stage),
          )),
    )
    .map((p) => ({ pokemon: p, score: attributeEstimate(p) }))
    .sort((a, b) => b.score - a.score || a.pokemon.id - b.pokemon.id);
  return (
    <div>
      <PageHeading
        eyebrow="CONTEXTO ANTES DO RANKING"
        title="Uma classificação. Critérios à vista."
        text="Estimativas calculadas e referências comunitárias têm origens diferentes."
      />
      <div className="tabs">
        <button className={tab === 'engine' ? 'active' : ''} onClick={() => setTab('engine')}>
          Estimativa de atributos
        </button>
        <button className={tab === 'community' ? 'active' : ''} onClick={() => setTab('community')}>
          Referências comunitárias
        </button>
      </div>
      {tab === 'community' ? (
        <section className="panel">
          <EmptyState
            title="Evidências insuficientes para agregar"
            text="Ainda não há duas fontes independentes, com formato e recorte compatíveis, importadas e autorizadas. Nenhuma classificação comunitária é inventada."
          />
          <div className="reference-links">
            <a
              href="https://www.dexerto.com/wikis/pokemon-legends-z-a/all-grass-type-pokemon-tier-list/"
              target="_blank"
              rel="noreferrer"
            >
              Dexerto · referência editorial de Grass em Z-A <ArrowUpRight size={15} />
            </a>
            <a href="https://www.smogon.com/dex/ss/" target="_blank" rel="noreferrer">
              Smogon · formatos comunitários Sword/Shield <ArrowUpRight size={15} />
            </a>
          </div>
          <Notice>
            Uma tier de Smogon não é um regulamento competitivo oficial. As referências ainda não
            foram agregadas nem convertidas em pontuações do motor.
          </Notice>
        </section>
      ) : (
        <>
          <Notice>
            Estimativa própria de atributos, sem dados de uso ou resultados de torneios. Fórmula:
            45% maior ataque normalizado + 35% média geométrica de HP e defesas + 20% Speed
            normalizado. Não incorpora learnsets, ameaças de campanha ou eficiência em tempo real.
            Não é uma tier list estratégica completa.
          </Notice>
          <div className="catalog-toolbar">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Filtrar ranking por tipo"
            >
              <option value="">Todos os tipos</option>
              {TYPES.map((t) => (
                <option value={t} key={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              aria-label="Disponibilidade na campanha"
            >
              <option value="all">Qualquer etapa</option>
              {GAMES[game].stages.map((s, i) => (
                <option key={s} value={i}>
                  {s} · dados verificados
                </option>
              ))}
            </select>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showTransform}
                onChange={(e) => setShowTransform(e.target.checked)}
              />{' '}
              Incluir transformações
            </label>
            <span className="outline-tag">CAMPANHA · ESTIMATIVA</span>
          </div>
          <div className="tier-board">
            {['S', 'A', 'B', 'C', 'D', 'F'].map((tier) => (
              <div className={`tier-row tier-${tier}`} key={tier}>
                <div className="tier-letter">{tier}</div>
                <div className="tier-pokemon">
                  {list
                    .filter((p) => tierOf(p.score) === tier)
                    .slice(0, 36)
                    .map(({ pokemon: p, score }) => (
                      <Link
                        href={`/pokemon/${p.id}?game=${game}`}
                        key={p.id}
                        title={`${p.name} · ${score}/100`}
                      >
                        <PokemonImage pokemon={p} size={64} />
                        <small>{p.name}</small>
                        <b>{score}</b>
                      </Link>
                    ))}
                  {!list.some((p) => tierOf(p.score) === tier) && (
                    <span className="muted">Nenhuma forma neste intervalo.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="fine-print">
            Intervalos do índice: S ≥80; A ≥65; B ≥50; C ≥40; D ≥30; F &lt;30. Mostra até 36 formas
            por classe. Limiares editoriais, sem validação empírica.
          </p>
        </>
      )}
    </div>
  );
}
export function Assistant() {
  const { catalog, game, personal } = useHub();
  const [selected, setSelected] = useState(448);
  const pool = catalog.filter((p) => canUse(p, game));
  const id = pool.some((p) => p.id === selected) ? selected : pool[0]?.id;
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const analysisRequest = useRef(0);
  useEffect(() => {
    analysisRequest.current++;
    setBusy(false);
    setMessages([]);
    setError('');
  }, [game]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, busy]);
  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!id || busy) return;
    const requestId = ++analysisRequest.current;
    setBusy(true);
    setError('');
    const prompt = question || 'Gerar análise determinística do Pokémon selecionado.';
    setMessages((m) => [...m, { role: 'user', content: prompt }]);
    setQuestion('');
    try {
      const r = await api<{ answer: string }>('assistant', 'POST', {
        gameId: game,
        formId: id,
        question: prompt,
      });
      if (requestId === analysisRequest.current)
        setMessages((m) => [...m, { role: 'assistant', content: r.answer }]);
    } catch (e) {
      if (requestId === analysisRequest.current) setError((e as Error).message);
    } finally {
      if (requestId === analysisRequest.current) setBusy(false);
    }
  }
  return (
    <div>
      <PageHeading
        eyebrow="ENTENDA SUAS ESCOLHAS"
        title="Estratégia que dá para explicar."
        text="Análises por regras disponíveis. Conversa generativa desabilitada nesta instalação."
      />
      <div className="assistant-layout">
        <aside className="panel assistant-context">
          <span className="promo-icon">
            <MessageSquare size={22} />
          </span>
          <h2>O contexto vem primeiro.</h2>
          <p>Selecione um Pokémon para receber uma análise baseada em dados do jogo.</p>
          <PokemonPicker value={id} onChange={setSelected} label="Pokémon em contexto" />
          <span className="outline-tag">{GAMES[game].short}</span>
          <Notice>
            O modo disponível gera um relatório por template. Ele não interpreta livremente a
            pergunta nem inventa respostas. O chat com modelo de linguagem ainda não foi integrado.
          </Notice>
          {!!personal?.conversations.length && (
            <div className="chat-history">
              <h3>Histórico salvo</h3>
              {personal.conversations.map((c) => (
                <button key={c.id} onClick={() => setMessages(c.messages)}>
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </aside>
        <section className="panel chat-panel">
          <div className="chat-heading">
            <div>
              <span className="status-dot" /> Análise por regras
            </div>
            <span>Sem consumo de tokens</span>
          </div>
          <div className="chat-messages" aria-live="polite">
            {!messages.length && (
              <div className="chat-welcome">
                <span className="empty-orbit">
                  <Sparkles size={28} />
                </span>
                <h2>O porquê de cada movimento.</h2>
                <p>
                  Consulte uma análise explicável com apenas os dados disponíveis na base local.
                </p>
                <button onClick={() => send()}>
                  Analisar o Pokémon selecionado <ArrowRight size={16} />
                </button>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                <span>{m.role === 'user' ? 'Você' : 'Motor estratégico'}</span>
                <p>{m.content}</p>
              </div>
            ))}
            {busy && (
              <div className="loading-line">
                <LoaderCircle className="spin" size={16} /> Calculando análise...
              </div>
            )}
            {error && (
              <div className="error-notice" role="alert">
                {error}
              </div>
            )}
            <div ref={end} />
          </div>
          <form className="chat-form" onSubmit={send}>
            <input
              aria-label="Contexto da análise"
              placeholder="Anotação opcional para o seu histórico..."
              value={question}
              maxLength={1000}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button disabled={busy || !id} aria-label="Gerar análise">
              <Send size={17} />
            </Button>
          </form>
          <p className="chat-disclaimer">
            Relatório de campanha por template. Dados desconhecidos permanecem desconhecidos.
          </p>
        </section>
      </div>
    </div>
  );
}
type Source = {
  id: string;
  name: string;
  url: string;
  license: string | null;
  collectedAt: string;
  confidence: string;
};
export function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [health, setHealth] = useState<{
    database: string;
    engine: string;
    coverage: {
      gameId: string;
      species: number;
      forms: number;
      formsWithMoves: number;
      learnsetRecords: number;
      verifiedMoveProperties: number;
    }[];
    lastImport: { commit: string; finishedAt: string; counts: Record<string, number> } | null;
  } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api<Source[]>('sources'), api<NonNullable<typeof health>>('health')])
      .then(([s, h]) => {
        setSources(s);
        setHealth(h);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="sources-page">
      <PageHeading
        eyebrow="TRANSPARÊNCIA POR PADRÃO"
        title="Saiba de onde vem cada escolha."
        text="Procedência, cobertura e limites da base de dados e do motor."
      />
      {error && <Notice>{error}</Notice>}
      <div className="metrics-strip">
        <div>
          <ShieldCheck size={20} />
          <span>
            <b>{health?.database === 'ok' ? 'Conectado' : 'Consultando...'}</b>
            <small>PostgreSQL local</small>
          </span>
        </div>
        <div>
          <BookOpen size={20} />
          <span>
            <b>{sources.length}</b>
            <small>Fontes registradas</small>
          </span>
        </div>
        <div>
          <Sparkles size={20} />
          <span>
            <b>{health?.engine ?? '—'}</b>
            <small>Versão do motor</small>
          </span>
        </div>
      </div>
      <section className="panel">
        <SectionHeading title="O que está verificado e o que falta" />
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela com rolagem horizontal"
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Domínio</th>
                <th>Sword</th>
                <th>Legends: Arceus</th>
                <th>Legends: Z-A</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Espécies e atributos base</td>
                <td>Importados</td>
                <td>Importados</td>
                <td>Importados · incluindo formas compatíveis de Mega Dimension</td>
              </tr>
              <tr>
                <td>Learnsets</td>
                {(['sword', 'arceus', 'za'] as const).map((gameId) => {
                  const coverage = health?.coverage?.find((c) => c.gameId === gameId);
                  return (
                    <td key={gameId}>
                      {coverage
                        ? `${coverage.species} espécies · ${coverage.formsWithMoves}/${coverage.forms} formas com movimentos · ${coverage.learnsetRecords.toLocaleString('pt-BR')} registros`
                        : 'Consultando cobertura...'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td>Propriedades dos movimentos</td>
                <td>Histórico tradicional</td>
                <td>Parâmetros específicos de Arceus · estilos não simulados</td>
                <td>Poder e cooldown base · plus/alcance não simulados</td>
              </tr>
              <tr>
                <td>Progresso e obtenção</td>
                <td>Parcial · iniciais e Route 1</td>
                <td>Parcial · iniciais</td>
                <td>Parcial · iniciais</td>
              </tr>
              <tr>
                <td>Itens e transformações</td>
                <td>Leftovers e Life Orb · transformações pendentes</td>
                <td>Sem held items convencionais</td>
                <td>Leftovers e Life Orb · Mega Stones pendentes</td>
              </tr>
              <tr>
                <td>Competitivo</td>
                <td>Regulamentos históricos pendentes</td>
                <td>Não existe equivalente oficial</td>
                <td>Temporadas verificadas pendentes</td>
              </tr>
              <tr>
                <td>Rankings comunitários</td>
                <td>Sem evidências suficientes</td>
                <td>Sem evidências suficientes</td>
                <td>Sem evidências suficientes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <SectionHeading
          title="Fontes da base local"
          caption="Referências factuais não concedem direitos sobre marcas, artes ou textos editoriais."
        />
        {sources.map((s) => (
          <div className="source-row" key={s.id}>
            <span className="source-icon">
              <BookOpen size={19} />
            </span>
            <div>
              <h3>{s.name}</h3>
              <p>{s.license}</p>
              <small>
                Coleta:{' '}
                {new Date(s.collectedAt).toLocaleDateString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                })}{' '}
                · Confiança registrada: {s.confidence}
              </small>
            </div>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="icon-button"
              aria-label={`Abrir ${s.name}`}
            >
              <ArrowUpRight size={18} />
            </a>
          </div>
        ))}
      </section>
      <section className="panel">
        <SectionHeading title="Como o motor escolhe" />
        <p className="body-copy">
          As builds avaliam pressão ofensiva, afinidade com Attack ou Special Attack, STAB,
          cobertura marginal, utilidade de movimentos de status, confiabilidade e redundância. Os
          pesos variam por estilo. O gerador usa beam search com até 100 candidatos e largura 12.
        </p>
        <p className="body-copy">
          A cobertura ofensiva mede os tipos que os movimentos atingem de forma super efetiva.
          Resistências e imunidades são calculadas separadamente pela tipagem defensiva. O índice de
          composição inclui diversidade de funções, distribuição física/especial e fraquezas
          compartilhadas sem resposta.
        </p>
        <Notice>
          As fórmulas são heurísticas documentadas em docs/MOTOR.md. Não são modelos calibrados por
          resultados de batalhas. O aplicativo não promete cobertura completa, temporadas
          atualizadas, simulação de combate ou conversa generativa.
        </Notice>
        {health?.lastImport && (
          <p className="fine-print">
            Última importação concluída:{' '}
            {new Date(health.lastImport.finishedAt).toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
            })}{' '}
            · Commit {health.lastImport.commit}
          </p>
        )}
      </section>
    </div>
  );
}
