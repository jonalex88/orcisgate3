import { createApp } from './app.js'
import { createDb } from './db.js'

const port = Number(process.env['PORT'] ?? 3001)
const db = createDb(process.env['DB_PATH'] ?? 'data/orcisgate.db')

createApp(db).listen(port, () => {
  console.log(`orcisgate server listening on http://localhost:${port}`)
})
