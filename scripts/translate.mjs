#!/usr/bin/env node
/**
 * Regenerates every translation whose source changed (or that does not exist
 * yet) and updates translations.lock.json.
 *
 *   npm run translate            only what is stale or missing
 *   npm run translate -- --force everything, even if up to date
 *
 * Requires a logged-in Claude Code CLI (`claude login`). Set TRANSLATOR_COMMAND
 * to swap the model call for any command that reads stdin and prints stdout.
 */
import { Catalog, Lock } from './lib/Catalog.mjs';
import { Translator } from './lib/Translator.mjs';

class TranslateCommand {
    constructor(argv) {
        this.force = argv.includes('--force');
        this.catalog = Catalog.load();
        this.lock = Lock.load();
        this.translator = new Translator();
    }

    run() {
        let generated = 0;

        for (const pair of this.catalog.pairs()) {
            if (!pair.sourceExists()) {
                throw new Error(`Source ${pair.source} does not exist.`);
            }

            const source = pair.readSource();

            if (!this.force && this.isCurrent(pair, source)) {
                console.log(`= ${pair.id} (up to date)`);
                continue;
            }

            console.log(`> ${pair.id}`);
            const target = this.translator.translate(
                source,
                this.catalog.language(this.catalog.sourceLanguage),
                this.catalog.language(pair.language),
            );

            pair.writeTarget(target);
            this.lock.record(pair, source, target);
            this.lock.save(); // one pair at a time, so a crash keeps what was done
            generated++;
        }

        console.log(generated ? `\n${generated} translation(s) generated.` : '\nNothing to do.');
    }

    isCurrent(pair, source) {
        const entry = this.lock.entryFor(pair);
        return Boolean(entry)
            && pair.targetExists()
            && entry.source === Lock.hash(source)
            && entry.target === Lock.hash(pair.readTarget());
    }
}

try {
    new TranslateCommand(process.argv.slice(2)).run();
} catch (error) {
    console.error(`\nERROR: ${error.message}`);
    process.exit(1);
}
