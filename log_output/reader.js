const fs = require('fs')
const http = require('http')

const PORT = process.env.PORT || 3000
const LOG_FILE = process.env.LOG_FILE || '/shared/log.txt'
const PINGPONG_URL = process.env.PINGPONG_URL || 'http://ping-pong:3000/pings'

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

const fetchPongCount = () =>
  new Promise((resolve) => {
    const request = http.get(PINGPONG_URL, (response) => {
      let body = ''
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => {
        resolve(Number.parseInt(body.trim(), 10) || 0)
      })
    })

    request.on('error', (error) => {
      console.error('Failed to fetch pong count:', error.message)
      resolve(0)
    })
  })

const server = http.createServer(async (req, res) => {
  const path = req.url.split('?')[0]

  if (req.method === 'GET' && (path === '/' || path === '/status')) {
    const status = readLatest()
    const pongs = await fetchPongCount()
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
