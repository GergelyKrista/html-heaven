# HTML Skills — Design Doc

**Status:** Draft v2 (simplified per Gergely's direction)
**Date:** 2026-06-07
**Branch:** `feature/html-skills`

## 1. Vision

**The future of skills is HTML files — and the HTML file needs no companion
format.** No SKILL.md, no embedded manifest, no export step. A well-made HTML
reference page serves both audiences as-is:

- a **human** opens the URL and sees a cheatsheet, a guide, a reference —
  visual, styled, appropriate to its topic;
- an **LLM** reads the same URL and uses it as a skill.

*A Java cheatsheet becomes a skill for the LLM but stays a cheatsheet for the
user.* One artifact, two readers, zero conversion.

htmlheaven.com is the natural home for this: it already hosts single-file
HTML pages, has a PR review pipeline, community curation (likes/comments),
and an `ai-skill` category. Skills don't need a new format — they need a
**trusted, reviewed, discoverable place to live**. That's the product.

## 2. Principles

1. **The HTML is the skill.** Agents fetch the raw page
   (`/apps/<slug>/index.html`) and read it directly. No derived formats in v1.
2. **The metadata is the review.** A skill's name, description, and tags are
   the app's existing submission metadata — written by the author, checked in
   PR review. The review *is* what makes a skill's metadata trustworthy; no
   self-declared manifest can give you that.
3. **Human-first visualization is a requirement, not a nicety.** A skill must
   render as a genuinely good page for its topic (a cheatsheet looks like a
   cheatsheet). Pages that are only machine-text dumps don't pass review;
   pages whose content only exists after heavy JS don't pass either (the raw
   HTML must carry the content, since that's what the LLM reads).
4. **Zero author burden.** If you can make a good HTML reference page, you've
   made a skill. Nothing extra to learn.

## 3. What marks an app as a skill

A boolean on the app's reviewed metadata — set by the author at submission
("This page is also an LLM skill") and confirmed in PR review:

- `app.json` gains `"skill": true`;
- the existing submit form gets the checkbox;
- the build-time manifest generator picks it up like every other field.

Why a flag and not a category: a Java cheatsheet lives in **learning**, a
color-tool reference might live in **tools** — skill-ness is orthogonal to
category. The existing `ai-skill` category remains for content that is
*primarily* an agent context pack; the flag is what unifies them all into the
skills catalog. (Migration: existing `ai-skill` apps get `skill: true`
mechanically.)

## 4. Discovery — the one new machine-facing surface

Agents need two things the raw HTML can't provide: *finding* skills and
knowing *when to use* them. Both come from already-reviewed metadata:

### 4.1 `/skills/index.json`
Build-time generated catalog: for each skill-flagged app — `title`,
`description` (this is the "when to use" signal — review enforces that skill
descriptions say what the page is useful *for*), `tags`, `author`, and the
direct content URL (`https://htmlheaven.com/apps/<slug>/index.html`).

### 4.2 `/llms.txt`
The emerging convention for telling LLMs what a site offers — a short
markdown-ish file at the root: what htmlheaven is, where the catalog lives,
and the list of skills with one-line descriptions and direct URLs.

That's the entire machine surface. Everything else is the HTML itself.

## 5. Site UX

- **`/skills`** — human-facing skills home: grid of skill-flagged apps
  (reuses AppGrid), search + tag filter, short manifesto header ("these pages
  are skills — point your agent at any of them").
- **Skill badge** on cards (⚡) wherever skill-flagged apps appear in grids.
- **App page ribbon** for skill-flagged apps: a small "Also an LLM skill" box
  with the **direct content URL + copy button** and a one-line usage example
  (*"Read https://htmlheaven.com/apps/java-cheatsheet/index.html and apply
  it."*). This is the whole human→agent handoff.
- **Submit form**: the "This page is also an LLM skill" checkbox, with a hint
  that the description should say what the page is useful for.

## 6. Review guidelines (the quality gate)

Added to the reviewer checklist for skill-flagged submissions:

1. Renders as a genuinely good human page for its topic.
2. **The full content must be present as text in the file itself** — either
   as HTML markup *or* as embedded structured data (a JS object the page
   renders from is fine; the seed-skill experiment showed agents read
   embedded data *better* than scattered markup). What fails: content
   fetched from the network or generated at runtime. "Readable with JS
   disabled" is the wrong proxy — the test is "is every fact in the bytes
   of the file."
3. Description says what the page is *useful for* (the agent trigger signal).
4. Content is accurate enough to teach — a wrong cheatsheet is worse as a
   skill than as a page, because agents act on it.

## 7. Rollout

1. **Seed skill** — convert `coding-cheatsheet.html` (already on the site as
   an app) into the first flagged skill; verify an LLM can genuinely use it
   from the raw URL.
   > **✅ Done 2026-06-07.** Experiment: a fresh agent given only the raw
   > 251 KB HTML file answered 4 reference questions with **9/9 verbatim-
   > correct quotes** (18 languages enumerated; Git undo commands, Python
   > type-conversion, and the full Java `Person` class quoted exactly).
   > Agent's self-assessed usability: **8/10** — and it reported the
   > embedded `codeData` JS object was *easier* to consume than HTML markup
   > would have been. Sole caveat: large files cost context. Thesis holds.
2. **`skill` flag plumbing** — app.json field → manifest generator → types →
   submit-form checkbox.
3. **`/skills` view + card badge + app-page ribbon.**
4. **`/skills/index.json` + `/llms.txt`** (build-time, from existing data).
5. Flag existing `ai-skill` apps; announce.

## 8. Future (explicitly not v1)

- **`.md` twin** (`/skills/<slug>.md`): server-derived markdown view as a
  token-cost optimization (~10–30% cheaper for agents than HTML). Shelved —
  "just let Claude read the HTML" is the v1 bet; add only if token cost
  proves to matter in practice.
- **Version history** for skills (apps are effectively immutable post-merge).
- **Content hashes** in the catalog so agents can pin a skill version.
- **ArcH tie-in** — the parked generator returns as the skill authoring tool:
  "describe what the skill should teach" → a conforming human-first page.

## 9. Summary

No new format. A skill is a reviewed, well-visualized HTML page plus a flag.
The site's existing metadata — passed through human review — is the skill's
metadata. The only new machine surface is discovery (`/skills/index.json`,
`/llms.txt`). The human sees a cheatsheet; the agent, reading the very same
bytes, gains a skill.
