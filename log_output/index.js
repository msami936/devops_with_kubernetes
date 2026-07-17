const http = require('http')
const { randomUUID } = require('crypto')

const PORT = process.env.PORT || 3000
const randomString = randomUUID()

const getStatus = () => `${new Date().toISOString()}: ${randomString}`

const printStatus = () => {
  console.log(getStatus())
}

printStatus()
setInterval(printStatus, 5000)

const server = http.createServer((req, res) => {
  const path = req.url.split('?')[0]

  if (req.method === 'GET' && (path === '/' || path === '/status')) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`${getStatus()}\n`)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found\n')
})

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`)
})
