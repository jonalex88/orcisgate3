# OrcisGate

A real-time multiplayer D&D Beyond combat table, in the spirit of Baldur's Gate 3's action-economy
UI — original design and assets, no BG3 art or text is reused. A Dungeon Master runs encounters
(monster stat blocks imported from D&D Beyond) while players see their own live character
dashboard, all sharing one activity feed of dice rolls.

## Status

The full loop works end-to-end: join a game by key, DM imports monster stat blocks + an encounter,
rolls initiative, runs combat from a BG3-style action hotbar; players connect their D&D Beyond
character and get the same hotbar treatment for their own actions; everyone sees rolls live via
Server-Sent Events, with DM rolls hidden from players unless explicitly revealed. See
[`packages/domain/README.md`](packages/domain/README.md) for the D&D Beyond integration notes (no
official API exists — what's used, how, and its known gaps) and the sections below for what's
simplified in this pass.

## How it works

1. Open the site → enter a shared **game key** (any string the table agrees on) → check
   **"I am the Dungeon Master"** if you're running the session.
2. **Players** connect their D&D Beyond character (public characters only for now — paste the
   character URL/id, or its JSON directly). They get an action-economy dashboard with a BG3-style
   hotbar for their actions/spells, a shared roll log, and see whatever mood image the DM sets.
3. **The DM** pastes a monster-stats JSON (from D&D Beyond's Encounter Builder/monster page) to
   add monsters to a **permanent, shared library** — every monster only ever needs to be pasted
   once, ever, across every game. Then pastes an encounter export; any monster it references that's
   already in the library resolves automatically. Rolling initiative and running combat happens
   from the same hotbar-driven stat block view as players get for their characters.
4. Dice: click a die face in the Quick Dice tray to queue N of that die, click Roll to resolve them
   all at once — or click an action in the hotbar for a quick generic d20 roll. Either way, it
   posts to everyone's shared roll log in real time.

## Structure

```
apps/web         React + Vite + TypeScript + Tailwind — join screen, DM view, player view
apps/server      Express + TypeScript — D&D Beyond proxy, persistent monster library (SQLite),
                 in-memory game rooms + Server-Sent Events broadcast
packages/domain  Shared types, character/monster/encounter models, DDB → domain mapping, dice
```

## Running locally

```sh
npm install
npm run dev:server   # http://localhost:3001 (builds packages/domain first)
npm run dev:web      # http://localhost:5173 (builds packages/domain first)
```

Requires Node ≥24 (uses the built-in `node:sqlite` module — no native dependencies to compile).
`packages/domain` is consumed via its built `dist/`, not live TypeScript source, so editing domain
code while the dev servers are already running needs a re-run of `npm run build -w
@orcisgate/domain` (or just restart `dev:web`/`dev:server`, which rebuild it automatically) to pick
up the change — there's no cross-package hot reload yet.

Only public D&D Beyond characters and monster/encounter data you have access to in D&D Beyond's
Encounter Builder can be fetched live; everything else works via pasting JSON copied from
DevTools (see `packages/domain/README.md` for exactly which network request to copy).

## Known simplifications in this pass

Documented rather than silently glossed over:

- **Game rooms are in-memory only.** A server restart loses who's connected, the active encounter,
  and the round/turn counter — but never monster data (SQLite) or character data (fetched
  fresh/cached). Persisting room state too is a natural next step once this shape has been used
  for a real session.
- **No accounts or real access control.** The game key is entirely trust-based — this is designed
  for a group who already trust each other at the same table, not a public multi-tenant product.
  The "I am the Dungeon Master" checkbox does set a per-browser flag (checked before the DM view's
  data even loads) so a stale bookmark or shared link can't *accidentally* land someone on the DM
  view — but it's trivially bypassable via devtools by anyone who actually wants to, by design;
  it stops accidents, not determined access.
- **Rolls are client-computed and trusted**, not re-rolled/verified server-side — matches the
  spec's described click-to-roll UX; this isn't an anti-cheat system.
- **One active encounter at a time per game**, loaded by pasting its JSON — there's no saved
  "library of encounters to pick from" UI yet (the spec's "DM sees a list of uploaded encounters"),
  just load/exit. Monsters *do* persist permanently; encounters currently don't. If an encounter
  references a monster the shared library doesn't have yet, the DM gets a banner naming exactly
  which one(s) — pasting the stat block there re-resolves the same encounter automatically,
  without needing to re-paste the whole thing.
- **The initiative pane and "Roll Initiative" both use who's actually connected to the game**, not
  the encounter's own imported player list (which is often a stale, unrelated snapshot from
  whenever the DM originally built the encounter in D&D Beyond — confirmed by testing against a
  real export). Connecting/disconnecting a player's browser tab updates the roster live for
  everyone, with a short grace period on disconnect so a page refresh doesn't look like someone
  leaving and rejoining, and any initiative they'd already rolled survives the reconnect.
- **Player initiative is still a flat d20** when the DM rolls for the whole encounter (no Dex
  modifier — the room doesn't hold live character ability scores). A player can still roll their
  own initiative correctly via the dice tray; it'll show properly in the roll log either way.
- **The initiative pane doesn't show connected players' live current HP** — that's still a
  follow-up; it shows presence and initiative, not health, for players (monsters do show HP).
- **Hotbar actions roll a generic d20**, not action-specific damage/attack dice — D&D Beyond
  doesn't give structured dice notation for most actions (free-text descriptions instead), so
  auto-rolling the "right" dice per action needs text parsing that isn't built yet.
- **Monster stat blocks don't show alignment/size/type/challenge rating** — D&D Beyond references
  those via lookup tables this app doesn't have a confirmed mapping for; showing a guessed value
  would be worse than not showing one. See `packages/domain/README.md`.
- **Mood images** are real photos (in `apps/web/public/scenes`) rather than the placeholder
  gradients from earlier in this project — the DM can broadcast any of them to the whole table.
  Adding more is just dropping a file in that folder and adding an entry to
  `apps/web/src/features/table/scenes.ts`.

## Testing

```sh
npm test
```

## Building

```sh
npm run build
```

## Deploying

Optimized for a **single-service deploy** (e.g. Railway): `npm run build` builds
`packages/domain` → `apps/server` → `apps/web` in order, and `npm start`
(`node apps/server/dist/index.js`) runs one Express process that serves both the JSON API
(`/api/*`) and the built SPA (everything else, with a fallback to `index.html` for client-side
routes) — see the static-serving block in `apps/server/src/app.ts`. One origin, no CORS to
configure, no separate deploy to keep in sync.

Requires:
- **Node ≥24** — pinned via `engines` in `package.json` and `.node-version` (needed for the
  built-in `node:sqlite` module).
- **A persistent volume for the SQLite file.** The default filesystem on most PaaS platforms is
  ephemeral and gets wiped on every deploy/restart, which would silently break the "paste a
  monster once, ever" guarantee the monster library depends on. Mount a volume and point the
  `DB_PATH` environment variable at a path on it (e.g. `/data/orcisgate.db`).
- `PORT` is read from the environment automatically (most platforms, including Railway, set this
  for you). `WEB_ORIGIN` only matters for local dev, where the Vite dev server and the API run on
  different ports — it's unused once both are served from the same origin in production.

A `railway.json` at the repo root configures the build/start commands and health check
(`/api/health`) for Railway specifically. Two deliberate deviations from the obvious commands,
both worth knowing about if the build ever needs troubleshooting:

- **`npm install`, not `npm ci`.** Railway's build mounts a persistent `node_modules/.cache`
  directory as a build cache. `npm ci` does a full wipe-and-reinstall of `node_modules`, which
  tries to `rmdir` that mounted path and fails with `EBUSY`. `npm install` doesn't do the full
  wipe, so it doesn't hit the conflict.
- **Clearing `node_modules` (except `.cache`) and `package-lock.json` before installing.**
  `package-lock.json` in this repo was generated on Windows, so native-binary optional
  dependencies (`lightningcss`, `esbuild`, `@rollup/rollup-*`) only have a fully-resolved lockfile
  entry for the Windows variant — the Linux ones Railway's build needs aren't reliably fetched
  from a lockfile generated on a different OS (a long-standing, widely-reported npm behavior with
  cross-platform optional dependencies, not specific to this project). Railway also persists
  `node_modules` itself across builds for speed, so merely deleting the lockfile isn't enough —
  npm sees the already-installed (wrong-platform) packages still satisfy `package.json` and skips
  reinstalling them entirely. The build command clears everything under `node_modules` *except*
  the `.cache` subdirectory (that one's an actively-mounted build cache — trying to remove the
  mount point itself, e.g. via `npm ci`'s full wipe, is exactly what caused the `EBUSY` error
  above) and deletes the lockfile, forcing npm to resolve and fetch everything fresh, directly on
  Railway's own Linux container. The tradeoff is losing exact version-pinning on deploy —
  acceptable here, but worth knowing if a transitive dependency update ever causes an unexpected
  deploy-time difference from local dev.
