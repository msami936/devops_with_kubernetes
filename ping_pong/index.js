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

const pool = new Pool({ connectionString: DATABASE_URL })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForDatabase = async () => {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query('SELECT 1')
      console.log('Connected to Postgres')
      return
    } catch (error) {
      console.log(`Waiting for Postgres (attempt ${attempt}/30): ${error.message}`)
      await sleep(2000)
    }
  }
  throw new Error('Postgres was not ready in time')
}

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
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal server error\n')
  }
})

const start = async () => {
  await waitForDatabase()
  await ensureSchema()
  server.listen(PORT, () => {
    console.log(`Server started in port ${PORT}`)
  })
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})
