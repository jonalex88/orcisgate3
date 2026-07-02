import { normalizeMonsterName, type MonsterTemplate } from '@orcisgate/domain'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

/**
 * Uses Node's built-in `node:sqlite` (stable as of Node 24) rather than a native npm module like
 * better-sqlite3 — same embedded-file-database properties, but nothing to compile, so this never
 * breaks on a machine without native build tools. See engines.node in package.json.
 *
 * No session/account table on purpose: the character id (parsed from whatever the user pastes —
 * a bare id or a full character URL, see parseCharacterId) is the primary key for everything.
 * "Logging in" is just supplying that id again; the browser remembers it via a plain cookie
 * (apps/web), not a server-side session. This keeps a private character's future access-control
 * story simple too: whatever gets added there hangs off the same character-id key rather than a
 * separate identity system.
 */
export type Db = ReturnType<typeof createDb>

function migrateMonsterTemplatesTable(db: DatabaseSync): void {
  const columns = db.prepare('PRAGMA table_info(monster_templates)').all() as { name: string }[]
  if (columns.some((c) => c.name === 'normalized_name')) return

  // Upgrading an existing deployment (e.g. Railway's persistent volume) from before name-fallback
  // matching existed — add the column and backfill it for every monster already in the library.
  db.exec(`ALTER TABLE monster_templates ADD COLUMN normalized_name TEXT NOT NULL DEFAULT ''`)
  const rows = db.prepare('SELECT monster_id, name FROM monster_templates').all() as {
    monster_id: string
    name: string
  }[]
  const update = db.prepare('UPDATE monster_templates SET normalized_name = ? WHERE monster_id = ?')
  for (const row of rows) {
    update.run(normalizeMonsterName(row.name), row.monster_id)
  }
}

export function createDb(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)

  db.exec(`
    CREATE TABLE IF NOT EXISTS character_cache (
      character_id TEXT PRIMARY KEY,
      raw_payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monster_templates (
      monster_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  // Must run before creating the index below — on a database from before normalized_name
  // existed, CREATE TABLE IF NOT EXISTS above was a no-op, so the column isn't there yet.
  migrateMonsterTemplatesTable(db)
  db.exec('CREATE INDEX IF NOT EXISTS idx_monster_templates_normalized_name ON monster_templates (normalized_name)')

  return {
    getCachedCharacter(characterId: string, maxAgeMs: number): unknown | null {
      const row = db
        .prepare('SELECT raw_payload, fetched_at FROM character_cache WHERE character_id = ?')
        .get(characterId) as { raw_payload: string; fetched_at: string } | undefined
      if (!row) return null
      const age = Date.now() - new Date(row.fetched_at).getTime()
      if (age > maxAgeMs) return null
      return JSON.parse(row.raw_payload)
    },

    setCachedCharacter(characterId: string, rawPayload: unknown): void {
      db.prepare(
        `INSERT INTO character_cache (character_id, raw_payload, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT(character_id) DO UPDATE SET raw_payload = excluded.raw_payload, fetched_at = excluded.fetched_at`,
      ).run(characterId, JSON.stringify(rawPayload), new Date().toISOString())
    },

    /**
     * Monster templates are global and permanent once pasted once (see the plan): a monster's
     * D&D Beyond id always means the same stat block, for every DM, forever. Upserting rather
     * than inserting lets a DM re-paste to refresh without erroring.
     */
    upsertMonsterTemplates(templates: MonsterTemplate[]): void {
      const stmt = db.prepare(
        `INSERT INTO monster_templates (monster_id, name, normalized_name, data, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(monster_id) DO UPDATE SET
           name = excluded.name, normalized_name = excluded.normalized_name,
           data = excluded.data, updated_at = excluded.updated_at`,
      )
      const now = new Date().toISOString()
      for (const template of templates) {
        stmt.run(template.id, template.name, normalizeMonsterName(template.name), JSON.stringify(template), now)
      }
    },

    /** Returns only the templates it actually has — callers diff against the requested ids to find gaps. */
    getMonsterTemplates(ids: string[]): MonsterTemplate[] {
      if (ids.length === 0) return []
      const placeholders = ids.map(() => '?').join(', ')
      const rows = db
        .prepare(`SELECT data FROM monster_templates WHERE monster_id IN (${placeholders})`)
        .all(...ids) as { data: string }[]
      return rows.map((row) => JSON.parse(row.data) as MonsterTemplate)
    },

    /**
     * Fallback for when the exact D&D Beyond id isn't in the library yet — e.g. a pre-seeded
     * open-compendium monster that doesn't share DDB's numeric id scheme (see the plan). Best
     * effort, not authoritative: returns whichever match was updated most recently if more than
     * one template happens to share a normalized name.
     */
    getMonsterTemplateByNormalizedName(normalizedName: string): MonsterTemplate | null {
      if (!normalizedName) return null
      const row = db
        .prepare('SELECT data FROM monster_templates WHERE normalized_name = ? ORDER BY updated_at DESC LIMIT 1')
        .get(normalizedName) as { data: string } | undefined
      return row ? (JSON.parse(row.data) as MonsterTemplate) : null
    },

    close(): void {
      db.close()
    },
  }
}
