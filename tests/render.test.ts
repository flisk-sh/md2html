import { describe, expect, it } from 'vitest';
import { githubRawUrl, markdownToText, renderMarkdown, resolveUrl, slug } from '../src/index';

const base = 'https://github.com/o/r/blob/abc123/docs/guide.md';

describe('GitHub-flavored Markdown', () => {
  it('renders headings with GitHub ids, unique within the page', () => {
    expect(renderMarkdown('## Getting started\n\n## Getting started')).toBe(
      '<h2 id="getting-started">Getting started</h2>\n<h2 id="getting-started-1">Getting started</h2>\n',
    );
  });

  it('renders tables, strikethrough, code with its language, and autolinks', () => {
    const html = renderMarkdown('| A | B |\n|:--|--:|\n| 1 | 2 |\n\n~~old~~ https://flisk.sh\n\n```ts\nconst a = 1 < 2;\n```');
    expect(html).toContain('<th align="left">A</th>');
    expect(html).toContain('<td align="right">2</td>');
    expect(html).toContain('<s>old</s>');
    expect(html).toContain('<a href="https://flisk.sh" target="_blank" rel="noopener noreferrer">https://flisk.sh</a>');
    expect(html).toContain('<pre><code class="language-ts">const a = 1 &lt; 2;\n</code></pre>');
  });

  it('renders task lists as disabled checkboxes', () => {
    const html = renderMarkdown('- [x] done\n- [ ] todo');
    expect(html).toContain('<input type="checkbox" disabled checked /> done');
    expect(html).toContain('<input type="checkbox" disabled /> todo');
  });

  it('renders GitHub alerts', () => {
    expect(renderMarkdown('> [!WARNING]\n> Back up first.')).toBe(
      '<blockquote class="alert alert-warning">\n<p><strong>Warning</strong> Back up first.</p>\n</blockquote>\n',
    );
  });
});

describe('README HTML', () => {
  it('keeps centered paragraphs, badges, picture sources and details', () => {
    const html = renderMarkdown(
      [
        '<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg"><img src="docs/logo.svg" alt="Logo" width="120"></picture></p>',
        '',
        '<a href="https://github.com/o/r/actions"><img src="https://img.shields.io/badge/ci-passing-green" alt="CI"></a>',
        '',
        '<details><summary>More</summary>',
        '',
        'Hidden **text**.',
        '',
        '</details>',
      ].join('\n'),
      { baseUrl: base },
    );
    expect(html).toContain('<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/o/r/abc123/docs/docs/logo-dark.svg" />');
    expect(html).toContain('<img src="https://raw.githubusercontent.com/o/r/abc123/docs/docs/logo.svg" alt="Logo" width="120" loading="lazy" />');
    expect(html).toContain('<a href="https://github.com/o/r/actions" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/ci-passing-green" alt="CI" loading="lazy" /></a>');
    expect(html).toContain('<details><summary>More</summary>');
    expect(html).toContain('<p>Hidden <strong>text</strong>.</p>');
  });

  it('resolves relative links against the file and images against raw.githubusercontent.com', () => {
    const html = renderMarkdown('[Install](../install.md#npm) ![Diagram](img/a.png) [Top](#top)', { baseUrl: base });
    expect(html).toContain('<a href="https://github.com/o/r/blob/abc123/install.md#npm" target="_blank" rel="noopener noreferrer">Install</a>');
    expect(html).toContain('<img src="https://raw.githubusercontent.com/o/r/abc123/docs/img/a.png" alt="Diagram" loading="lazy" />');
    expect(html).toContain('<a href="#top">Top</a>');
  });
});

describe('safety', () => {
  const vectors: Array<[string, string]> = [
    ['<script>alert(1)</script>', 'script'],
    ['<img src=x onerror=alert(1)>', 'onerror'],
    ['<svg onload=alert(1)></svg>', 'onload'],
    ['[x](javascript:alert(1))', 'href="javascript'],
    ['<a href="javascript:alert(1)">x</a>', 'href="javascript'],
    ['<a href="jav&#x61;script:alert(1)">x</a>', 'script:'],
    ['<a href="data:text/html,<script>alert(1)</script>">x</a>', 'data:'],
    ['<iframe src="https://evil.example"></iframe>', 'iframe'],
    ['<style>body{display:none}</style>', 'display:none'],
    ['<div style="position:fixed">x</div>', 'style='],
    ['<form action="https://evil.example"><input name=p></form>', '<form'],
    ['<a href="//evil.example">x</a>', 'evil.example'],
    ['<img src="x" alt="a" onmouseover="alert(1)">', 'onmouseover'],
    ['<p class="evil" id="x">x</p>', 'class="evil"'],
    ['<input type="text" value="x">', 'type="text"'],
  ];
  for (const [src, banned] of vectors) {
    it(`drops ${banned} from ${src.slice(0, 40)}`, () => {
      expect(renderMarkdown(src).toLowerCase()).not.toContain(banned.toLowerCase());
    });
  }

  it('keeps the text of tags it removes, but not of scripts', () => {
    expect(renderMarkdown('<marquee>hello</marquee> <script>bad()</script>')).toBe('<p>hello </p>\n');
  });
});

describe('helpers', () => {
  it('slug matches GitHub', () => {
    expect(slug('Getting `started`: the CLI!')).toBe('getting-started-the-cli');
    expect(slug('API reference (v2)')).toBe('api-reference-v2');
  });

  it('githubRawUrl and resolveUrl', () => {
    expect(githubRawUrl('https://github.com/o/r/blob/main/a/b.md')).toBe('https://raw.githubusercontent.com/o/r/main/a/b.md');
    expect(githubRawUrl('https://example.com/a')).toBeNull();
    expect(resolveUrl('b.md', 'https://github.com/o/r/blob/main/a/x.md')).toBe('https://github.com/o/r/blob/main/a/b.md');
    expect(resolveUrl('//evil.example/x', base)).toBe('');
    expect(resolveUrl('mailto:a@b.c', base)).toBe('mailto:a@b.c');
  });

  it('markdownToText', () => {
    expect(markdownToText('# Title\n\nSome **bold** <b>html</b> & [a link](x.md).')).toBe('Title\nSome bold html & a link.');
  });
});
