const http = require('http')

const PORT = process.env.PORT || 3001

let nextId = 4
const todos = [
  { id: 1, content: 'Learn Kubernetes basics' },
  { id: 2, content: 'Deploy application to cluster' },
  { id: 3, content: 'Configure persistent volumes' },
]

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

const server = http.createServer(async (req, res) => {
  const path = req.url.split('?')[0]

  try {
    if (req.method === 'GET' && (path === '/todos' || path === '/todos/')) {
      sendJson(res, 200, todos)
      return
    }

    if (req.method === 'POST' && (path === '/todos' || path === '/todos/')) {
      const raw = await readBody(req)
      let parsed
      try {
        parsed = JSON.parse(raw || '{}')
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON' })
        return
      }

      const content = typeof parsed.content === 'string' ? parsed.content.trim() : ''
      if (!content) {
        sendJson(res, 400, { error: 'content is required' })
        return
      }
      if (content.length > 140) {
        sendJson(res, 400, { error: 'content must be at most 140 characters' })
        return
      }

      const todo = { id: nextId, content }
      nextId += 1
      todos.push(todo)
      sendJson(res, 201, todo)
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { error: 'Internal server error' })
  }
})

server.listen(PORT, () => {
  console.log(`Todo backend started in port ${PORT}`)
})
