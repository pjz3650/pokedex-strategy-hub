'use client';
import type { Pokemon, Stats } from '@/lib/contracts';
import { TYPE_LABELS, bst } from '@/lib/engine';
import { dexNumber, getPokemonVisual, TYPE_PALETTE } from '@/lib/pokemon-visual';
import {
  ArrowUpRight,
  Heart,
  Sparkles,
  Flame,
  Droplets,
  Zap,
  Leaf,
  Snowflake,
  Swords,
  FlaskConical,
  Mountain,
  Feather,
  Brain,
  Bug,
  Gem,
  Ghost,
  Orbit,
  Moon,
  Shield,
  Star,
  Circle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { api, useHub } from './providers';
export const TYPE_COLORS = Object.fromEntries(
  Object.entries(TYPE_PALETTE).map(([type, palette]) => [type, palette.color]),
);
const TYPE_ICONS = {
  normal: Circle,
  fire: Flame,
  water: Droplets,
  electric: Zap,
  grass: Leaf,
  ice: Snowflake,
  fighting: Swords,
  poison: FlaskConical,
  ground: Mountain,
  flying: Feather,
  psychic: Brain,
  bug: Bug,
  rock: Gem,
  ghost: Ghost,
  dragon: Orbit,
  dark: Moon,
  steel: Shield,
  fairy: Star,
};
export function PokemonImage({
  pokemon,
  size = 160,
  priority = false,
}: {
  pokemon: Pick<Pokemon, 'name' | 'artwork' | 'sprite'>;
  size?: number;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [fallback, setFallback] = useState(false);
  const src = fallback ? pokemon.sprite : pokemon.artwork;
  if (!src || failed)
    return (
      <div
        className="image-fallback"
        role="img"
        aria-label={`Imagem indisponível de ${pokemon.name}`}
      >
        <span className="pokeball-mark" />
      </div>
    );
  return (
    <Image
      src={src}
      alt={pokemon.name}
      width={size}
      height={size}
      unoptimized
      preload={priority}
      className={`pokemon-image${fallback ? ' sprite-image' : ''}`}
      onError={() => (fallback ? setFailed(true) : setFallback(true))}
    />
  );
}
export function TypeBadge({
  type,
  multiplier,
  title,
}: {
  type: string;
  multiplier?: number;
  title?: string;
}) {
  const palette = TYPE_PALETTE[type] ?? TYPE_PALETTE.normal;
  const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] ?? Circle;
  return (
    <span
      className="type-badge"
      style={{ '--type-color': palette.color, '--type-ink': palette.ink } as React.CSSProperties}
      title={title}
    >
      <Icon size={12} aria-hidden="true" />
      {TYPE_LABELS[type] ?? type}
      {multiplier !== undefined && <b>{multiplier}×</b>}
    </span>
  );
}
export function PokemonCard({ pokemon, index = 0 }: { pokemon: Pokemon; index?: number }) {
  const visual = getPokemonVisual(pokemon);
  const { personal, personalLoading, notify, refresh, game } = useHub();
  const favorite = personal?.favorites.includes(pokemon.id);
  async function toggle() {
    if (!personal) {
      notify('Entre na sua conta para salvar favoritos.');
      return;
    }
    try {
      await api(`favorites/${pokemon.id}`, favorite ? 'DELETE' : 'POST');
      await refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <article
      className={`pokemon-card composition-${visual.composition}`}
      style={visual.style}
      data-catalog-index={index}
    >
      <div className="card-top">
        <span className="dex-number">#{dexNumber(pokemon.speciesId)}</span>
        <button
          className={`icon-button favorite ${favorite ? 'active' : ''}`}
          disabled={personalLoading}
          aria-busy={personalLoading}
          onClick={toggle}
          aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${pokemon.name} ${favorite ? 'dos' : 'aos'} favoritos`}
        >
          <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <Link href={`/pokemon/${pokemon.id}?game=${game}`} className="pokemon-card-link">
        <div className="pokemon-art">
          <div className="card-art-ground" aria-hidden="true" />
          {visual.japanese && (
            <span className="card-japanese" lang="ja" aria-hidden="true">
              {visual.japanese}
            </span>
          )}
          <PokemonImage pokemon={pokemon} />
        </div>
        <div className="pokemon-card-title">
          <h3>{pokemon.name}</h3>
          {pokemon.kind === 'mega' ? <Sparkles size={16} /> : <ArrowUpRight size={16} />}
        </div>
        <div className="type-row">
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
        <div className="card-footer">
          <span>
            {pokemon.kind === 'base'
              ? 'Forma original'
              : pokemon.kind === 'regional'
                ? 'Forma regional'
                : pokemon.kind === 'mega'
                  ? 'Transformação em batalha'
                  : 'Forma alternativa'}
          </span>
          <span>
            BST <b>{bst(pokemon.stats)}</b>
          </span>
        </div>
      </Link>
    </article>
  );
}
export const STAT_LABELS: Record<keyof Stats, string> = {
  hp: 'HP',
  attack: 'ATQ',
  defense: 'DEF',
  specialAttack: 'ATQ. ESP.',
  specialDefense: 'DEF. ESP.',
  speed: 'VEL',
};
export function StatBars({ stats, compare }: { stats: Stats; compare?: Stats }) {
  return (
    <div className="stat-bars">
      {(Object.keys(STAT_LABELS) as (keyof Stats)[]).map((key) => (
        <div className="stat-row" key={key}>
          <span>{STAT_LABELS[key]}</span>
          <b>{stats[key]}</b>
          <div className="stat-track">
            <i
              style={{
                width: `${Math.min(100, (stats[key] / 255) * 100)}%`,
              }}
            />
            {compare && <em style={{ left: `${Math.min(100, (compare[key] / 255) * 100)}%` }} />}
          </div>
        </div>
      ))}
    </div>
  );
}
export function StatsRadar({ stats, other }: { stats: Stats; other?: Stats }) {
  const data = (Object.keys(STAT_LABELS) as (keyof Stats)[]).map((k) => ({
    name: STAT_LABELS[k],
    value: stats[k],
    other: other?.[k] ?? 0,
  }));
  return (
    <div className="radar-wrap">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 255]} tick={false} axisLine={false} />
          <Radar
            isAnimationActive={false}
            name="Atributos base"
            dataKey="value"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.18}
          />
          {other && (
            <Radar
              isAnimationActive={false}
              name="Comparação"
              dataKey="other"
              stroke="var(--comparison)"
              fill="var(--comparison)"
              fillOpacity={0.1}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-orbit">
        <span className="pokeball-mark" />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
