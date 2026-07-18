const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')

const requiredEnv = (name) => {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const PORT = Number(requiredEnv('PORT'))
const DATA_DIR = requiredEnv('DATA_DIR')
const CACHE_MS = Number(requiredEnv('CACHE_MS'))
const PICSUM_URL = requiredEnv('PICSUM_URL')
const TODOS_API_PATH = requiredEnv('TODOS_API_PATH')
const IMAGE_ROUTE = requiredEnv('IMAGE_ROUTE')
const IMAGE_FILENAME = requiredEnv('IMAGE_FILENAME')
const META_FILENAME = requiredEnv('META_FILENAME')
const MAX_TODO_LENGTH = Number(requiredEnv('MAX_TODO_LENGTH'))
const BACKEND_HEALTH_URL =
  process.env.BACKEND_HEALTH_URL || 'http://todo-backend/healthz'

const IMAGE_FILE = path.join(DATA_DIR, IMAGE_FILENAME)
const META_FILE = path.join(DATA_DIR, META_FILENAME)

fs.mkdirSync(DATA_DIR, { recursive: true })

let isHealthy = true

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

  if (!meta.serveStaleOnce) {
    console.log('Cache expired, serving stale image once more')
    writeMeta({ ...meta, serveStaleOnce: true })
    return
  }

  console.log('Fetching new image after stale serve')
  await downloadImage(PICSUM_URL, IMAGE_FILE)
  writeMeta({ fetchedAt: Date.now(), serveStaleOnce: false })
}

const checkBackendHealth = () =>
  new Promise((resolve) => {
    const request = http.get(BACKEND_HEALTH_URL, (response) => {
      response.resume()
      resolve(response.statusCode >= 200 && response.statusCode < 300)
    })
    request.on('error', () => resolve(false))
    request.setTimeout(2000, () => {
      request.destroy()
      resolve(false)
    })
  })

const sendJson = (res, statusCode, body) => {
  const payload = JSON.stringify(body)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

const failureHtml = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>System Failure</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #fde8e8;
      font-family: system-ui, sans-serif;
    }
    .box {
      max-width: 28rem;
      margin: 1rem;
      padding: 2rem 1.5rem;
      border: 2px solid #b00020;
      border-radius: 0.75rem;
      background: #ffe4e4;
      color: #8a0018;
      text-align: center;
    }
    h1 {
      margin: 0 0 0.75rem;
      font-size: 1.75rem;
    }
    p {
      margin: 0;
      font-size: 1.05rem;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>System Failure</h1>
    <p>The Todo App is currently unhealthy. Please wait for recovery.</p>
  </div>
</body>
</html>
`

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
      --danger: #c62828;
      --danger-dark: #8e0000;
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
    .break-wrap {
      margin-top: 2rem;
      text-align: center;
    }
    .break-button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.4rem;
      background: var(--danger);
      color: white;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
    }
    .break-button:hover {
      background: var(--danger-dark);
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
    <img src="${IMAGE_ROUTE}" alt="Cached random picture" />
  </div>
  <form class="todo-form" id="todo-form">
    <input
      id="todo-input"
      type="text"
      maxlength="${MAX_TODO_LENGTH}"
      placeholder="Enter a new todo (max ${MAX_TODO_LENGTH} characters)"
      aria-label="New todo"
    />
    <button type="submit" id="send-button">Send</button>
  </form>
  <p class="hint"><span id="char-count">0</span>/${MAX_TODO_LENGTH} characters</p>
  <p class="error" id="error-message"></p>
  <h2>Todos</h2>
  <ul class="todo-list" id="todo-list"></ul>
  <div class="break-wrap">
    <button type="button" class="break-button" id="break-button">break the app</button>
  </div>
  <footer>DevOps with Kubernetes 2026</footer>
  <script>
    const APP_CONFIG = {
      todosApiPath: ${JSON.stringify(TODOS_API_PATH)},
      maxTodoLength: ${MAX_TODO_LENGTH},
    };
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const sendButton = document.getElementById('send-button');
    const charCount = document.getElementById('char-count');
    const todoList = document.getElementById('todo-list');
    const errorMessage = document.getElementById('error-message');
    const breakButton = document.getElementById('break-button');

    const syncState = () => {
      const length = input.value.length;
      charCount.textContent = String(length);
      sendButton.disabled = length === 0 || length > APP_CONFIG.maxTodoLength;
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
      const response = await fetch(APP_CONFIG.todosApiPath);
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
      if (!value || value.length > APP_CONFIG.maxTodoLength) {
        return;
      }

      errorMessage.textContent = '';
      sendButton.disabled = true;

      try {
        const response = await fetch(APP_CONFIG.todosApiPath, {
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

    breakButton.addEventListener('click', async () => {
      breakButton.disabled = true;
      try {
        await fetch('/break', { method: 'POST' });
        window.location.reload();
      } catch (error) {
        errorMessage.textContent = error.message;
        breakButton.disabled = false;
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
    if (req.method === 'GET' && urlPath === '/healthz') {
      if (!isHealthy) {
        sendJson(res, 500, { status: 'unhealthy' })
        return
      }
      sendJson(res, 200, { status: 'ok' })
      return
    }

    if (req.method === 'GET' && urlPath === '/readyz') {
      if (!isHealthy) {
        sendJson(res, 500, { status: 'unhealthy' })
        return
      }
      const backendOk = await checkBackendHealth()
      if (!backendOk) {
        sendJson(res, 500, {
          status: 'unhealthy',
          reason: 'database unavailable',
        })
        return
      }
      sendJson(res, 200, { status: 'ok' })
      return
    }

    if (req.method === 'POST' && urlPath === '/break') {
      isHealthy = false
      console.log('App marked unhealthy via /break')
      sendJson(res, 200, { status: 'broken' })
      return
    }

    if (req.method === 'GET' && (urlPath === '/' || urlPath === '')) {
      if (!isHealthy) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(failureHtml())
        return
      }
      await ensureImage()
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(pageHtml())
      return
    }

    if (req.method === 'GET' && urlPath === IMAGE_ROUTE) {
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
