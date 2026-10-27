import { describe,expect,it } from 'vitest';
import { parsePlaMoveProperties,parseZaMoveProperties } from '../src/lib/game-move-properties';

// Selected numeric facts from projectpokemon/za-textport Raw JSON, normal variants.
const table = (...rows: Record<string, unknown>[]) => ({ Table: [{ Table: rows }] });
const flamethrower = { WazaID: 53, ExtentionType: 0, Power: 90, Type: 9, DamageType: 2 };
const flameTiming = { WazaId: 53, WazaRecastTime: 8, HitPer: 100 };

describe('Z-A real-time move properties', () => {
  it('joins normal battle and timing rows by official move number', () => {
    expect(parseZaMoveProperties(table(flamethrower), table(flameTiming))).toEqual([
      {
        moveId: 53,
        typeName: 'fire',
        category: 'special',
        power: 90,
        cooldown: 8,
        accuracy: null,
        pp: null,
        priority: null,
        range: null,
        area: null,
        verified: true,
      },
    ]);
  });

  it('does not mix plus/boss power or timing into the normal move', () => {
    expect(
      parseZaMoveProperties(
        table(
          flamethrower,
          { ...flamethrower, ExtentionType: 1 },
          { ...flamethrower, ExtentionType: 2, Power: 4 },
        ),
        table(flameTiming, { WazaId: 1053, WazaRecastTime: 2 }),
      )[0],
    ).toMatchObject({ moveId: 53, power: 90, cooldown: 8 });
  });

  it('preserves Nihil Light real-time power 200 and official ID 920', () => {
    expect(
      parseZaMoveProperties(
        table({ WazaID: 920, ExtentionType: 0, Power: 200, Type: 15, DamageType: 2 }),
        table(),
      )[0],
    ).toMatchObject({ moveId: 920, power: 200, cooldown: null });
  });

  it('skips the ID zero placeholder and preserves absent properties as unknown', () => {
    expect(
      parseZaMoveProperties(
        table(
          { WazaID: 0, ExtentionType: 0, Power: 40 },
          { WazaID: 14, ExtentionType: 0, Power: 0, Type: 0, DamageType: 0 },
        ),
        table(),
      ),
    ).toEqual([
      {
        moveId: 14,
        typeName: 'normal',
        category: 'status',
        power: null,
        cooldown: null,
        accuracy: null,
        pp: null,
        priority: null,
        range: null,
        area: null,
        verified: true,
      },
    ]);
  });

  it('accepts repeated timing rows with equal cooldowns but rejects contradictions', () => {
    expect(
      parseZaMoveProperties(table(flamethrower), table(flameTiming, flameTiming))[0].cooldown,
    ).toBe(8);
    expect(() =>
      parseZaMoveProperties(
        table(flamethrower),
        table(flameTiming, { ...flameTiming, WazaRecastTime: 9 }),
      ),
    ).toThrow('ambíguo');
    expect(() =>
      parseZaMoveProperties(table(flamethrower, { ...flamethrower, Power: 95 }), table()),
    ).toThrow('ambíguo');
  });

  it.each([
    [{ ...flamethrower, WazaID: -1 }, flameTiming],
    [{ ...flamethrower, Power: 256 }, flameTiming],
    [{ ...flamethrower, Power: '90' }, flameTiming],
    [{ ...flamethrower, ExtentionType: 3 }, flameTiming],
    [{ ...flamethrower, Type: 18 }, flameTiming],
    [{ ...flamethrower, DamageType: 3 }, flameTiming],
    [flamethrower, { ...flameTiming, WazaRecastTime: Number.NaN }],
    [flamethrower, { ...flameTiming, WazaRecastTime: -1 }],
    [flamethrower, { ...flameTiming, WazaRecastTime: 61 }],
  ])('rejects invalid identifiers and numeric values', (battle, timing) => {
    expect(() => parseZaMoveProperties(table(battle), table(timing))).toThrow();
  });

  it('rejects malformed table shapes rather than silently importing nothing', () => {
    expect(() => parseZaMoveProperties([], table())).toThrow();
    expect(() => parseZaMoveProperties({ Table: [{}] }, table())).toThrow();
  });
});

// Selected original TSV columns: Fire Punch, Swords Dance, Gust, unused Pound.
const pla = [
  'Index\tMoveID\tCanUseMove\tFPower\tFAccuracy\tFPP\tFType\tFCategory',
  '7\t7\tTrue\t75\t100\t10\t9\t1',
  '14\t14\tTrue\t0\t101\t20\t0\t0',
  '16\t16\tTrue\t40\t100\t25\t2\t2',
  '1\t1\tFalse\t40\t100\t35\t0\t1',
].join('\n');

describe('PLA standard-style move properties', () => {
  it('imports only game-enabled moves and their own PLA PP', () => {
    const moves = parsePlaMoveProperties(pla);
    expect(moves.map((move) => move.moveId)).toEqual([7, 14, 16]);
    expect(moves[0]).toEqual({
      moveId: 7,
      typeName: 'fire',
      category: 'physical',
      power: 75,
      accuracy: 100,
      pp: 10,
      priority: null,
      cooldown: null,
      range: null,
      area: null,
      verified: true,
    });
  });

  it('does not convert the always-hit sentinel into 101% accuracy', () => {
    expect(parsePlaMoveProperties(pla)[1]).toMatchObject({ power: null, accuracy: null, pp: 20 });
  });

  it('uses PLA status category for Double Hit instead of the main-series physical category', () => {
    const doubleHit = `${pla.split('\n')[0]}\n458\t458\tTrue\t0\t101\t10\t0\t0`;
    expect(parsePlaMoveProperties(doubleHit)[0]).toMatchObject({
      moveId: 458,
      category: 'status',
      typeName: 'normal',
    });
  });

  it('accepts Windows newlines and a UTF-8 BOM', () => {
    expect(parsePlaMoveProperties(`\uFEFF${pla.replaceAll('\n', '\r\n')}\r\n`)).toHaveLength(3);
  });

  it.each([
    pla.replace('Index', 'Wrong'),
    pla.replace('7\t7\tTrue', '7\t8\tTrue'),
    pla.replace('7\t7\tTrue', '7\t7\tUnknown'),
    pla.replace('75\t100\t10', '256\t100\t10'),
    pla.replace('75\t100\t10', '75\t102\t10'),
    pla.replace('75\t100\t10', '75\t100\t0'),
    pla.replace('75\t100\t10', '75\t100\t'),
    `${pla}\n7\t7\tTrue\t75\t100\t10`,
    'Index\tMoveID\tCanUseMove\tFPower\tFAccuracy\tFPP\n1\t1\tFalse\t40\t100\t35',
  ])('rejects malformed, contradictory or empty usable datasets', (input) => {
    expect(() => parsePlaMoveProperties(input)).toThrow();
  });
});
