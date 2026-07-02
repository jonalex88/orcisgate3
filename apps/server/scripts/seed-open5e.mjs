#!/usr/bin/env node
/**
 * One-time (or repeatable) seed script: paginates Open5e's public creature compendium
 * (api.open5e.com, OGL-licensed) and imports each page via this server's own
 * `/api/monsters/open5e` endpoint. Deliberately a thin relay with no dependency on
 * @orcisgate/domain — all the mapping/validation happens server-side (see
 * apps/server/src/routes/monsters.ts), so this script works identically against a local dev
 * server or a deployed one, and is just plain JS with nothing to build first.
 *
 * This script is safe to keep in the repo — it's code that fetches and relays data, it doesn't
 * embed any of Open5e's actual creature content. Running it seeds *your own* server's database;
 * nothing from Open5e ends up committed to git.
 *
 * Usage:
 *   node scripts/seed-open5e.mjs                                   # seed everything, against localhost:3001
 *   SEED_SERVER_URL=https://your-app.up.railway.app node scripts/seed-open5e.mjs
 *   node scripts/seed-open5e.mjs --limit=20                        # just the first 20, for a quick test
 */

const OPEN5E_LIST_URL = 'https://api.open5e.com/v2/creatures/?limit=500&depth=1'
const SERVER_URL = process.env.SEED_SERVER_URL ?? 'http://localhost:3001'
const DELAY_MS = Number(process.env.SEED_DELAY_MS ?? 500)

const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchOpen5ePage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OrcisGate-seed-script (https://github.com/jonalex88/orcisgate3)' },
  })
  if (!res.ok) throw new Error(`Open5e request failed (${res.status}): ${url}`)
  return res.json()
}

async function importPage(page) {
  const res = await fetch(`${SERVER_URL}/api/monsters/open5e`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(page),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Import failed (${res.status}): ${body}`)
  }
  return res.json()
}

async function main() {
  console.log(
    `Seeding monsters into ${SERVER_URL} from Open5e${limit !== Infinity ? ` (limit: ${limit})` : ''}...`,
  )

  let url = OPEN5E_LIST_URL
  let importedCount = 0

  while (url && importedCount < limit) {
    const page = await fetchOpen5ePage(url)

    const remaining = limit - importedCount
    const pageToImport =
      remaining < page.results.length ? { ...page, results: page.results.slice(0, remaining) } : page

    const result = await importPage(pageToImport)
    importedCount += result.imported.length
    console.log(`Imported ${result.imported.length} (total ${importedCount}/${page.count})`)

    url = importedCount < limit ? page.next : null
    if (url) await sleep(DELAY_MS)
  }

  console.log(`Done. Imported ${importedCount} monster(s).`)
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exitCode = 1
})
