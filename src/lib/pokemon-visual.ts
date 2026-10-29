import type { CSSProperties } from 'react';
import type { Pokemon } from './contracts';
import metadata from '@/data/pokemon-visual-metadata.json';

/** Editorial ground and accessible badge color are separate roles. */
export const TYPE_PALETTE: Record<string, { color: string; ink: string }> = {
  normal: { color: '#9b9888', ink: '#625e51' },
  fire: { color: '#ef593e', ink: '#bd3522' },
  water: { color: '#5599c8', ink: '#22658e' },
  electric: { color: '#edc94d', ink: '#705500' },
  grass: { color: '#75a36a', ink: '#39652f' },
  ice: { color: '#83bcbf', ink: '#285e63' },
  fighting: { color: '#c16a53', ink: '#973c2e' },
  poison: { color: '#a17aa8', ink: '#75447f' },
  ground: { color: '#c09763', ink: '#795122' },
  flying: { color: '#7e9fbe', ink: '#3e6285' },
  psychic: { color: '#d87e98', ink: '#a2365c' },
  bug: { color: '#9ba755', ink: '#58651d' },
  rock: { color: '#b9a477', ink: '#74602f' },
  ghost: { color: '#89769f', ink: '#604779' },
  dragon: { color: '#7785b4', ink: '#4d5d98' },
  dark: { color: '#807370', ink: '#5f514b' },
  steel: { color: '#8eaaa9', ink: '#456568' },
  fairy: { color: '#d494b3', ink: '#913a65' },
};
type SpeciesVisual = { japanese: string | null; shape: number | null; color: number | null };
type FormVisual = { height: number; weight: number };
const species: Record<string, SpeciesVisual> = metadata.species;
const forms: Record<string, FormVisual> = metadata.forms;
const BODY_COLORS: Record<number, string> = {
  1: '#525354',
  2: '#6898b8',
  3: '#a08468',
  4: '#a2a8a2',
  5: '#7caa74',
  6: '#d99cb3',
  7: '#9b7da8',
  8: '#d96950',
  9: '#bbc2b5',
  10: '#e6c763',
};
export type Composition = 'balanced' | 'upright' | 'wide' | 'serpentine' | 'cluster' | 'winged';
const SHAPES: Record<number, Composition> = {
  2: 'serpentine',
  3: 'wide',
  6: 'upright',
  9: 'winged',
  10: 'wide',
  11: 'cluster',
  12: 'upright',
  13: 'winged',
};
const FRAME: Record<Composition, { scale: number; x: string; y: string; cut: string }> = {
  balanced: { scale: 1, x: '50%', y: '50%', cut: '18%' },
  upright: { scale: 1.04, x: '50%', y: '46%', cut: '22%' },
  wide: { scale: 0.92, x: '50%', y: '50%', cut: '12%' },
  serpentine: { scale: 0.96, x: '50%', y: '50%', cut: '14%' },
  cluster: { scale: 1, x: '50%', y: '55%', cut: '10%' },
  winged: { scale: 1.08, x: '50%', y: '48%', cut: '24%' },
};
// Only true form-specific changes; all other forms inherit metadata and own types.
const FORM_COMPOSITION: Record<string, Composition> = {
  'giratina-origin': 'serpentine',
  'giratina-altered': 'upright',
  'zygarde-complete': 'upright',
};
// Official Wailord art has unusually generous internal whitespace.
const ART_SCALE: Record<string, number> = { wailord: 1.32 };

export function getPokemonVisual(
  p: Pick<Pokemon, 'id' | 'speciesId' | 'identifier' | 'types' | 'name'>,
) {
  const entry = species[String(p.speciesId)];
  const dimensions = forms[String(p.id)];
  const primary = TYPE_PALETTE[p.types[0]] ?? TYPE_PALETTE.normal;
  const secondary = TYPE_PALETTE[p.types[1]] ?? primary;
  const composition = FORM_COMPOSITION[p.identifier] ?? SHAPES[entry?.shape ?? 0] ?? 'balanced';
  const frame = FRAME[composition];
  // Tall serpents stay fully contained; light/white species get a stronger ground.
  const scale =
    ART_SCALE[p.identifier] ?? (dimensions?.height > 8 ? Math.min(frame.scale, 0.92) : frame.scale);
  return {
    japanese: entry?.japanese ?? null,
    composition,
    style: {
      '--poke-color': primary.color,
      '--poke-secondary': secondary.color,
      '--poke-ink': primary.ink,
      '--poke-body': BODY_COLORS[entry?.color ?? 0] ?? primary.color,
      '--art-scale': scale,
      '--art-x': frame.x,
      '--art-y': frame.y,
      '--art-cut': frame.cut,
      '--ground-strength': entry?.color === 9 ? '48%' : '35%',
    } as CSSProperties,
  };
}

export function dexNumber(id: number) {
  return String(id).padStart(3, '0');
}
