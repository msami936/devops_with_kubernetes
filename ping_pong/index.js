const http = require('http')
const { Pool } = require('pg')

const requiredEnv = (name) => {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const PORT = Number(requiredEnv('PORT'))
const DATABASE_URL = requiredEnv('DATABASE_URL')
const ENABLE_CPU_STRESS = process.env.ENABLE_CPU_STRESS === 'true'

const pool = new Pool({ connectionString: DATABASE_URL })

let dbReady = false

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    )
  `)
  await pool.query(`
    INSERT INTO counters (name, value)
    VALUES ('pingpong', 0)
    ON CONFLICT (name) DO NOTHING
  `)
}

const maintainDatabase = async () => {
  for (;;) {
    try {
      await pool.query('SELECT 1')
      if (!dbReady) {
        await ensureSchema()
        dbReady = true
        console.log('Connected to Postgres')
      }
    } catch (error) {
      if (dbReady) {
        console.log(`Lost Postgres connection: ${error.message}`)
      } else {
        console.log(`Waiting for Postgres: ${error.message}`)
      }
      dbReady = false
    }
    await sleep(2000)
  }
}

const getCount = async () => {
  const result = await pool.query(
    `SELECT value FROM counters WHERE name = 'pingpong'`
  )
  return result.rows[0]?.value ?? 0
}

const incrementCount = async () => {
  await pool.query(
    `UPDATE counters SET value = value + 1 WHERE name = 'pingpong'`
  )
}

const isPongPath = (path) => path === '/' || path === ''

const server = http.createServer(async (req, res) => {
  const path = req.url.split('?')[0]

  try {
    // Ready only when the database connection works
    if (req.method === 'GET' && path === '/healthz') {
      if (dbReady) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('ok\n')
      } else {
        res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('database unavailable\n')
      }
      return
    }

    if (!dbReady) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('database unavailable\n')
      return
    }

    // App serves ping-pong at `/`. Gateway rewrites external /pingpong → /
    if (req.method === 'GET' && isPongPath(path)) {
      const counter = await getCount()
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`pong ${counter}\n`)
      await incrementCount()
      return
    }

    if (req.method === 'GET' && (path === '/pings' || path === '/pings/')) {
      const counter = await getCount()
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(String(counter))
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  } catch (error) {
    console.error(error)
    dbReady = false
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal server error\n')
  }
})

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`)
})

if (ENABLE_CPU_STRESS) {
  console.log('ENABLE_CPU_STRESS=true — burning CPU for canary analysis tests')
  setInterval(() => {
    const end = Date.now() + 200
    while (Date.now() < end) {
      // busy loop
    }
  }, 250)
}

maintainDatabase().catch((error) => {
  console.error(error)
  process.exit(1)
})
