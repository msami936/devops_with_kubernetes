# Todo backend

Postgres-backed todo API.

- `GET /todos` – list todos
- `POST /todos` – create a todo (`{ "content": "..." }`)

Config via ConfigMap `todo-backend-config` and Secret `todo-postgres-secret` (`DATABASE_URL`).

```bash
npm install
PORT=3001 TODOS_PATH=/todos MAX_TODO_LENGTH=140 \
DATABASE_URL=postgres://postgres:postgres@localhost:5432/todos \
node index.js
```
