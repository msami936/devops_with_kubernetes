# Log output app

Split into two containers in one pod that share an `emptyDir` volume:

1. **log-generator** – creates a random string on startup and appends `timestamp: string` to a file every 5 seconds
2. **log-reader** – HTTP server that returns the latest log line and fetches the ping-pong count over HTTP

## Run locally

```bash
mkdir -p /tmp/shared
LOG_FILE=/tmp/shared/log.txt node generator.js &
LOG_FILE=/tmp/shared/log.txt PINGPONG_URL=http://localhost:3001/pings PORT=3000 node reader.js
```

Open http://localhost:3000

## Build and run with Docker

```bash
docker build -t log-output:2.1 .
```

## Deploy to Kubernetes (k3d)

Log output calls the ping-pong Service at `http://ping-pong:3000/pings` (no shared volume between the apps).

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import log-output:2.1 ping-pong:2.1 -c k3s-default

kubectl apply -f manifests/
kubectl apply -f ../ping_pong/manifests/

kubectl get pods,svc,ingress
```

## Access via Ingress

- Log output: http://localhost:8081/
- Ping-pong: http://localhost:8081/pingpong

Example log-output response:

```text
2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43.
Ping / Pongs: 3
```
