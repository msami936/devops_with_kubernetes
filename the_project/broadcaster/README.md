# Todo broadcaster

Subscribes to NATS todo events with a **queue group** so multiple replicas deliver each message exactly once to an external Generic webhook.

## Environment

| Variable | Description |
|---|---|
| `NATS_URL` | NATS server URL (e.g. `nats://nats:4222`) |
| `BROADCASTER_URL` | Generic webhook URL (from Secret) |
| `NATS_SUBJECT` | Subject filter (default `todos.>`) |
| `QUEUE_GROUP` | Queue group name (default `broadcasters`) |

Payload posted to the webhook:

```json
{
  "user": "bot",
  "message": "A todo was created: Learn Kubernetes basics"
}
```

## Local run

```bash
npm install
NATS_URL=nats://127.0.0.1:4222 \
BROADCASTER_URL=https://webhook.site/<token> \
node index.js
```
