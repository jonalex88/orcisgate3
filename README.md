# OrcisGate

A desktop-first (tablet-friendly) combat dashboard for D&D Beyond characters, in the spirit of
Baldur's Gate 3's action-economy UI — original design and assets, no BG3 art or text is reused.

## Status

Data layer + live D&D Beyond connect flow work end-to-end for **public** characters (paste a
character URL or id at `/connect`); the UI is still a plain debug view pending the real
BG3-inspired layout. Private-character connect (via a pasted Cobalt session token) isn't built
yet. See [`packages/domain/README.md`](packages/domain/README.md) for the D&D Beyond integration
notes (no official API exists; see that doc for what's used, how, and its known gaps).

## Structure

```
apps/web      React + Vite + TypeScript + Tailwind — the dashboard UI
apps/server   Express + TypeScript — D&D Beyond proxy (CORS handling) + a small SQLite response cache
packages/domain  Shared types, character/spell/action models, DDB → domain mapping
```

## Running locally

```sh
npm install
npm run dev:server   # http://localhost:3001
npm run dev:web      # http://localhost:5173
```

Then open http://localhost:5173 and paste a **public** D&D Beyond character URL or id
(e.g. `https://www.dndbeyond.com/characters/<id>`) — private characters aren't supported yet and
will show a 403. Requires Node ≥24 (uses the built-in `node:sqlite` module — no native
dependencies to compile).

## Testing

```sh
npm test
```

## Building

```sh
npm run build
```
