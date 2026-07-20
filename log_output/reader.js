const fs = require('fs')
const http = require('http')

const PORT = process.env.PORT || 3000
const LOG_FILE = process.env.LOG_FILE || '/shared/log.txt'
const PINGPONG_URL = process.env.PINGPONG_URL || 'http://ping-pong:3000/pings'
const GREETER_URL = process.env.GREETER_URL || 'http://greeter-svc:3000/'
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

const httpGetText = (url) =>
  new Promise((resolve) => {
    const request = http.get(url, (response) => {
      let body = ''
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => {
        resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, body: body.trim() })
      })
    })

    request.on('error', (error) => {
      console.error(`GET ${url} failed:`, error.message)
      resolve({ ok: false, body: '' })
    })

    request.setTimeout(2000, () => {
      request.destroy()
      resolve({ ok: false, body: '' })
    })
  })

const fetchPongCount = async () => {
  const { body } = await httpGetText(PINGPONG_URL)
  return Number.parseInt(body, 10) || 0
}

const fetchGreeting = async () => {
  const { ok, body } = await httpGetText(GREETER_URL)
  return ok && body ? body : 'greeter unavailable'
}

const canReachPingpong = async () => {
  const { ok } = await httpGetText(PINGPONG_URL)
  return ok
}

const server = http.createServer(async (req, res) => {
  const path = req.url.split('?')[0]

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
    const greeting = await fetchGreeting()
    const body = [
      status,
      `Ping / Pongs: ${pongs}`,
      `env-variable: MESSAGE=${MESSAGE}`,
      `file contents: ${fileContent}`,
      `greetings: ${greeting}`,
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
