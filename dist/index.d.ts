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
/** GitHub's heading slug: lower case, punctuation dropped, spaces to dashes. */
export declare function slug(text: string): string;
/** https://github.com/o/r/blob/ref/path → https://raw.githubusercontent.com/o/r/ref/path; null for anything else. */
export declare function githubRawUrl(url: string): string | null;
/** A link or image target resolved against `base`: absolute and fragment URLs as they are, relative ones joined. */
export declare function resolveUrl(raw: string, base: string | undefined): string;
/** Markdown (GitHub flavor, HTML allowed) to sanitized HTML. */
export declare function renderMarkdown(src: string, opts?: RenderOptions): string;
/** Markdown to plain text (tags removed, entities decoded by the sanitizer), for summaries and search. */
export declare function markdownToText(src: string): string;
