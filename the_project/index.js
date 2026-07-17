const http = require('http')

const PORT = process.env.PORT || 3000

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Todo App</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 40rem;
      margin: 3rem auto;
      padding: 0 1rem;
      color: #1a1a1a;
    }
    h1 { margin-bottom: 0.5rem; }
    p { color: #555; }
  </style>
</head>
<body>
  <h1>Todo App</h1>
  <p>Server is running. More todo features coming soon.</p>
</body>
</html>
`

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found\n')
})

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`)
})
