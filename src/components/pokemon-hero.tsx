'use client';
import type { ReactNode } from 'react';
import type { Pokemon } from '@/lib/contracts';
import { dexNumber, getPokemonVisual } from '@/lib/pokemon-visual';
import { PokemonImage, TypeBadge } from './pokemon-ui';

export function PokemonHero({
  pokemon,
  genus,
  children,
}: {
  pokemon: Pokemon;
  genus: string | null;
  children: ReactNode;
}) {
  const visual = getPokemonVisual(pokemon);
  return (
    <section
      className={`pokemon-hero composition-${visual.composition}`}
      style={visual.style}
      aria-label={`Ficha de ${pokemon.name}`}
    >
      <div className="pokemon-hero-copy">
        <span className="hero-dex">#{dexNumber(pokemon.speciesId)}</span>
        {visual.japanese && (
          <p className="japanese-name" lang="ja">
            {visual.japanese}
          </p>
        )}
        <h1 className={visual.japanese ? 'international-name' : 'international-name name-fallback'}>
          {pokemon.name}
        </h1>
        <div className="type-row">
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
        <p className="hero-description">
          {genus ?? 'Classificação não verificada'}
          <br />
          Geração {pokemon.generation} ·{' '}
          {pokemon.kind === 'base'
            ? 'Forma original'
            : pokemon.kind === 'regional'
              ? 'Forma regional'
              : pokemon.kind === 'mega'
                ? 'Mega Evolução'
                : 'Forma alternativa'}
        </p>
        {children}
      </div>
      <div className="pokemon-hero-art">
        <div className="editorial-ground" aria-hidden="true" />
        <span className="hero-graphic-line" aria-hidden="true" />
        <span className="hero-outline-circle" aria-hidden="true" />
        <PokemonImage key={pokemon.id} pokemon={pokemon} size={640} priority />
        <span className="hero-large-number" aria-hidden="true">
          {dexNumber(pokemon.speciesId)}
        </span>
        {['mega', 'gigantamax', 'battle'].includes(pokemon.kind) && (
          <span className="transformation-label">TRANSFORMAÇÃO TEMPORÁRIA</span>
        )}
      </div>
    </section>
  );
}
