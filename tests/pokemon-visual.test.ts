import { describe, expect, it } from 'vitest';
import { dexNumber, getPokemonVisual, TYPE_PALETTE } from '../src/lib/pokemon-visual';
import metadata from '../src/data/pokemon-visual-metadata.json';

const visual = (speciesId: number, identifier: string, types = ['normal'], id = speciesId) =>
  getPokemonVisual({ id, speciesId, identifier, types, name: identifier });
const luminance = (hex: string) => {
  const rgb = hex
    .match(/[a-f\d]{2}/gi)!
    .map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
describe('Type Study visual system', () => {
  it('retains the complete pinned species and form metadata', () => {
    expect(Object.keys(metadata.species)).toHaveLength(1025);
    expect(Object.keys(metadata.forms)).toHaveLength(1351);
    for (const [id, entry] of Object.entries(metadata.species)) {
      expect(entry.japanese, `Japanese name for ${id}`).toBeTruthy();
      expect(
        visual(Number(id), id).style['--art-scale' as keyof React.CSSProperties],
      ).toBeGreaterThan(0);
    }
  });
  it('provides 18 readable badge colors with white text', () => {
    expect(Object.keys(TYPE_PALETTE)).toHaveLength(18);
    for (const [type, palette] of Object.entries(TYPE_PALETTE)) {
      expect(1.05 / (luminance(palette.ink) + 0.05), type).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('uses verified Japanese names and distinct silhouette rules', () => {
    expect(visual(6, 'charizard').japanese).toBe('リザードン');
    expect(visual(1, 'bulbasaur').japanese).toBe('フシギダネ');
    expect(visual(25, 'pikachu').japanese).toBe('ピカチュウ');
    expect(visual(94, 'gengar').japanese).toBe('ゲンガー');
    // PokéAPI classifies Charizard as upright; Butterfree has the bug-wings shape.
    expect(visual(6, 'charizard').composition).toBe('upright');
    expect(visual(12, 'butterfree').composition).toBe('winged');
    expect(visual(384, 'rayquaza').composition).toBe('serpentine');
    expect(visual(321, 'wailord').composition).toBe('wide');
    expect(visual(102, 'exeggcute').composition).toBe('cluster');
    expect(visual(487, 'giratina-origin', ['ghost', 'dragon'], 10007).composition).toBe(
      'serpentine',
    );
    expect(visual(201, 'unown').japanese).toBe('アンノーン');
  });
  it('uses form-specific types and falls back honestly for unknown species', () => {
    expect(visual(6, 'charizard-mega-x', ['fire', 'dragon'], 10034).style).toMatchObject({
      '--poke-secondary': TYPE_PALETTE.dragon.color,
    });
    expect(visual(999999, 'unknown', ['unknown']).japanese).toBeNull();
    expect(visual(999999, 'unknown', ['unknown']).composition).toBe('balanced');
    expect(dexNumber(6)).toBe('006');
    expect(dexNumber(1025)).toBe('1025');
  });
});
