import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('package metadata', () => {
  it('points npm readers at the homepage and issue tracker', () => {
    expect(pkg.homepage).toBe('https://github.com/flisk-sh/md2html#readme');
    expect(pkg.bugs?.url).toBe('https://github.com/flisk-sh/md2html/issues');
  });

  it('declares the supported Node range and side-effect free build', () => {
    expect(pkg.engines?.node).toBe('>=18');
    expect(pkg.sideEffects).toBe(false);
  });
});
