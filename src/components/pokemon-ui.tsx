'use client';
import type { Pokemon, Stats } from '@/lib/contracts';
import { TYPE_LABELS, bst } from '@/lib/engine';
import { ArrowUpRight, Heart, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { api, useHub } from './providers';
export const TYPE_COLORS: Record<string, string> = {
  normal: '#a9b1bf',
  fire: '#f49a69',
  water: '#68a9ef',
  electric: '#ead26c',
  grass: '#a2cc79',
  ice: '#86d4d4',
  fighting: '#e48c96',
  poison: '#b78bda',
  ground: '#ccad86',
  flying: '#92aeea',
  psychic: '#e88ea9',
  bug: '#b6bf68',
  rock: '#c4b88b',
  ghost: '#a39ad1',
  dragon: '#8b99ef',
  dark: '#ada0a1',
  steel: '#a2bdc8',
  fairy: '#e5a9ce',
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
      <div className="image-fallback" aria-label={`Imagem indisponível de ${pokemon.name}`}>
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
      priority={priority}
      className="pokemon-image"
      onError={() => (fallback ? setFailed(true) : setFallback(true))}
    />
  );
}
export function TypeBadge({ type, multiplier }: { type: string; multiplier?: number }) {
  return (
    <span
      className="type-badge"
      style={{ '--type-color': TYPE_COLORS[type] } as React.CSSProperties}
    >
      <span className="type-dot" />
      {TYPE_LABELS[type] ?? type}
      {multiplier !== undefined && <b>{multiplier}×</b>}
    </span>
  );
}
export function PokemonCard({ pokemon, index = 0 }: { pokemon: Pokemon; index?: number }) {
  const { personal, notify, refresh, game } = useHub();
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
      className="pokemon-card"
      style={
        {
          '--poke-color': TYPE_COLORS[pokemon.types[0]],
          animationDelay: `${Math.min(index, 12) * 30}ms`,
        } as React.CSSProperties
      }
    >
      <div className="card-top">
        <span className="dex-number">#{String(pokemon.speciesId).padStart(4, '0')}</span>
        <button
          className={`icon-button favorite ${favorite ? 'active' : ''}`}
          onClick={toggle}
          aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${pokemon.name} ${favorite ? 'dos' : 'aos'} favoritos`}
        >
          <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <Link href={`/pokemon/${pokemon.id}?game=${game}`} className="pokemon-card-link">
        <div className="pokemon-art">
          <div className="art-orbit" />
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
  attack: 'Attack',
  defense: 'Defense',
  specialAttack: 'Sp. Attack',
  specialDefense: 'Sp. Defense',
  speed: 'Speed',
};
export function StatBars({ stats, compare }: { stats: Stats; compare?: Stats }) {
  return (
    <div className="stat-bars">
      {(Object.keys(STAT_LABELS) as (keyof Stats)[]).map((key, i) => (
        <div className="stat-row" key={key}>
          <span>{STAT_LABELS[key]}</span>
          <b>{stats[key]}</b>
          <div className="stat-track">
            <i
              style={{
                width: `${Math.min(100, (stats[key] / 255) * 100)}%`,
                background: ['#bce581', '#eea170', '#e6ce86', '#999ce9', '#71c7b4', '#81b5e3'][i],
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
          <Radar
            name="Atributos base"
            dataKey="value"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.18}
          />
          {other && (
            <Radar
              name="Comparação"
              dataKey="other"
              stroke="#91a9f4"
              fill="#91a9f4"
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
