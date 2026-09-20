import { spawnSync } from 'node:child_process';
import { MarkdownStructure } from './MarkdownStructure.mjs';

/**
 * Translates one markdown document with Claude Code in non-interactive mode
 * (`claude -p`), using whatever account the CLI is logged into: no API key.
 *
 * The model only rewrites the words. After every attempt the skeleton of the
 * result is compared with the source; anything that dropped, merged or added a
 * block is rejected and retried, so what gets written is guaranteed to mirror
 * the source block by block.
 */
export class Translator {
    static ATTEMPTS = 3;

    /**
     * @param {object} options
     * @param {string} options.command shell command that reads the prompt on stdin and prints the translation
     */
    constructor({ command = process.env.TRANSLATOR_COMMAND ?? 'claude -p --output-format text' } = {}) {
        this.command = command;
    }

    /**
     * @param {string} source markdown in the source language
     * @param {import('./Catalog.mjs').Language} from
     * @param {import('./Catalog.mjs').Language} to
     * @returns {string} markdown in the target language, structurally identical
     */
    translate(source, from, to) {
        const expected = MarkdownStructure.of(source);
        let lastProblem = '';

        for (let attempt = 1; attempt <= Translator.ATTEMPTS; attempt++) {
            const output = this.run(this.prompt(source, from, to, lastProblem));
            const actual = MarkdownStructure.of(output);

            if (expected.equals(actual)) {
                return output.endsWith('\n') ? output : output + '\n';
            }

            lastProblem = expected.describeDifference(actual);
            console.warn(`  attempt ${attempt}: structure mismatch at ${lastProblem}`);
        }

        throw new Error(`Translation never matched the source structure after ${Translator.ATTEMPTS} attempts (${lastProblem}).`);
    }

    /** @param {string} input */
    run(input) {
        const result = spawnSync(this.command, {
            input,
            shell: true,
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
            env: { ...process.env, CLAUDECODE: undefined },
        });

        if (result.error) throw result.error;
        if (result.status !== 0) {
            throw new Error(`"${this.command}" exited with ${result.status}:\n${result.stderr || result.stdout}`);
        }

        return Translator.stripFence(result.stdout.trim());
    }

    /** Models sometimes wrap the whole answer in a ```markdown fence; unwrap it. */
    static stripFence(text) {
        const match = text.match(/^```[a-z]*\n([\s\S]*?)\n```$/);
        return match ? match[1] : text;
    }

    prompt(source, from, to, previousProblem) {
        const substitutions = Object.entries(to.substitutions)
            .map(([search, replace]) => `  - "${search}" becomes "${replace}"`);

        return [
            `You are translating a markdown document from ${from.name} to ${to.name}.`,
            'The document configures an AI coding assistant for a person who is not a programmer.',
            '',
            'Rules:',
            '- Output ONLY the translated document. No preamble, no explanation, no code fence around it.',
            '- Preserve the structure exactly: same front matter keys (translate only their values), same headings in the same order and level, same number of list items, same paragraphs, same code blocks. Do not merge, split, drop or add anything.',
            `- The document may tell the assistant which language to reply in ("write in ${from.name}"). In the translation that instruction must say ${to.name}, because the reader speaks ${to.name}.`,
            '- Keep file names, paths, commands, tool names, product names and code untouched, except for these exact replacements, which you must apply everywhere they appear (including inside links, code and tables):',
            ...substitutions,
            '- Exception to the replacements: a path that starts with a language folder (such as pt-BR/ or en/) is literal and never changes, and a file name that is explicitly described as the source-language file (such as README.pt-BR.md) stays as it is.',
            '- If the first lines are a language switcher (links to the same document in other languages), make the current language the bold plain text and the other languages the links, and fix the link targets so they point to the right files.',
            '- Grammatical gender in the source is not the gender of the person. When the source refers to "the person" with gendered pronouns, use neutral pronouns in the target ("they/them" in English).',
            '- Keep the tone: direct, plain, second person.',
            previousProblem ? `\nYour previous attempt was rejected because its structure differed from the source at ${previousProblem}. Fix that.` : '',
            '',
            '--- DOCUMENT START ---',
            source,
            '--- DOCUMENT END ---',
        ].join('\n');
    }
}
