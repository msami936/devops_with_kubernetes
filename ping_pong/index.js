const http = require('http')

const PORT = process.env.PORT || 3000
let counter = 0

const server = http.createServer((req, res) => {
  const path = req.url.split('?')[0]

  if (req.method === 'GET' && (path === '/pingpong' || path === '/pingpong/')) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`pong ${counter}\n`)
    counter += 1
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found\n')
})

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`)
})
