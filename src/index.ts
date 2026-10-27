// md2html: GitHub-flavored Markdown (with the HTML READMEs carry) to HTML that is safe to put in a page.
//
// Rendering is markdown-it; safety is sanitize-html with an allowlist modeled on what GitHub keeps. Nothing here is a
// new parser: the value is the configuration, the URL handling for files that live in a GitHub repository, and the
// tests that pin both down.
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

export interface RenderOptions {
  /**
   * The page the Markdown came from, for relative links: a GitHub file URL such as
   * https://github.com/owner/repo/blob/<ref>/docs/guide.md. Relative hrefs resolve against it.
   */
  baseUrl?: string;
  /**
   * Where relative images resolve. Defaults to `baseUrl` turned into its raw.githubusercontent.com equivalent when it
   * is a GitHub file URL, else to `baseUrl`.
   */
  imageBaseUrl?: string;
  /** Add GitHub-style ids to headings ("Getting started" → id="getting-started"). Default true. */
  headingIds?: boolean;
}

const ALERTS = ['note', 'tip', 'important', 'warning', 'caution'] as const;
type Parser = InstanceType<typeof MarkdownIt>;

/** GitHub's heading slug: lower case, punctuation dropped, spaces to dashes. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** https://github.com/o/r/blob/ref/path → https://raw.githubusercontent.com/o/r/ref/path; null for anything else. */
export function githubRawUrl(url: string): string | null {
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/(.+)$/.exec(url);
  return m ? `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}` : null;
}

/** A link or image target resolved against `base`: absolute and fragment URLs as they are, relative ones joined. */
export function resolveUrl(raw: string, base: string | undefined): string {
  const href = raw.trim();
  if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  if (href.startsWith('//')) return ''; // protocol-relative: an address of the page's choosing, never kept
  if (!base) return href;
  try {
    return new URL(href, base).href;
  } catch {
    return '';
  }
}

function createParser(headingIds: boolean): Parser {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: false });

  md.core.ruler.push('md2html_extras', (state) => {
    const used = new Map<string, number>();
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];

      // Table alignment as GitHub writes it (align="left"), not as an inline style the sanitizer removes.
      if (t.type === 'th_open' || t.type === 'td_open') {
        const align = /text-align:\s*(left|right|center)/.exec(String(t.attrGet('style') ?? ''))?.[1];
        if (align) {
          t.attrs = (t.attrs ?? []).filter(([name]) => name !== 'style');
          t.attrSet('align', align);
        }
      }

      // Heading ids, unique within the document like GitHub's (install, install-1, ...).
      if (headingIds && t.type === 'heading_open' && tokens[i + 1]?.type === 'inline') {
        const text = (tokens[i + 1].children ?? [])
          .filter((c) => c.type === 'text' || c.type === 'code_inline')
          .map((c) => c.content)
          .join('');
        const base = slug(text) || 'section';
        const n = used.get(base) ?? 0;
        used.set(base, n + 1);
        t.attrSet('id', n === 0 ? base : `${base}-${n}`);
      }

      // GitHub alerts: a blockquote whose first line is [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] or [!CAUTION].
      if (t.type === 'blockquote_open' && tokens[i + 1]?.type === 'paragraph_open' && tokens[i + 2]?.type === 'inline') {
        const inline = tokens[i + 2];
        const m = /^\[!(note|tip|important|warning|caution)\]\s*/i.exec(inline.content);
        if (m) {
          const kind = m[1].toLowerCase() as (typeof ALERTS)[number];
          t.attrSet('class', `alert alert-${kind}`);
          const first = inline.children?.[0];
          if (first?.type === 'text') first.content = first.content.replace(/^\[!\w+\]\s*/, '');
          // Drop the soft break that followed the marker line.
          if (inline.children?.[1]?.type === 'softbreak' && !inline.children[0].content) inline.children.splice(0, 2);
          const label = new state.Token('html_inline', '', 0);
          label.content = `<strong>${kind.charAt(0).toUpperCase() + kind.slice(1)}</strong> `;
          inline.children?.unshift(label);
        }
      }

      // Task lists: "- [ ] todo" and "- [x] done" become disabled checkboxes.
      if (t.type === 'inline' && tokens[i - 1]?.type === 'paragraph_open' && tokens[i - 2]?.type === 'list_item_open') {
        const first = t.children?.[0];
        const m = first?.type === 'text' ? /^\[( |x|X)\]\s+/.exec(first.content) : null;
        if (first && m) {
          first.content = first.content.slice(m[0].length);
          const box = new state.Token('html_inline', '', 0);
          box.content = `<input type="checkbox" disabled${m[1].trim() ? ' checked' : ''}> `;
          t.children?.unshift(box);
        }
      }
    }
    return true;
  });
  return md;
}

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

