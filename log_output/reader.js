const fs = require('fs')
const http = require('http')

const PORT = process.env.PORT || 3000
const LOG_FILE = process.env.LOG_FILE || '/shared/log.txt'

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

const server = http.createServer((req, res) => {
  const path = req.url.split('?')[0]

  if (req.method === 'GET' && (path === '/' || path === '/status')) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`${readLatest()}\n`)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found\n')
})

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`)
})
