const fs = require('fs')
const http = require('http')

const PORT = process.env.PORT || 3000
const LOG_FILE = process.env.LOG_FILE || '/shared/log.txt'
const COUNT_FILE = process.env.COUNT_FILE || '/data/pong.txt'

const readLatest = () => {
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf8').trim()
    if (!content) {
      return 'No log yet'
    }
    const lines = content.split('\n')
    return lines[lines.length - 1]
  } catch {
    return 'No log yet'
  }
}

const readPongCount = () => {
  try {
    const content = fs.readFileSync(COUNT_FILE, 'utf8').trim()
    if (content === '') {
      return 0
    }
    return Number.parseInt(content, 10) || 0
  } catch {
    return 0
  }
}

const server = http.createServer((req, res) => {
  const path = req.url.split('?')[0]

  if (req.method === 'GET' && (path === '/' || path === '/status')) {
    const status = readLatest()
    const pongs = readPongCount()
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`${status}.\nPing / Pongs: ${pongs}\n`)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found\n')
})

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`)
})
