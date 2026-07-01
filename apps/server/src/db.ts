import type { MonsterTemplate } from '@orcisgate/domain'
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
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

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
        `INSERT INTO monster_templates (monster_id, name, data, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(monster_id) DO UPDATE SET name = excluded.name, data = excluded.data, updated_at = excluded.updated_at`,
      )
      const now = new Date().toISOString()
      for (const template of templates) {
        stmt.run(template.id, template.name, JSON.stringify(template), now)
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

    close(): void {
      db.close()
    },
  }
}
