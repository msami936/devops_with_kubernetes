const fs = require('fs')
const http = require('http')

const PORT = process.env.PORT || 3000
const COUNT_FILE = process.env.COUNT_FILE || '/data/pong.txt'

let counter = 0

const saveCount = (value) => {
  fs.mkdirSync(require('path').dirname(COUNT_FILE), { recursive: true })
  fs.writeFileSync(COUNT_FILE, String(value))
}

// Restore count from volume if present
try {
  const saved = fs.readFileSync(COUNT_FILE, 'utf8').trim()
  if (saved !== '') {
    counter = Number.parseInt(saved, 10) || 0
  }
} catch {
  // file does not exist yet
}

const server = http.createServer((req, res) => {
  const path = req.url.split('?')[0]

  if (req.method === 'GET' && (path === '/pingpong' || path === '/pingpong/')) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`pong ${counter}\n`)
    counter += 1
    saveCount(counter)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found\n')
})

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`)
})
