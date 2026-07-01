# @orcisgate/domain

Shared types and pure logic: character/monster/encounter models, the D&D Beyond → domain mappers,
the action-economy classifier, and the dice roller. Used by both `apps/web` and `apps/server` so
the raw D&D Beyond JSON shape is only ever known in one place per entity (`CharacterMapper`,
`MonsterMapper`, `EncounterMapper`).

## Unsupported/undocumented D&D Beyond endpoints in use

D&D Beyond has no official, published API. Everything below is reverse-engineered from D&D
Beyond's own web app network traffic, is not officially supported, and may change or be removed
without notice (it has happened before to similar endpoints). Treat any integration against these
as best-effort.

| Endpoint | Purpose | Auth |
|---|---|---|
| `character-service.dndbeyond.com/character/v5/character/{id}?includeCustomItems=true` | The character sheet document (abilities, HP, classes, inventory, spells, features). This is the only character endpoint this app depends on. | None for public characters. Bearer JWT (see below) for private characters. |
| D&D Beyond's cobalt-token exchange | Trades the `CobaltSession` cookie (obtained by the user from their own logged-in browser session) for a short-lived bearer JWT used to authenticate the character-service call above. | Requires the user's `CobaltSession` cookie value, provided once via the app's "Connect" flow and stored encrypted server-side. Never exposed back to the client, never logged. Not yet implemented — see the private-character phase in the plan. |
| D&D Beyond's Encounter Builder / Combat Tracker export | An "encounter" document: monster instances (referenced by id), groups, and the party's D&D Beyond character ids/HP snapshot. No simpler export trick exists (unlike the character's old `/json` URL) — obtained the same way, via DevTools. | Gated by the DM's own account/campaign access, same story as private characters — not fetched live yet, only pasted. |
| D&D Beyond's monster-stats endpoint | Full monster stat blocks (the same data ddb-importer's "Monster Muncher" uses), referenced by the encounter's monster ids. | Gated by content ownership (you need to own the sourcebook/monster in D&D Beyond) — not fetched live yet, only pasted. |

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

## Monsters and encounters

`MonsterMapper` and `EncounterMapper` follow the same "validate with zod, throw loudly on an
unrecognized shape" pattern, built against real (sanitized) fixtures — see
`src/__fixtures__/sample-monster-stats.json` (SRD content, unmodified) and
`src/__fixtures__/sample-encounter.json` (a real export with all player names/ids/campaign info
replaced by fictional placeholders).

- **A monster's action economy comes from *which HTML field it's in***, not a numeric activation
  value the way spells/character-actions have — D&D Beyond splits monster stat blocks into
  `actionsDescription`/`bonusActionsDescription`/`reactionsDescription`/
  `legendaryActionsDescription`/`mythicActionsDescription`, each a blob of `<p><strong>Name.</strong>
  ...</p>` paragraphs. `parse-action-blocks.ts` splits those into individual `ActionItem`s — more
  reliable than the class-feature text heuristic, since the bucket is structural, not guessed.
  Mythic actions are folded into `legendaryAction` rather than adding a sixth economy type for a
  case the UI doesn't otherwise distinguish.
- **Alignment/size/type/challenge-rating/skills/saving-throws are deliberately not modeled.**
  D&D Beyond references all of these via small numeric lookup tables (`alignmentId`, `sizeId`,
  `typeId`, `challengeRatingId`, `skillId`) this app doesn't have a confirmed mapping for. Two
  known data points (skillId 2 = Athletics, skillId 16 = Deception) aren't enough to safely guess
  the other 16 — showing a wrong value would be worse than showing none. `MonsterTemplate` only
  includes fields with a direct, unambiguous value (AC, HP, ability scores, speed, passive
  perception — monsters, unlike characters, *do* get a precomputed AC and passive perception).
- **A monster's `id` is the permanent primary key**, both in `MonsterTemplate.id` and in
  `apps/server`'s `monster_templates` table — D&D Beyond's own encounter export references
  monsters this same way (`monsters[].id`), which is what makes "paste a monster once, resolve it
  automatically in every future encounter" possible.
- **Encounters and monster stat blocks are always two separate pastes.** An encounter only ever
  contains monster *instances* (id reference + per-instance HP/initiative), never the stat block
  itself — mirroring D&D Beyond's own data model rather than inventing a combined format.
