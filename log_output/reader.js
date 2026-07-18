const fs = require('fs')
const http = require('http')

const PORT = process.env.PORT || 3000
const LOG_FILE = process.env.LOG_FILE || '/shared/log.txt'
const PINGPONG_URL = process.env.PINGPONG_URL || 'http://ping-pong:3000/pings'
const INFO_FILE = process.env.INFO_FILE || '/config/information.txt'
const MESSAGE = process.env.MESSAGE || ''

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

const readInfoFile = () => {
  try {
    return fs.readFileSync(INFO_FILE, 'utf8').trim()
  } catch {
    return ''
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

const canReachPingpong = () =>
  new Promise((resolve) => {
    const request = http.get(PINGPONG_URL, (response) => {
      response.resume()
      resolve(response.statusCode >= 200 && response.statusCode < 300)
    })

    request.on('error', () => {
      resolve(false)
    })

    request.setTimeout(2000, () => {
      request.destroy()
      resolve(false)
    })
  })

const server = http.createServer(async (req, res) => {
  const path = req.url.split('?')[0]

  // Ready only when Ping-pong data can be received
  if (req.method === 'GET' && path === '/healthz') {
    const ok = await canReachPingpong()
    res.writeHead(ok ? 200 : 503, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(ok ? 'ok\n' : 'pingpong unavailable\n')
    return
  }

  if (req.method === 'GET' && (path === '/' || path === '/status')) {
    const fileContent = readInfoFile()
    const status = readLatest()
    const pongs = await fetchPongCount()
    const body = [
      `file content: ${fileContent}`,
      `env variable: MESSAGE=${MESSAGE}`,
      `${status}.`,
      `Ping / Pongs: ${pongs}`,
      '',
    ].join('\n')

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(body)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found\n')
})

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`)
})
