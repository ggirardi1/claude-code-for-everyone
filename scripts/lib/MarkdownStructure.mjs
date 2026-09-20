/**
 * The language-independent skeleton of a markdown document.
 *
 * Two translations of the same document must have the same skeleton: the same
 * front matter keys, the same headings (level and order), the same number of
 * list items in the same places, the same paragraphs and code fences. Words
 * change, structure does not. Comparing skeletons is how the tooling proves,
 * deterministically, that a translation did not drop, merge or invent content.
 */
export class MarkdownStructure {
    /** @param {string[]} tokens */
    constructor(tokens) {
        this.tokens = tokens;
    }

    /** @param {string} markdown */
    static of(markdown) {
        const lines = markdown.replace(/\r\n/g, '\n').split('\n');
        const tokens = [];
        let index = 0;

        // Front matter: `---` on the first line, keys until the closing `---`.
        if (lines[0]?.trim() === '---') {
            const keys = [];
            index = 1;
            while (index < lines.length && lines[index].trim() !== '---') {
                const match = lines[index].match(/^([A-Za-z0-9_-]+)\s*:/);
                if (match) keys.push(match[1]);
                index++;
            }
            index++; // closing ---
            tokens.push(`frontmatter[${keys.join(',')}]`);
        }

        let inFence = false;
        let openBlock = null; // 'p' or 'li' while consecutive lines continue it

        for (; index < lines.length; index++) {
            const line = lines[index];
            const trimmed = line.trim();

            if (/^(```|~~~)/.test(trimmed)) {
                inFence = !inFence;
                if (inFence) tokens.push('code');
                openBlock = null;
                continue;
            }
            if (inFence) continue;

            if (trimmed === '') {
                openBlock = null;
                continue;
            }

            const heading = trimmed.match(/^(#{1,6})\s+\S/);
            if (heading) {
                tokens.push(`h${heading[1].length}`);
                openBlock = null;
                continue;
            }

            if (/^([-*+]|\d+[.)])\s+/.test(trimmed)) {
                tokens.push('li');
                openBlock = 'li';
                continue;
            }

            // Continuation of the previous line (hard-wrapped paragraph or list
            // item): translations wrap differently, so it never counts twice.
            if (openBlock) continue;

            tokens.push('p');
            openBlock = 'p';
        }

        return new MarkdownStructure(tokens);
    }

    /** @param {MarkdownStructure} other */
    equals(other) {
        return this.tokens.join(' ') === other.tokens.join(' ');
    }

    /**
     * Human-readable description of the first divergence, for error messages.
     *
     * @param {MarkdownStructure} other
     */
    describeDifference(other) {
        const max = Math.max(this.tokens.length, other.tokens.length);
        for (let i = 0; i < max; i++) {
            if (this.tokens[i] !== other.tokens[i]) {
                return `block #${i + 1}: expected "${this.tokens[i] ?? '(end)'}", got "${other.tokens[i] ?? '(end)'}" `
                    + `(${this.tokens.length} vs ${other.tokens.length} blocks)`;
            }
        }
        return 'identical';
    }
}
