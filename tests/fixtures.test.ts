import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/index';

// Real READMEs, committed so the check is deterministic and offline. Each must render with no HTML left escaped
// (a "half broken" page), nothing executable, and every URL absolute.
const dir = join(import.meta.dirname, 'fixtures');

describe.each(readdirSync(dir).filter((f) => f.endsWith('.md')))('%s', (file) => {
  const html = renderMarkdown(readFileSync(join(dir, file), 'utf8'), {
    baseUrl: 'https://github.com/o/r/blob/main/README.md',
  });

  it('leaves no HTML tag escaped as text', () => {
    // Outside code blocks, an escaped tag means the renderer failed to understand the README's HTML.
    const prose = html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '');
    expect(prose.match(/&lt;\/?(a|img|p|div|table|tr|td|th|br|picture|source|details|summary|sub|sup|b)[\s>/]/gi) ?? []).toEqual([]);
  });

  it('contains nothing executable', () => {
    expect(html).not.toMatch(/<(script|iframe|object|embed|style|form)\b/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/(href|src|srcset)="\s*(javascript|data|vbscript):/i);
  });

  it('makes every link and image absolute or a fragment', () => {
    for (const [, url] of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
      expect(url).toMatch(/^(https?:\/\/|mailto:|#)/);
    }
  });
});
