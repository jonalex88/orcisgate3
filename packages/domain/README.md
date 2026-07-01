# @orcisgate/domain

Shared types and pure logic: character/spell/action models, the D&D Beyond → domain mapper,
and the action-economy classifier. Used by both `apps/web` and `apps/server` so the raw D&D
Beyond JSON shape is only ever known in one place (`CharacterMapper`, added in a later phase).

## Unsupported/undocumented D&D Beyond endpoints in use

D&D Beyond has no official, published API. Everything below is reverse-engineered from D&D
Beyond's own web app network traffic, is not officially supported, and may change or be removed
without notice (it has happened before to similar endpoints). Treat any integration against these
as best-effort.

| Endpoint | Purpose | Auth |
|---|---|---|
| `character-service.dndbeyond.com/character/v5/character/{id}?includeCustomItems=true` | The character sheet document (abilities, HP, classes, inventory, spells, features). This is the only endpoint this app depends on for MVP. | None for public characters. Bearer JWT (see below) for private characters. |
| D&D Beyond's cobalt-token exchange | Trades the `CobaltSession` cookie (obtained by the user from their own logged-in browser session) for a short-lived bearer JWT used to authenticate the character-service call above. | Requires the user's `CobaltSession` cookie value, provided once via the app's "Connect" flow and stored encrypted server-side. Never exposed back to the client, never logged. |

Endpoints observed but **not used** (shared static reference data or feature-gated extras
covering vehicles, artificer infusions, homebrew content sharing, etc.) — out of scope unless a
real character surfaces a gap the main payload doesn't cover: `rule-data`, `vehicles`,
`components`, `known-infusions`, `items`, `always-prepared-spells`, `always-known-spells`,
`getallfamilysets`.

## Derived stats: the payload doesn't include them

Confirmed by grepping a real response: there is no `armorClass`, no computed ability modifier, no
initiative bonus, no passive perception anywhere in the JSON. D&D Beyond's own web app computes
all of these client-side from base ability scores plus the flattened `modifiers` lists. `derive-stats.ts`
reimplements the parts this app needs (ability modifier, proficiency bonus, HP, unarmored AC,
walking speed) — each formula was cross-checked against a real character's rendered sheet and
matched exactly, including a feat-granted +1 Dex/+2 Con that only shows up as a `bonus`
modifier (`modifiers.feat`, subType `dexterity-score`/`constitution-score`), not in the more
obvious-looking `bonusStats` array.

**Spell slots / Pact Magic don't come from `available` at all.** Since that field can't be
trusted (see above), `spellcasting-table.ts` hard-codes the official PHB multiclass spellcaster
slot table and the separate Warlock Pact Magic table, and computes max slots from class levels
instead. Only `used` is read from the raw payload (how many of the computed max are currently
spent). This is a fixed, non-homebrew-dependent rule, so it doesn't need a real "slots in use"
fixture to trust — it was cross-checked against the Cleric 3/Warlock 1 test character (4 first- +
2 second-level slots from Cleric per the table, 1 Pact Magic slot from Warlock) and unit-tested
directly against the table's well-known values (e.g. Warlock 11 → three 5th-level Pact slots).

**Known gaps, not silently papered over:**
- **AC** only handles the unarmored case (`10 + Dex modifier` + flat armor-class bonus modifiers).
  Equipped-armor math (base-by-armor-type, per-type Dex caps, shields) isn't implemented — the
  character this was built against had no equipped armor to verify it against.
- **Inventory mapping isn't implemented.** The fixture character had an empty `inventory` array,
  so there was nothing real to build/verify `InventoryItem` mapping against yet.
