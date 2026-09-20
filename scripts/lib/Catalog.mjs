import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root, regardless of where the script is invoked from. */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const CONFIG_FILE = join(ROOT, 'translations.config.json');
const LOCK_FILE = join(ROOT, 'translations.lock.json');

/** One translation pair: a source file and where its translation lives. */
export class TranslationPair {
    /**
     * @param {string} source relative path of the source document
     * @param {string} language target language code
     * @param {string} target relative path of the translated document
     */
    constructor(source, language, target) {
        this.source = source;
        this.language = language;
        this.target = target;
    }

    get id() {
        return `${this.source} -> ${this.target}`;
    }

    sourceExists() {
        return existsSync(join(ROOT, this.source));
    }

    targetExists() {
        return existsSync(join(ROOT, this.target));
    }

    readSource() {
        return readFileSync(join(ROOT, this.source), 'utf8');
    }

    readTarget() {
        return readFileSync(join(ROOT, this.target), 'utf8');
    }

    /** @param {string} content */
    writeTarget(content) {
        writeFileSync(join(ROOT, this.target), content, 'utf8');
    }
}

/** A language and the exact replacements a translation into it must apply. */
export class Language {
    /**
     * @param {string} code e.g. "en"
     * @param {string} name e.g. "English"
     * @param {Record<string, string>} substitutions file names and labels that change with the language
     */
    constructor(code, name, substitutions) {
        this.code = code;
        this.name = name;
        this.substitutions = substitutions;
    }
}

/** Every translation pair declared in translations.config.json. */
export class Catalog {
    constructor(config) {
        this.config = config;
    }

    static load() {
        return new Catalog(JSON.parse(readFileSync(CONFIG_FILE, 'utf8')));
    }

    get sourceLanguage() {
        return this.config.sourceLanguage;
    }

    /** @param {string} code */
    language(code) {
        const language = this.config.languages[code];
        if (!language) throw new Error(`Language "${code}" is not declared in translations.config.json.`);
        return new Language(code, language.name, language.substitutions ?? {});
    }

    /** @returns {TranslationPair[]} */
    pairs() {
        return this.config.documents.flatMap((document) =>
            Object.entries(document.targets).map(
                ([language, target]) => new TranslationPair(document.source, language, target),
            ),
        );
    }
}

/**
 * Fingerprints of every generated translation, committed next to the files.
 *
 * For each pair it records the hash of the source it was generated from and
 * the hash of what was generated. That is what lets `check` tell apart a
 * translation that is stale (source changed) from one that was edited by hand
 * (target changed), without calling any model.
 */
export class Lock {
    constructor(entries) {
        this.entries = entries;
    }

    static load() {
        return new Lock(existsSync(LOCK_FILE) ? JSON.parse(readFileSync(LOCK_FILE, 'utf8')) : {});
    }

    /** @param {string} content */
    static hash(content) {
        return 'sha256:' + createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');
    }

    /** @param {TranslationPair} pair */
    entryFor(pair) {
        return this.entries[pair.id] ?? null;
    }

    /**
     * @param {TranslationPair} pair
     * @param {string} source
     * @param {string} target
     */
    record(pair, source, target) {
        this.entries[pair.id] = {
            source: Lock.hash(source),
            target: Lock.hash(target),
            generatedAt: new Date().toISOString(),
        };
    }

    save() {
        const sorted = Object.fromEntries(Object.entries(this.entries).sort(([a], [b]) => a.localeCompare(b)));
        writeFileSync(LOCK_FILE, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
    }
}
