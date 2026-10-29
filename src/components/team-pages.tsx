'use client';
import type { Member, Style } from '@/lib/contracts';
import { analyzeTeam, role } from '@/lib/engine';
import { GAMES } from '@/lib/games';
import { getPokemonVisual } from '@/lib/pokemon-visual';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Info,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RotateCw,
  Save,
  Shuffle,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PageHeading, SectionHeading } from './dashboard-catalog';
import { MemberEditor, Notice, PokemonPicker, styleLabel } from './pokemon-detail';
import { EmptyState, PokemonImage, TypeBadge } from './pokemon-ui';
import { api, useHub } from './providers';
import { Button } from './ui/button';
type Analysis = ReturnType<typeof analyzeTeam>;
export function AnalysisPanel({ analysis }: { analysis: Analysis | null }) {
  return (
    <section className="panel team-analysis">
      <SectionHeading
        title="O todo é maior que as partes."
        caption="Cobertura por movimentos e defesa por tipagem, calculadas separadamente."
      />
      {analysis ? (
        <>
          <div className="analysis-metrics">
            <div>
              <b>
                {analysis.score}
                <small>/100</small>
              </b>
              <span>Índice de composição</span>
            </div>
            <div>
              <b>
                {analysis.coverage}
                <small>/18</small>
              </b>
              <span>Tipos com cobertura</span>
            </div>
            <div>
              <b>{analysis.averageSpeed}</b>
              <span>Speed base médio</span>
            </div>
            <div>
              <b>
                {analysis.physical}
                <small>
                  {' '}
                  / {analysis.special} / {analysis.mixed}
                </small>
              </b>
              <span>Físico / especial / misto</span>
            </div>
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Tabela com rolagem horizontal"
          >
            <table className="data-table coverage-table">
              <thead>
                <tr>
                  <th>Tipo adversário</th>
                  <th>Fraquezas</th>
                  <th>Resistências</th>
                  <th>Imunidades</th>
                  <th>Cobertura ofensiva</th>
                </tr>
              </thead>
              <tbody>
                {analysis.matrix.map((t) => (
                  <tr key={t.type}>
                    <td>
                      <TypeBadge type={t.type} />
                    </td>
                    <td>
                      <span
                        className={
                          t.weak >= 2
                            ? 'matrix-cell weak'
                            : t.weak
                              ? 'matrix-cell mild'
                              : 'matrix-cell'
                        }
                      >
                        {t.weak || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={t.resist ? 'matrix-cell resist' : 'matrix-cell'}>
                        {t.resist || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={t.immune ? 'matrix-cell immune' : 'matrix-cell'}>
                        {t.immune || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={t.covered ? 'coverage-yes' : 'muted'}>
                        {t.covered
                          ? `${t.covered} ${t.covered === 1 ? 'integrante' : 'integrantes'}`
                          : 'Sem cobertura'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="analysis-recommendations">
            <h3>Ajustes que merecem atenção</h3>
            {analysis.recommendations.length ? (
              analysis.recommendations.map((r) => (
                <p key={r}>
                  <Info size={15} />
                  {r}
                </p>
              ))
            ) : (
              <p>
                <Check size={15} /> Nenhuma fraqueza compartilhada sem resposta encontrada pela
                análise de tipagem.
              </p>
            )}
          </div>
          <p className="fine-print">
            Índice heurístico de composição. Não simula dano, condições de campo ou probabilidade de
            vitória. Speed base não é uma medida de mobilidade em Z-A.
          </p>
        </>
      ) : (
        <EmptyState
          title="Vamos encontrar as conexões"
          text="Adicione Pokémon e escolha movimentos para calcular a cobertura e as fraquezas da equipe."
        />
      )}
    </section>
  );
}
export function TeamBuilder() {
  const { catalog, game, personal, notify, draft, setDraft, refresh, editTeamId, setEditTeamId } =
    useHub();
  const [name, setName] = useState('Minha nova equipe');
  const [selected, setSelected] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const modal = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editTeamId) {
      const saved = personal?.teams.find((t) => t.id === editTeamId);
      if (saved) setName(saved.name);
    } else setName('Minha nova equipe');
  }, [editTeamId, personal]);
  useEffect(() => {
    if (!draft.length) {
      setAnalysis(null);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      setAnalyzing(true);
      api<Analysis>('analyze', 'POST', { gameId: game, members: draft })
        .then((data) => {
          if (active) setAnalysis(data);
        })
        .catch((e) => {
          if (active) {
            setAnalysis(null);
            notify(e.message);
          }
        })
        .finally(() => {
          if (active) setAnalyzing(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [draft, game, notify]);
  const selectedIndex = Math.min(selected, Math.max(0, draft.length - 1));
  function add(id: number) {
    const pokemon = catalog.find((p) => p.id === id);
    if (!pokemon) return;
    if (['mega', 'battle', 'gigantamax'].includes(pokemon.kind)) {
      notify('Escolha uma forma permanente. Transformações ainda exigem configuração verificada.');
      return;
    }
    if (draft.length >= 6) {
      notify('Limite de seis integrantes atingido.');
      return;
    }
    setDraft([...draft, { formId: id, moves: [] }]);
    setSelected(draft.length);
  }
  async function save() {
    if (!personal) {
      notify('Entre na sua conta para salvar equipes.');
      return;
    }
    setBusy(true);
    try {
      const saved = await api<{ id: string }>(
        `teams${editTeamId ? `/${editTeamId}` : ''}`,
        editTeamId ? 'PATCH' : 'POST',
        { name, gameId: game, mode: 'story', members: draft },
      );
      setEditTeamId(saved.id);
      await refresh();
      notify('Equipe salva na sua conta.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportTeam() {
    const data = JSON.stringify({ version: 1, name, gameId: game, members: draft }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'poketactics-equipe.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function importTeam() {
    setImporting(true);
    try {
      const data = JSON.parse(importText);
      if (data.gameId !== game)
        throw new Error('Selecione primeiro o mesmo jogo do arquivo importado.');
      await api('analyze', 'POST', { gameId: game, members: data.members });
      setDraft(data.members);
      setName(typeof data.name === 'string' ? data.name.slice(0, 80) : 'Equipe importada');
      setEditTeamId(null);
      modal.current?.close();
      notify('Equipe importada e validada. Salve para persistir na conta.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setImporting(false);
    }
  }
  function focusAddPokemon() {
    const controls = document.getElementById('team-controls');
    controls?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
    controls?.querySelector<HTMLSelectElement>('select')?.focus({ preventScroll: true });
  }
  return (
    <div>
      <PageHeading
        eyebrow="SEU LABORATÓRIO"
        title="Encontre o equilíbrio do seu time."
        text="Escolha até seis Pokémon. Explore os encaixes. Ajuste cada movimento."
        action={
          <div className="button-row">
            <Button variant="secondary" onClick={focusAddPokemon} disabled={draft.length >= 6}>
              <Plus size={16} /> Adicionar Pokémon
            </Button>
            <Button onClick={save} disabled={busy || !draft.length}>
              <Save size={16} />
              {busy ? 'Salvando...' : editTeamId ? 'Atualizar equipe' : 'Salvar equipe'}
            </Button>
          </div>
        }
      />
      <div className="team-title-bar">
        <label>
          Nome da equipe
          <input
            aria-label="Nome da equipe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </label>
        <span className="outline-tag">{GAMES[game].short} · Campanha</span>
        <span className="draft-label">
          <span /> Rascunho nesta sessão
        </span>
        <Button variant="ghost" size="sm" onClick={exportTeam} disabled={!draft.length}>
          <Download size={15} /> Exportar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => modal.current?.showModal()}>
          <Upload size={15} /> Importar
        </Button>
      </div>
      <div className="team-slot-grid">
        {Array.from({ length: 6 }, (_, i) => {
          const member = draft[i];
          const p = member ? catalog.find((p) => p.id === member.formId) : null;
          return (
            <div
              key={i}
              style={p ? getPokemonVisual(p).style : undefined}
              className={`team-slot ${member ? 'filled' : ''} ${member && i === selectedIndex ? 'active' : ''}`}
            >
              {p ? (
                <>
                  <button
                    className="remove-member icon-button"
                    aria-label={`Remover ${p.name}`}
                    onClick={() => setDraft(draft.filter((_, index) => index !== i))}
                  >
                    <X size={14} />
                  </button>
                  <button
                    className="team-slot-content"
                    aria-pressed={i === selectedIndex}
                    onClick={() => setSelected(i)}
                  >
                    <span className="slot-number">0{i + 1}</span>
                    <PokemonImage pokemon={p} size={116} />
                    <h3>{p.name}</h3>
                    <small>{role(p)}</small>
                    <div className="type-row">
                      {p.types.map((t) => (
                        <TypeBadge type={t} key={t} />
                      ))}
                    </div>
                    <span className="member-move-count">{member.moves.length}/4 movimentos</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="empty-slot"
                  onClick={focusAddPokemon}
                  aria-label="Adicionar Pokémon à equipe"
                >
                  <span>0{i + 1}</span>
                  <Plus size={25} />
                  <small>Um novo encaixe</small>
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="team-workspace">
        <section className="panel team-controls" id="team-controls">
          <SectionHeading
            title={draft.length ? 'Quem vem completar a equipe?' : 'O primeiro passo é escolher.'}
            caption="Montagem manual não restringe o progresso da campanha."
          />
          <PokemonPicker value={undefined} onChange={add} label="Adicionar integrante" />
          {draft[selectedIndex] && (
            <>
              <div className="editor-divider" />
              <SectionHeading
                title={`Configurar ${catalog.find((p) => p.id === draft[selectedIndex].formId)?.name ?? 'integrante'}`}
                caption="Apenas movimentos com learnset específico do jogo."
              />
              <MemberEditor
                key={`${draft[selectedIndex].formId}-${game}-${selectedIndex}`}
                member={draft[selectedIndex]}
                onChange={(member) =>
                  setDraft(draft.map((m, i) => (i === selectedIndex ? member : m)))
                }
              />
            </>
          )}
          <Notice>{GAMES[game].note}</Notice>
          {!personal && (
            <Link href="/perfil" className="login-tip">
              <LockKeyhole size={15} /> Entre para salvar sua equipe na conta{' '}
              <ArrowRight size={14} />
            </Link>
          )}
        </section>
        <div className="team-insights">
          <div className="analysis-status" aria-live="polite">
            {analyzing ? (
              <>
                <LoaderCircle size={13} className="spin" /> Recalculando...
              </>
            ) : analysis ? (
              <>
                <Check size={13} /> Análise atualizada
              </>
            ) : null}
          </div>
          <AnalysisPanel analysis={analysis} />
        </div>
      </div>
      <dialog ref={modal} className="import-dialog" aria-label="Importar equipe">
        <div className="dialog-header">
          <h2>Importar equipe</h2>
          <button
            className="icon-button"
            onClick={() => modal.current?.close()}
            aria-label="Fechar importação"
          >
            <X size={19} />
          </button>
        </div>
        <p>
          Use um JSON exportado pelo Pokétactics. O servidor verificará a legalidade antes de abrir
          o rascunho.
        </p>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 64000) {
              notify('Arquivo maior que 64 KB.');
              return;
            }
            setImportText(await f.text());
          }}
        />
        <textarea
          aria-label="JSON da equipe"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={12}
          maxLength={64000}
        />
        <Button onClick={importTeam} disabled={importing || !importText}>
          {importing ? 'Validando...' : 'Validar e importar'}
        </Button>
      </dialog>
    </div>
  );
}
type Generation = {
  members: (Member & {
    build: { role: string; score: number; moves: { id: number; name: string; type: string }[] };
  })[];
  analysis: Analysis;
  eligible: number;
  method: string;
  warnings: string[];
};
export function Generator() {
  const { game, personal, catalog, setDraft, setEditTeamId } = useHub();
  const router = useRouter();
  const [stage, setStage] = useState(
    personal?.user.preferences.stages?.[game] ?? personal?.user.preferences.stage ?? 0,
  );
  const [dlc, setDlc] = useState(false);
  const [ignoreProgress, setIgnore] = useState(false);
  const [style, setStyle] = useState<Style>('balanced');
  const [required, setRequired] = useState<number[]>([]);
  const [banned, setBanned] = useState<number[]>([]);
  const [size, setSize] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Generation | null>(null);
  const [variant, setVariant] = useState(0);
  const generationRequest = useRef(0);
  useEffect(() => {
    generationRequest.current++;
    setBusy(false);
    setResult(null);
    setError('');
    setRequired([]);
    setBanned([]);
    setVariant(0);
  }, [game]);
  async function generate() {
    const requestId = ++generationRequest.current;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const data = await api<Generation>('generate', 'POST', {
        gameId: game,
        mode: 'story',
        stage,
        dlc,
        ignoreProgress,
        style,
        required,
        banned,
        size,
        variant,
      });
      if (requestId === generationRequest.current) {
        setResult(data);
        setVariant(variant + 1);
      }
    } catch (e) {
      if (requestId === generationRequest.current) setError((e as Error).message);
    } finally {
      if (requestId === generationRequest.current) setBusy(false);
    }
  }
  function open() {
    if (!result) return;
    setDraft(result.members.map((m) => ({ formId: m.formId, moves: m.moves })));
    setEditTeamId(null);
    router.push('/equipes');
  }
  return (
    <div>
      <PageHeading
        eyebrow="NOVAS COMBINAÇÕES"
        title="Deixe as conexões surpreenderem."
        text="Geração de equipes por busca heurística, com limites e critérios transparentes."
      />
      <div className="generator-layout">
        <section className="panel generator-options">
          <span className="promo-icon">
            <Shuffle size={24} />
          </span>
          <h2>Qual equipe você quer construir?</h2>
          <label>
            JOGO
            <input readOnly value={GAMES[game].name} />
          </label>
          <label>
            ESTILO
            <select value={style} onChange={(e) => setStyle(e.target.value as Style)}>
              {(['balanced', 'offensive', 'defensive', 'support'] as Style[]).map((s) => (
                <option key={s} value={s}>
                  {styleLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            ETAPA DA CAMPANHA
            <select value={stage} onChange={(e) => setStage(Number(e.target.value))}>
              {GAMES[game].stages.map((s, i) => (
                <option key={s} value={i}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            INTEGRANTES
            <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <option value={i} key={i}>
                  {i} Pokémon
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={dlc} onChange={(e) => setDlc(e.target.checked)} />
            <span>
              Incluir conteúdo de DLC<small>Somente conteúdo catalogado para este jogo.</small>
            </span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={ignoreProgress}
              onChange={(e) => setIgnore(e.target.checked)}
            />
            <span>
              Ignorar progresso<small>Permitir Pokémon e movimentos com etapa desconhecida.</small>
            </span>
          </label>
          <div className="editor-divider" />
          <PokemonPicker
            value={undefined}
            label="Pokémon obrigatórios (opcional)"
            exclude={[...required, ...banned]}
            onChange={(id) => setRequired([...required, id])}
          />
          <div className="selected-chips">
            {required.map((id) => (
              <button key={id} onClick={() => setRequired(required.filter((x) => x !== id))}>
                {catalog.find((p) => p.id === id)?.name}
                <X size={12} />
              </button>
            ))}
          </div>
          <PokemonPicker
            value={undefined}
            label="Pokémon proibidos (opcional)"
            exclude={[...required, ...banned]}
            onChange={(id) => setBanned([...banned, id])}
          />
          <div className="selected-chips">
            {banned.map((id) => (
              <button key={id} onClick={() => setBanned(banned.filter((x) => x !== id))}>
                {catalog.find((p) => p.id === id)?.name}
                <X size={12} />
              </button>
            ))}
          </div>
          <Button onClick={generate} disabled={busy} className="full-width">
            {busy ? <LoaderCircle className="spin" size={16} /> : <Shuffle size={16} />}{' '}
            {busy ? 'Explorando combinações...' : 'Gerar minha equipe'}
          </Button>
          <p className="fine-print">
            Mesmas entradas e variante produzem o mesmo resultado. Gerar novamente pede outra
            solução da busca.
          </p>
        </section>
        <div>
          {error && (
            <div className="error-notice" role="alert">
              {error}
            </div>
          )}
          {result ? (
            <>
              <section className="panel">
                <SectionHeading
                  title="Uma nova combinação para explorar."
                  caption={`${result.eligible} candidatos elegíveis · ${result.method}`}
                />
                <div className="generated-members">
                  {result.members.map((m, i) => {
                    const p = catalog.find((p) => p.id === m.formId);
                    return p ? (
                      <article key={m.formId} style={getPokemonVisual(p).style}>
                        <span className="dex-number">0{i + 1}</span>
                        <PokemonImage pokemon={p} size={95} />
                        <div>
                          <h3>{p.name}</h3>
                          <small>
                            {m.build.role} · Índice de movimentos {m.build.score}
                          </small>
                          <div className="generated-moves">
                            {m.build.moves.map((move) => (
                              <span key={move.id}>{move.name}</span>
                            ))}
                          </div>
                        </div>
                      </article>
                    ) : null;
                  })}
                </div>
                <div className="button-row">
                  <Button onClick={open}>
                    Ajustar no construtor <ArrowRight size={16} />
                  </Button>
                  <Button onClick={generate} disabled={busy} variant="secondary">
                    <RotateCw size={15} /> Outra combinação
                  </Button>
                </div>
              </section>
              {result.warnings.map((w) => (
                <Notice key={w}>{w}</Notice>
              ))}
              <AnalysisPanel analysis={result.analysis} />
            </>
          ) : (
            <div className="generator-placeholder panel">
              <div className="generation-orbits">
                <Shuffle size={40} />
                <i />
                <i />
              </div>
              <h2>Equilíbrio é uma construção.</h2>
              <p>
                Configure os critérios e o motor vai explorar cobertura ofensiva, respostas
                defensivas e funções complementares.
              </p>
              <div className="generation-criteria">
                <span>
                  <Check size={14} /> Learnsets por jogo
                </span>
                <span>
                  <Check size={14} /> Busca com limites
                </span>
                <span>
                  <Check size={14} /> Sem gastar tokens
                </span>
              </div>
              <Notice>
                O mapeamento de progresso ainda é parcial. Sem ignorar progresso, dados de etapa
                desconhecida são excluídos. Movimentos são específicos do jogo; a disponibilidade
                por etapa ainda é parcial. As recomendações continuam limitadas a essa curadoria.
              </Notice>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function SavedTeams() {
  const { personal, catalog, setGame, setDraft, setEditTeamId, notify, refresh } = useHub();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function remove(id: string) {
    setBusy(id);
    try {
      await api(`teams/${id}`, 'DELETE');
      await refresh();
      notify('Equipe excluída.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div>
      <PageHeading
        eyebrow="SUA COLEÇÃO"
        title="Boas ideias merecem ser guardadas."
        text="Suas equipes salvas, prontas para a próxima jornada."
        action={
          <Button asChild>
            <Link href="/equipes">
              <Plus size={16} /> Nova equipe
            </Link>
          </Button>
        }
      />
      {!personal ? (
        <EmptyState
          title="Seu laboratório está esperando"
          text="Entre na sua conta para salvar e recuperar suas equipes."
          action={
            <Button asChild>
              <Link href="/perfil">Entrar ou criar conta</Link>
            </Button>
          }
        />
      ) : !personal.teams.length ? (
        <EmptyState
          title="A primeira equipe é só o começo"
          text="Crie uma equipe no construtor e salve aqui sua estratégia."
          action={
            <Button asChild>
              <Link href="/equipes">
                <Plus size={16} /> Construir equipe
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="saved-team-grid">
          {personal.teams.map((team) => (
            <section className="panel saved-team" key={team.id}>
              <div className="saved-team-heading">
                <span className="outline-tag">{GAMES[team.gameId].short}</span>
                <button
                  aria-label={`Excluir equipe ${team.name}`}
                  className="icon-button danger"
                  disabled={busy === team.id}
                  onClick={() => remove(team.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h2>{team.name}</h2>
              <p>{team.members.length} integrantes · Campanha</p>
              <div className="saved-team-sprites">
                {team.members.map((m, i) => {
                  const p = catalog.find((p) => p.id === m.formId);
                  return p ? (
                    <Link href={`/pokemon/${m.formId}?game=${team.gameId}`} key={i}>
                      <PokemonImage pokemon={p} size={85} />
                      <small>{p.name}</small>
                    </Link>
                  ) : null;
                })}
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setGame(team.gameId);
                  setDraft(
                    team.members.map((m) => ({ ...m.config, formId: m.formId })),
                    team.gameId,
                  );
                  setEditTeamId(team.id);
                  router.push('/equipes');
                }}
              >
                Abrir no construtor <ArrowUpRight size={15} />
              </Button>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
