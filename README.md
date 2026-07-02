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
- **No accounts or access control.** The game key and the "I am the Dungeon Master" checkbox are
  entirely trust-based — this is designed for a group who already trust each other at the same
  table, not a public multi-tenant product. Anyone with the key can act as DM.
- **Rolls are client-computed and trusted**, not re-rolled/verified server-side — matches the
  spec's described click-to-roll UX; this isn't an anti-cheat system.
- **One active encounter at a time per game**, loaded by pasting its JSON — there's no saved
  "library of encounters to pick from" UI yet (the spec's "DM sees a list of uploaded encounters"),
  just load/exit. Monsters *do* persist permanently; encounters currently don't.
- **Player initiative is a flat d20** when the DM rolls initiative for the whole encounter (no
  Dex modifier — the room doesn't hold live character ability scores). A player can still roll
  their own initiative correctly via the dice tray; it'll show properly in the roll log either way.
- **The initiative pane shows the encounter's own player HP snapshot**, not each connected
  player's live current HP — live-data overlay for players in the initiative view is a follow-up.
- **Hotbar actions roll a generic d20**, not action-specific damage/attack dice — D&D Beyond
  doesn't give structured dice notation for most actions (free-text descriptions instead), so
  auto-rolling the "right" dice per action needs text parsing that isn't built yet.
- **Monster stat blocks don't show alignment/size/type/challenge rating** — D&D Beyond references
  those via lookup tables this app doesn't have a confirmed mapping for; showing a guessed value
  would be worse than not showing one. See `packages/domain/README.md`.
- **Mood images are placeholder gradients** with generic names (tavern, forest, dungeon, etc.) —
  real artwork can be dropped in later by pointing a scene's `url` at an actual image.

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
(`/api/health`) for Railway specifically.
