const http = require('http')

const PORT = Number(process.env.PORT) || 3000
const VERSION = process.env.VERSION || '1'

const server = http.createServer((req, res) => {
  const path = (req.url || '/').split('?')[0]
  if (req.method === 'GET' && (path === '/' || path === '/greet')) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`Hello from version ${VERSION}\n`)
    return
  }
  if (req.method === 'GET' && path === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('ok\n')
    return
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found\n')
})

server.listen(PORT, () => {
  console.log(`Greeter v${VERSION} listening on ${PORT}`)
})
