# Todo backend

Postgres-backed todo API.

- `GET /todos` – list todos (`id`, `content`, `done`)
- `POST /todos` – create a todo (`{ "content": "..." }`)
- `PUT /todos/:id` – update done (`{ "done": true|false }`)

Config via ConfigMap `todo-backend-config` and Secret `todo-postgres-secret` (`DATABASE_URL`).

Todos are limited to `MAX_TODO_LENGTH` (140). Every `POST /todos` is logged to stdout (accepted and rejected).

```bash
npm install
PORT=3001 TODOS_PATH=/todos MAX_TODO_LENGTH=140 \
DATABASE_URL=postgres://postgres:postgres@localhost:5432/todos \
node index.js
```
