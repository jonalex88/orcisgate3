import { createApp } from './app.js'
import { createDb } from './db.js'

const port = Number(process.env['PORT'] ?? 3001)
const db = createDb(process.env['DB_PATH'] ?? 'data/orcisgate.db')

createApp(db).listen(port, () => {
  console.log(`orcisgate server listening on http://localhost:${port}`)
})

/**
 * Railway (and most container platforms) send SIGTERM to the old container during every redeploy,
 * not just on a crash — it's the normal "please stop now" signal, unrelated to whether the app is
 * healthy. Without a handler, the default Node behavior is for the process to be terminated BY the
 * signal rather than exiting cleanly, which npm's `start` script wrapper reports as "command
 * failed / signal SIGTERM" — a scary-looking but harmless log line on every single redeploy.
 * Exiting explicitly with code 0 here avoids that. In-memory game-room/SSE state is already a
 * documented, accepted loss on restart (see game-room.ts), so there's nothing to wait on/drain.
 */
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down')
  process.exit(0)
})
