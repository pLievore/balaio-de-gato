import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * WCAG 2.2 contrast guard for the design tokens in app/globals.css.
 *
 * Tokens are parsed from the stylesheet itself so this test cannot drift
 * from what the browser actually renders. Pairs cover the combinations the
 * shell and primitives actually use: body text, secondary text, buttons,
 * announcement bar, footer card, focus ring, badges and input borders.
 */

type Rgb = [number, number, number];

const stylesheet = readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');

function token(name: string): Rgb {
  const match = stylesheet.match(
    new RegExp(`--${name}:\\s*(\\d{1,3})\\s+(\\d{1,3})\\s+(\\d{1,3})\\s*;`),
  );
  assert.ok(match, `token --${name} not found in app/globals.css`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.04045 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const white: Rgb = [255, 255, 255];

const textPairs: Array<[string, Rgb, Rgb]> = [
  ['fg on bg (body text)', token('fg'), token('bg')],
  ['fg on surface', token('fg'), token('surface')],
  ['fg on surface-muted (ghost hover)', token('fg'), token('surface-muted')],
  ['muted on bg (secondary text)', token('muted'), token('bg')],
  ['muted on surface', token('muted'), token('surface')],
  ['white on fg (primary button)', white, token('fg')],
  ['white on accent (orange primary button)', white, token('accent')],
  ['white on sage-ink (sage button, announcement bar)', white, token('sage-ink')],
  ['sage-ink on sage-soft (footer card)', token('sage-ink'), token('sage-soft')],
  ['sage-ink on bg', token('sage-ink'), token('bg')],
  ['accent on surface (accent text/links)', token('accent'), token('surface')],
  ['accent on accent-soft (promo badge)', token('accent'), token('accent-soft')],
  ['danger on danger-soft (validation feedback)', token('danger'), token('danger-soft')],
];

const nonTextPairs: Array<[string, Rgb, Rgb]> = [
  ['accent focus ring on bg', token('accent'), token('bg')],
  ['accent focus ring on surface', token('accent'), token('surface')],
  ['border-strong input boundary on surface', token('border-strong'), token('surface')],
  ['border-strong input boundary on bg', token('border-strong'), token('bg')],
];

test('text token pairs meet WCAG 2.2 AA (4.5:1)', () => {
  for (const [name, foreground, background] of textPairs) {
    const ratio = contrastRatio(foreground, background);
    assert.ok(ratio >= 4.5, `${name}: ${ratio.toFixed(2)}:1 is below the 4.5:1 AA minimum`);
  }
});

test('non-text UI token pairs meet WCAG 2.2 (3:1)', () => {
  for (const [name, foreground, background] of nonTextPairs) {
    const ratio = contrastRatio(foreground, background);
    assert.ok(ratio >= 3, `${name}: ${ratio.toFixed(2)}:1 is below the 3:1 non-text minimum`);
  }
});
