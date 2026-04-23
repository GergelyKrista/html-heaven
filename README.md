<div align="center">

# HTML Heaven

**Open-source home for single-file HTML5 apps.**
Tiny web apps made by people, running in your browser.

[htmlheaven.com](https://htmlheaven.com) · [Submit an app](https://htmlheaven.com/submit) · [Browse](https://htmlheaven.com/browse)

</div>

---

## What this is

HTML Heaven is a community hub for **self-contained HTML5 mini-applications** — a game, a pomodoro timer, a color picker, a language flashcard deck, a counter-pick tool, an AI "skill" as HTML. Anything that fits in one `.html` file and runs entirely in a browser.

The idea: you've probably prompted ChatGPT or Claude for "a single-file pomodoro in HTML" a dozen times. Those tiny apps are genuinely useful but end up rotting in your `Downloads/` folder. HTML Heaven is a place to put them, and a place to find other people's.

It's also a **fully open-source platform** — the apps are the repo. Every app lives under `apps/<slug>/` in this git tree. The live site rebuilds from `main` on every merge. There's no hidden database of content: what you see in the repo is what the site serves.

## Why "fully" open-source matters here

Lots of sites call themselves open-source when what they mean is "the frontend code is on GitHub." The actual content, moderation workflow, and submission pipeline are locked behind a private backend you can't see.

HTML Heaven is the opposite. The apps, the review flow, the site code, and the deployment config all live in this repository. You can:

- Clone the repo and see the entire catalog of apps
- Read the CI action that auto-reviews new submissions
- Run the site locally against your own D1 database
- Fork it and host your own version

## Features

- **Browse** — category pills, tag filters, grid or grouped view, search, sort by newest / A-Z / most liked
- **Submit flow** — drag & drop an HTML file, fill a title + category + tags, done. Creates a pull request on this repo with the file + metadata
- **Auto-reviewer** — GitHub Action scans every submission PR for leaked secrets, trackers, cryptominers, external scripts, and phishing patterns. Flags suspicious ones for manual review, blocks PRs with obvious secrets
- **Social profiles** at `/u/<handle>` — avatar, bio, location, website, GitHub/X/Reddit links, submitted apps, likes received, followers
- **Likes, favorites, comments** — one like per user per app (enforced by the DB), comments cross-posted to the app's original GitHub PR so the author gets notified
- **Preview modal** — click any card to see the app's details, submitter, and like count before launching
- **OG / Twitter previews** — sharing a link to the site / an app / a profile generates a custom social card
- **Auto-deploy** — push to `main`, Cloudflare Pages rebuilds, live in ~90s

## How to contribute

There are two paths. Pick whichever fits.

### Path 1 — Upload an app (no git required)

You have a single-file HTML app you'd like to share? Takes 30 seconds.

1. Go to [htmlheaven.com/submit](https://htmlheaven.com/submit)
2. Sign in with GitHub
3. Drag your `.html` file onto the upload area
4. Fill in a title, pick a category, optionally add tags
5. Click Submit

That creates a pull request on this repo with your file + metadata. The auto-reviewer checks it, the admin merges it if it's clean, and your app goes live at `htmlheaven.com/apps/<your-slug>/` within a couple of minutes.

### Path 2 — Work on the platform itself

If you want to ship features to the site, open a PR here the usual way. Things I'd happily take help on:

- **Activity feed** — see what people you follow are submitting and liking
- **Notifications** — when someone comments on your app or follows you
- **"Remix" flow** — one-click fork an existing app into a new submission
- **In-browser editor** — code + live preview before submitting
- **Discover page** — trending, new-this-week, by-category highlight reels
- **Federated login** — Google / email-link alongside GitHub
- **Better test coverage**

See [Local development](#local-development) below.

## The submit + review flow

```mermaid
flowchart TD
    A[User hits Submit]:::user --> B{Signed in<br>with GitHub?}
    B -- no --> C[Sign in with GitHub]:::user
    C --> D[Drag .html file +<br>fill title, category, tags]:::user
    B -- yes --> D
    D --> E[POST /api/submit]:::app
    E --> F[Validate: file size,<br>slug uniqueness,<br>rate limit]:::app
    F --> G[Create branch<br>submission/&lt;slug&gt;-&lt;ts&gt;]:::gh
    G --> H[Commit<br>apps/&lt;slug&gt;/index.html<br>+ app.json]:::gh
    H --> I[Open pull request]:::gh
    I --> J[Auto-reviewer runs<br>review-submission.yml]:::ci
    J --> K{Verdict?}
    K -- clean --> L["🟢 auto-review:clean<br>label applied"]:::ci
    K -- warnings --> M["🟡 auto-review:<br>needs-review label"]:::ci
    K -- critical --> N["🔴 auto-review:critical<br>PR check FAILS"]:::ci
    L --> O[Admin merges]:::admin
    M --> O
    N --> P[Admin reviews<br>findings manually]:::admin
    P --> O
    O --> Q[Cloudflare Pages<br>rebuilds from main]:::deploy
    Q --> R[App live at<br>htmlheaven.com/apps/&lt;slug&gt;/]:::done

    classDef user fill:#1e293b,stroke:#94a3b8,color:#f8fafc
    classDef app fill:#0f172a,stroke:#22d3ee,color:#f8fafc
    classDef gh fill:#1f2937,stroke:#a78bfa,color:#f8fafc
    classDef ci fill:#262626,stroke:#fbbf24,color:#f8fafc
    classDef admin fill:#3f1d1d,stroke:#ef4444,color:#f8fafc
    classDef deploy fill:#052e2a,stroke:#10b981,color:#f8fafc
    classDef done fill:#052e16,stroke:#4ade80,color:#f8fafc
```

## The view flow

```mermaid
flowchart LR
    A[Visitor lands on<br>htmlheaven.com]:::user --> B{Logged in?}
    B -- no --> C[Browse, view apps,<br>read profiles]:::anon
    B -- yes --> D[All of the above<br>+ like, favorite,<br>comment, follow]:::auth
    C --> E[Click a card]:::user
    D --> E
    E --> F[Preview modal:<br>submitter, bio,<br>like count]:::app
    F --> G[Click Launch]:::user
    G --> H[Opens<br>apps/&lt;slug&gt;/index.html<br>in new tab]:::app
    H --> I[App runs in browser<br>— sandboxed iframe<br>with back-to-site badge]:::app

    classDef user fill:#1e293b,stroke:#94a3b8,color:#f8fafc
    classDef anon fill:#1f2937,stroke:#64748b,color:#f8fafc
    classDef auth fill:#0f172a,stroke:#22d3ee,color:#f8fafc
    classDef app fill:#262626,stroke:#fbbf24,color:#f8fafc
```

## Project layout

```
html-heaven/
├── apps/                          # The actual HTML5 apps (the catalog)
│   ├── pomodoro-timer/
│   │   ├── index.html             # Self-contained single file
│   │   └── app.json               # Title, slug, tags, category, author
│   └── …
├── scripts/
│   ├── generate-manifest.ts       # apps/ → public/apps/ (injects back badge,
│   │                              #   generates src/generated/manifest.json)
│   └── review-submission.mjs      # Static analysis used by CI
├── schema.sql                     # D1 schema
├── src/
│   ├── app/                       # Next.js App Router pages
│   │   ├── page.tsx               # Home
│   │   ├── browse/
│   │   ├── u/[handle]/            # Public profile
│   │   ├── app/[slug]/            # App detail + iframe player
│   │   ├── submit/                # Submit form
│   │   ├── settings/profile/      # Edit own profile
│   │   └── api/                   # Route handlers
│   ├── components/                # React UI
│   └── lib/
│       ├── apps.ts                # Manifest reader + top-apps query
│       ├── categories.ts          # Category/tag definitions
│       ├── db.ts                  # D1 helpers
│       ├── users.ts               # Profile / follow helpers
│       └── github.ts              # Octokit wrappers (create submission PR,
│                                  #   auto-merge delete PRs, post comments)
└── .github/workflows/
    ├── deploy.yml                 # Build + deploy to Cloudflare Pages
    └── review-submission.yml      # Auto-review incoming submission PRs
```

## Tech stack

- **Framework** — [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- **Styling** — [Tailwind CSS v4](https://tailwindcss.com)
- **Auth** — [NextAuth v5](https://authjs.dev) with GitHub provider
- **Database** — [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge) for favorites, likes, comments, follows, profiles, submission records, soft-delete flags
- **Storage** — app files live in the git repo; copied to `public/apps/` at build time
- **Deploy** — [OpenNext](https://opennext.js.org/cloudflare) → Cloudflare Pages / Workers
- **CI** — GitHub Actions (auto-review submissions, build + deploy on merge)

Everything runs on Cloudflare free tiers. Total infrastructure cost: the domain registration.

## Local development

```bash
# 1. Clone and install
git clone https://github.com/GergelyKrista/html-heaven.git
cd html-heaven
npm install

# 2. Environment — see .env.example for the full list.
# Minimum for local dev:
cp .env.example .env.local
# Fill in: AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, AUTH_SECRET

# 3. Generate the static manifest from apps/
npm run generate-manifest

# 4. Run the dev server
npm run dev           # → http://localhost:3000
```

Note that D1-dependent features (likes, comments, profiles) won't work in `npm run dev` without a local D1 binding. Use `npx wrangler pages dev` with a wrangler.toml-configured binding if you want the full experience.

## Adding an app directly (for maintainers)

If you're bypassing the UI for some reason:

```bash
mkdir apps/my-new-app
# Drop your index.html in apps/my-new-app/
cat > apps/my-new-app/app.json << 'EOF'
{
  "title": "My New App",
  "slug": "my-new-app",
  "description": "What it does in one sentence.",
  "author": "YourName",
  "tags": ["tools", "calculator"],
  "dateAdded": "2026-04-24",
  "thumbnail": "thumbnail.png",
  "featured": false
}
EOF

# Regenerate manifest + back-badge-inject the HTML
npm run generate-manifest

# Commit + PR as normal
```

## Security & review posture

Every incoming submission PR runs through `.github/workflows/review-submission.yml`, which invokes `scripts/review-submission.mjs` to scan the added HTML for:

- **Critical** — OpenAI/Anthropic/GitHub/AWS/Google/Slack/Cloudflare tokens, private key blocks, cryptominer scripts, forms that POST to external hosts, oversize files
- **Warning** — external scripts/iframes/imports from unvetted hosts, trackers (GA, FB Pixel, Segment, Mixpanel, PostHog, etc.), `fetch` or XHR to external origins, heavy `eval`/`Function`/`atob` use, hidden iframes, auto-redirects to external URLs
- **Info** — resources from known safe CDNs (jsdelivr, unpkg, cdnjs, Google Fonts)

The bot posts a structured comment on the PR with findings and applies one of three labels: `auto-review:clean`, `auto-review:needs-review`, or `auto-review:critical`. Critical findings make the CI check fail, preventing accidental merges.

This is first-pass automation, not a substitute for human review. The admin still reviews anything non-trivial.

## License

MIT. Do whatever you want with the code. For individual apps under `apps/`, each submitter retains the license they chose (most are MIT by default — if an app has a LICENSE file in its folder, that one governs).

## Credits

Built by [@GergelyKrista](https://github.com/GergelyKrista). Community-powered by everyone who's uploaded an app — see the [contributors](https://github.com/GergelyKrista/html-heaven/graphs/contributors).
