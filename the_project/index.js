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
    :root {
      --green: #2e7d32;
      --green-dark: #1b5e20;
      --border: #dde3ea;
      --text: #1a1a1a;
      --muted: #777;
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      max-width: 40rem;
      margin: 2rem auto;
      padding: 0 1rem 2rem;
      color: var(--text);
    }
    h1 {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .hero {
      text-align: center;
    }
    .hero img {
      width: 100%;
      max-width: 36rem;
      border-radius: 0.75rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
    .todo-form {
      display: flex;
      gap: 0.75rem;
      margin: 1.5rem 0 1.25rem;
    }
    .todo-form input {
      flex: 1;
      padding: 0.7rem 0.9rem;
      border: 2px solid var(--green);
      border-radius: 0.4rem;
      font-size: 1rem;
    }
    .todo-form input:focus {
      outline: 2px solid rgba(46, 125, 50, 0.25);
    }
    .todo-form button {
      padding: 0.7rem 1.25rem;
      border: none;
      border-radius: 0.4rem;
      background: var(--green);
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .todo-form button:hover {
      background: var(--green-dark);
    }
    .todo-form button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .hint {
      margin: -0.5rem 0 1rem;
      color: var(--muted);
      font-size: 0.85rem;
    }
    .error {
      color: #b00020;
      min-height: 1.25rem;
      margin: 0 0 1rem;
      font-size: 0.9rem;
    }
    h2 {
      margin: 0 0 0.75rem;
      font-size: 1.15rem;
    }
    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 0.75rem;
    }
    .todo-list li {
      padding: 0.85rem 1rem;
      border: 1px solid var(--border);
      border-left: 5px solid var(--green);
      border-radius: 0.5rem;
      background: #fff;
    }
    footer {
      margin-top: 1.5rem;
      color: var(--muted);
      font-size: 0.95rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>Todo App</h1>
  <div class="hero">
    <img src="/image" alt="Cached random picture" />
  </div>
  <form class="todo-form" id="todo-form">
    <input
      id="todo-input"
      type="text"
      maxlength="140"
      placeholder="Enter a new todo (max 140 characters)"
      aria-label="New todo"
    />
    <button type="submit" id="send-button">Send</button>
  </form>
  <p class="hint"><span id="char-count">0</span>/140 characters</p>
  <p class="error" id="error-message"></p>
  <h2>Todos</h2>
  <ul class="todo-list" id="todo-list"></ul>
  <footer>DevOps with Kubernetes 2026</footer>
  <script>
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const sendButton = document.getElementById('send-button');
    const charCount = document.getElementById('char-count');
    const todoList = document.getElementById('todo-list');
    const errorMessage = document.getElementById('error-message');

    const syncState = () => {
      const length = input.value.length;
      charCount.textContent = String(length);
      sendButton.disabled = length === 0 || length > 140;
    };

    const renderTodos = (todos) => {
      todoList.innerHTML = '';
      todos.forEach((todo) => {
        const item = document.createElement('li');
        item.textContent = todo.content;
        todoList.appendChild(item);
      });
    };

    const loadTodos = async () => {
      const response = await fetch('/todos');
      if (!response.ok) {
        throw new Error('Failed to load todos');
      }
      const todos = await response.json();
      renderTodos(todos);
    };

    input.addEventListener('input', syncState);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value || value.length > 140) {
        return;
      }

      errorMessage.textContent = '';
      sendButton.disabled = true;

      try {
        const response = await fetch('/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: value }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || 'Failed to create todo');
        }
        input.value = '';
        syncState();
        await loadTodos();
      } catch (error) {
        errorMessage.textContent = error.message;
        syncState();
      }
    });

    syncState();
    loadTodos().catch((error) => {
      errorMessage.textContent = error.message;
    });
  </script>
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
