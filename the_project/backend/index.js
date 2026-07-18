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
const TODOS_PATH = requiredEnv('TODOS_PATH')
const MAX_TODO_LENGTH = Number(requiredEnv('MAX_TODO_LENGTH'))
const DATABASE_URL = requiredEnv('DATABASE_URL')

const pool = new Pool({ connectionString: DATABASE_URL })

let dbReady = false

const seedTodos = [
  'Learn Kubernetes basics',
  'Deploy application to cluster',
  'Configure persistent volumes',
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL
    )
  `)

  const existing = await pool.query('SELECT COUNT(*)::int AS count FROM todos')
  if (existing.rows[0].count === 0) {
    for (const content of seedTodos) {
      await pool.query('INSERT INTO todos (content) VALUES ($1)', [content])
    }
    console.log('Seeded initial todos')
  }
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

const listTodos = async () => {
  const result = await pool.query(
    'SELECT id, content FROM todos ORDER BY id ASC'
  )
  return result.rows
}

const createTodo = async (content) => {
  const result = await pool.query(
    'INSERT INTO todos (content) VALUES ($1) RETURNING id, content',
    [content]
  )
  return result.rows[0]
}

const sendJson = (res, statusCode, body) => {
  const payload = JSON.stringify(body)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        reject(new Error('Body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })

const isTodosPath = (path) => path === TODOS_PATH || path === `${TODOS_PATH}/`

const server = http.createServer(async (req, res) => {
  const path = req.url.split('?')[0]

  try {
    // Ready when the database connection works
    if (req.method === 'GET' && path === '/healthz') {
      if (dbReady) {
        sendJson(res, 200, { status: 'ok' })
      } else {
        sendJson(res, 500, { status: 'unhealthy', reason: 'database unavailable' })
      }
      return
    }

    // GKE Ingress health checks hit `/` (keep always OK for LB)
    if (req.method === 'GET' && (path === '/' || path === '')) {
      sendJson(res, 200, { status: 'ok' })
      return
    }

    if (!dbReady) {
      sendJson(res, 503, { error: 'database unavailable' })
      return
    }

    if (req.method === 'GET' && isTodosPath(path)) {
      sendJson(res, 200, await listTodos())
      return
    }

    if (req.method === 'POST' && isTodosPath(path)) {
      const raw = await readBody(req)
      console.log(`todo request received: ${raw}`)

      let parsed
      try {
        parsed = JSON.parse(raw || '{}')
      } catch {
        console.log('todo request rejected (invalid JSON)')
        sendJson(res, 400, { error: 'Invalid JSON' })
        return
      }

      const content = typeof parsed.content === 'string' ? parsed.content.trim() : ''
      if (!content) {
        console.log('todo request rejected (empty content)')
        sendJson(res, 400, { error: 'content is required' })
        return
      }
      if (content.length > MAX_TODO_LENGTH) {
        console.log(
          `todo request rejected (too long, ${content.length}/${MAX_TODO_LENGTH}): ${content}`
        )
        sendJson(res, 400, {
          error: `content must be at most ${MAX_TODO_LENGTH} characters`,
        })
        return
      }

      const todo = await createTodo(content)
      console.log(`todo request accepted: ${content}`)
      sendJson(res, 201, todo)
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  } catch (error) {
    console.error(error)
    dbReady = false
    sendJson(res, 500, { error: 'Internal server error' })
  }
})

server.listen(PORT, () => {
  console.log(`Todo backend started in port ${PORT}`)
})

maintainDatabase().catch((error) => {
  console.error(error)
  process.exit(1)
})
