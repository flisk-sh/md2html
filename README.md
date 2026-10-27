# md2html

GitHub-flavored Markdown, including the HTML that READMEs carry, to HTML that is safe to put in a page.

```ts
import { renderMarkdown } from '@flisk-sh/md2html';

const html = renderMarkdown(readme, { baseUrl: 'https://github.com/owner/repo/blob/main/README.md' });
```

It is not a new parser. It is [markdown-it](https://github.com/markdown-it/markdown-it) for rendering and [sanitize-html](https://github.com/apostrophecms/sanitize-html) for safety, configured the way GitHub renders a README, plus tests that pin it down:

- **GitHub flavor:** tables (with `align`), strikethrough, autolinks, task lists, heading ids like GitHub's (`#getting-started`, `#getting-started-1`), and alerts (`> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`).
- **README HTML:** `<p align="center">`, `<picture>` and `<source>`, badges, `<details>`, `<sub>`, `<kbd>` and tables written in HTML render as HTML, not as escaped text.
- **Safe:** an allowlist of tags and attributes; no scripts, styles, frames, forms, event handlers or `javascript:`/`data:` URLs; protocol-relative URLs dropped; external links get `target="_blank" rel="noopener noreferrer"`.
- **Repository-aware URLs:** with `baseUrl` set to a file on GitHub, relative links resolve to that file's folder and relative images to `raw.githubusercontent.com`.

## API

| Function | Does |
| --- | --- |
| `renderMarkdown(src, { baseUrl?, imageBaseUrl?, headingIds? })` | Markdown to sanitized HTML |
| `markdownToText(src)` | Markdown to plain text, for summaries and search |
| `slug(text)` | GitHub's heading slug |
| `githubRawUrl(url)` | A `github.com/.../blob/...` URL as its `raw.githubusercontent.com` URL |
| `resolveUrl(href, base)` | A link resolved the way `renderMarkdown` does |

## Install

From GitHub, pinned to a tag:

```bash
bun add github:flisk-sh/md2html#v0.1.0
```

## Checks

`bun run test` runs the unit tests, the injection tests and the fixture tests: real READMEs in `tests/fixtures/` must render with no HTML left escaped, nothing executable, and only absolute URLs. CI runs them, the typecheck and a check that `dist/` matches `src/` on every push.

Used by [Helpdock](https://github.com/flisk-sh/helpdock). MIT.
