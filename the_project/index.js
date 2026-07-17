const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')

const PORT = process.env.PORT || 3000
const DATA_DIR = process.env.DATA_DIR || '/data'
const IMAGE_FILE = path.join(DATA_DIR, 'image.jpg')
const META_FILE = path.join(DATA_DIR, 'image-meta.json')
const CACHE_MS = Number(process.env.CACHE_MS || 10 * 60 * 1000)
const PICSUM_URL = process.env.PICSUM_URL || 'https://picsum.photos/1200'

fs.mkdirSync(DATA_DIR, { recursive: true })

const readMeta = () => {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf8'))
  } catch {
    return null
  }
}

const writeMeta = (meta) => {
  fs.writeFileSync(META_FILE, JSON.stringify(meta))
}

const downloadImage = (url, dest) =>
  new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const request = client.get(url, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        downloadImage(response.headers.location, dest).then(resolve).catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`))
        response.resume()
        return
      }

      const file = fs.createWriteStream(dest)
      response.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
      file.on('error', reject)
    })

    request.on('error', reject)
  })

const ensureImage = async () => {
  const now = Date.now()
  const meta = readMeta()
  const hasImage = fs.existsSync(IMAGE_FILE)

  if (!hasImage || !meta) {
    console.log('Fetching new image (no cache)')
    await downloadImage(PICSUM_URL, IMAGE_FILE)
    writeMeta({ fetchedAt: now, serveStaleOnce: false })
    return
  }

  const age = now - meta.fetchedAt
  if (age < CACHE_MS) {
    return
  }

  // Cache expired: serve the old image one more time, then refresh on the next request
  if (!meta.serveStaleOnce) {
    console.log('Cache expired, serving stale image once more')
    writeMeta({ ...meta, serveStaleOnce: true })
    return
  }

  console.log('Fetching new image after stale serve')
  await downloadImage(PICSUM_URL, IMAGE_FILE)
  writeMeta({ fetchedAt: Date.now(), serveStaleOnce: false })
}

const pageHtml = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Todo App</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 40rem;
      margin: 2rem auto;
      padding: 0 1rem;
      color: #1a1a1a;
      text-align: center;
    }
    h1 { margin-bottom: 1.5rem; }
    img {
      width: 100%;
      max-width: 36rem;
      border-radius: 0.75rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
    footer {
      margin-top: 1.5rem;
      color: #777;
      font-size: 0.95rem;
    }
  </style>
</head>
<body>
  <h1>Todo App</h1>
  <img src="/image" alt="Cached random picture" />
  <footer>DevOps with Kubernetes 2026</footer>
</body>
</html>
`

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0]

  try {
    if (req.method === 'GET' && (urlPath === '/' || urlPath === '')) {
      await ensureImage()
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(pageHtml())
      return
    }

    if (req.method === 'GET' && urlPath === '/image') {
      await ensureImage()
      if (!fs.existsSync(IMAGE_FILE)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Image not found\n')
        return
      }
      res.writeHead(200, { 'Content-Type': 'image/jpeg' })
      fs.createReadStream(IMAGE_FILE).pipe(res)
      return
    }

    // Useful for testing pod restarts / volume persistence
    if (req.method === 'GET' && urlPath === '/crash') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Crashing...\n')
      console.log('Crash endpoint called, exiting')
      setTimeout(() => process.exit(1), 100)
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found\n')
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal server error\n')
  }
})

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`)
})
