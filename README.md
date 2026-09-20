# Claude Code for everyone

**English** · [Português (Brasil)](README.pt-BR.md)

Claude Code comes configured out of the box to talk to programmers. It answers in jargon and assumes you know what to ask for: automated tests, access control, protection against SQL injection, a backup before touching the database.

People who don't program don't know these things exist, so they never ask. This package solves both sides of the problem with two text files:

- **Communication style** (`plain-language.md`): Claude starts explaining in everyday language, without jargon, saying what changed in practice rather than which code changed.
- **Guidelines** (`CLAUDE.md`): Claude starts following good engineering practices on its own, without you asking, the way a software engineer would. It becomes your development team, and you are the boss.

## Who it's for

For people who use Claude Code to build or maintain a system without being in the field: business owners, analysts, professionals from other areas who learned how to ask AI for things. If you are a programmer, it works too, but the guidelines were written with people who don't know what to demand in mind.

## What's in here

```
pt-BR/CLAUDE.md               engineering guidelines (Portuguese)
pt-BR/linguagem-simples.md    communication style (Portuguese)
en/CLAUDE.md                  engineering guidelines (English)
en/plain-language.md          communication style (English)
```

Pick the folder for your language. The content is the same in both; only the language changes.

## Installation

Both files go into your personal Claude folder, so they apply to all your projects. `~` is your user folder:

| System | Folder |
| --- | --- |
| Windows | `C:\Users\your-name\.claude\` |
| Mac | `/Users/your-name/.claude/` |
| Linux | `/home/your-name/.claude/` |

If the `.claude` folder doesn't exist, create it.

### 1. Communication style

Copy `plain-language.md` to `~/.claude/output-styles/` (create the folder if needed). Then open `~/.claude/settings.json` and point to the style by the name in the file's `name` field:

```json
{
  "outputStyle": "Plain language"
}
```

It takes effect from the next session (or after `/clear`).

### 2. Guidelines

Copy `CLAUDE.md` to `~/.claude/CLAUDE.md`. If you already have a `CLAUDE.md` there, add the content to what already exists instead of replacing it.

## The trap almost everyone falls into

By default, a custom response style erases Claude Code's software engineering instructions (reviewing its own work, watching the scope of the change, verifying what it did). In other words: it starts talking nicely and programming worse.

The line `keep-coding-instructions: true` in the style's header is what prevents this. It keeps the technical competence intact and changes only the way of speaking. If you adapt the file, don't remove that line.

## What this does not guarantee

This is guidance, not a lock. It greatly increases the chance of the pattern showing up, but it is not a deterministic guarantee: in a very long conversation, or after a context compaction, some rule may slip. For what truly needs to be guaranteed, there are Claude Code hooks, which run outside the model.

And the most important warning: this raises the floor, it doesn't replace you. Having the files is not a reason to stop asking questions or to accept everything without reading. If you didn't understand a decision, ask for it to be explained again.

## Living documents

These files will keep being adjusted as practice shows what works: a rule Claude ignores goes out, a rule that was missing goes in, confusing wording gets rewritten. Follow the repository to receive new versions. If you adapted the text to your case, keep your changes separate, so it's easy to reapply them on top of the new version.

## Languages

Portuguese is the source. English is generated from it automatically, and a checker in CI ensures the two never drift apart: if a Portuguese file changes, the build breaks until the translation is regenerated; if someone edits the translation by hand, the build breaks too.

To contribute, edit only the files in `pt-BR/` (or `README.pt-BR.md`) and run:

```bash
npm run translate
```

The command uses the Claude Code on your machine (`claude -p`, you need to be logged in) to translate, checks block by block that the translation has the same structure as the original, and updates `translations.lock.json`. To check without generating anything, `npm run check`.

## About

Created by [Guilherme Almeida Girardi](https://github.com/ggirardi1) as part of the AI and Claude training at [1Salto](https://1salto.com). MIT License.
