#!/usr/bin/env node
/**
 * Proves that every translation mirrors its source. Runs in CI on every push
 * and pull request, and fails the build when a language would drift:
 *
 *   - a translation is missing;
 *   - the source changed after the translation was generated (stale);
 *   - the translation was edited by hand (its hash no longer matches the lock);
 *   - the two documents do not share the same structure block by block.
 *
 * No model is called here: it is hashes and markdown parsing only, so the
 * result is deterministic.
 */
import { Catalog, Lock } from './lib/Catalog.mjs';
import { MarkdownStructure } from './lib/MarkdownStructure.mjs';

class CheckCommand {
    constructor() {
        this.catalog = Catalog.load();
        this.lock = Lock.load();
        this.problems = [];
    }

    run() {
        for (const pair of this.catalog.pairs()) {
            const problem = this.inspect(pair);
            console.log(`${problem ? 'FAIL' : ' ok '} ${pair.id}${problem ? `\n       ${problem}` : ''}`);
            if (problem) this.problems.push(pair.id);
        }

        if (this.problems.length) {
            console.error(`\n${this.problems.length} translation(s) out of sync. Edit only the source files and run: npm run translate`);
            process.exit(1);
        }

        console.log('\nAll translations are in sync.');
    }

    /** @returns {string|null} what is wrong, or null when the pair is fine */
    inspect(pair) {
        if (!pair.sourceExists()) return `source ${pair.source} is missing`;
        if (!pair.targetExists()) return `translation ${pair.target} is missing`;

        const entry = this.lock.entryFor(pair);
        if (!entry) return 'not recorded in translations.lock.json';

        const source = pair.readSource();
        const target = pair.readTarget();

        if (entry.source !== Lock.hash(source)) return `${pair.source} changed after the translation was generated`;
        if (entry.target !== Lock.hash(target)) return `${pair.target} was edited by hand; edit ${pair.source} instead`;

        const expected = MarkdownStructure.of(source);
        const actual = MarkdownStructure.of(target);
        if (!expected.equals(actual)) return `structure differs at ${expected.describeDifference(actual)}`;

        return null;
    }
}

new CheckCommand().run();