function sanitizeOptions(linkBase: string | undefined, imageBase: string | undefined): sanitizeHtml.IOptions {
  return {
    allowedTags: [
      ...HEADINGS,
      ...['p', 'br', 'hr', 'blockquote', 'pre', 'code', 'span', 'div', 'strong', 'b', 'em', 'i', 'del', 's', 'ins'],
      ...['mark', 'sub', 'sup', 'kbd', 'small', 'abbr', 'q', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead'],
      ...['tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'a', 'img', 'picture', 'source', 'details', 'summary'],
      ...['figure', 'figcaption', 'input'],
    ],
    allowedAttributes: {
      ...Object.fromEntries(HEADINGS.map((h) => [h, ['id', 'align']])),
      a: ['href', 'title', 'id', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'align', 'loading'],
      source: ['srcset', 'media', 'type'],
      th: ['align', 'colspan', 'rowspan'],
      td: ['align', 'colspan', 'rowspan'],
      p: ['align'],
      div: ['align'],
      details: ['open'],
      ol: ['start'],
      abbr: ['title'],
      code: ['class'],
      blockquote: ['class'],
      input: ['type', 'checked', 'disabled'],
    },
    allowedClasses: {
      code: [/^language-[\w+#-]+$/],
      blockquote: ['alert', ...ALERTS.map((k) => `alert-${k}`)],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'], source: ['http', 'https'] },
    allowProtocolRelative: false,
    selfClosing: ['img', 'br', 'hr', 'input', 'source'],
    // Script, style and the like go with their content; anything else not allowed keeps its text.
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed', 'template'],
    transformTags: {
      a: (tag, attribs) => {
        const href = resolveUrl(attribs.href ?? '', linkBase);
        const out: Record<string, string> = { ...attribs, href };
        if (!href) delete out.href;
        if (/^https?:\/\//i.test(href)) {
          out.target = '_blank';
          out.rel = 'noopener noreferrer';
        } else {
          delete out.target;
          delete out.rel;
        }
        return { tagName: tag, attribs: out };
      },
      img: (tag, attribs) => {
        const src = resolveUrl(attribs.src ?? '', imageBase);
        const out: Record<string, string> = { ...attribs, loading: 'lazy' };
        if (src) out.src = src;
        else delete out.src;
        return { tagName: tag, attribs: out };
      },
      source: (tag, attribs) => {
        const srcset = (attribs.srcset ?? '')
          .split(',')
          .map((candidate) => {
            const [url, ...rest] = candidate.trim().split(/\s+/);
            const resolved = url ? resolveUrl(url, imageBase) : '';
            return resolved && /^https?:\/\//i.test(resolved) ? [resolved, ...rest].join(' ') : '';
          })
          .filter(Boolean)
          .join(', ');
        return { tagName: tag, attribs: { ...attribs, srcset } };
      },
      input: (tag, attribs) =>
        attribs.type === 'checkbox'
          ? { tagName: tag, attribs: { type: 'checkbox', disabled: '', ...(attribs.checked !== undefined ? { checked: '' } : {}) } }
          : { tagName: 'span', attribs: {} },
    },
  };
}

const parsers = new Map<boolean, Parser>();

/** Markdown (GitHub flavor, HTML allowed) to sanitized HTML. */
export function renderMarkdown(src: string, opts: RenderOptions = {}): string {
  const headingIds = opts.headingIds ?? true;
  let md = parsers.get(headingIds);
  if (!md) {
    md = createParser(headingIds);
    parsers.set(headingIds, md);
  }
  const imageBase = opts.imageBaseUrl ?? (opts.baseUrl ? (githubRawUrl(opts.baseUrl) ?? opts.baseUrl) : undefined);
  return sanitizeHtml(md.render(src ?? ''), sanitizeOptions(opts.baseUrl, imageBase));
}

/** Markdown to plain text (tags removed, entities decoded by the sanitizer), for summaries and search. */
export function markdownToText(src: string): string {
  const html = createParser(false).render(src ?? '');
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {}, nonTextTags: ['script', 'style', 'textarea', 'option'] })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
