# Log output app

Generates a random string on startup and prints it every 5 seconds with a timestamp.

Also exposes an HTTP endpoint (`/` or `/status`) that returns the current status (fresh timestamp + the same random string).

## Run locally

```bash
PORT=3000 node index.js
```

Open http://localhost:3000

## Build and run with Docker

```bash
docker build -t log-output:1.7 .
docker run --rm -e PORT=3000 -p 3000:3000 log-output:1.7
```

## Deploy to Kubernetes (k3d)

Shares Ingress with the ping-pong app (`/pingpong` → ping-pong, `/` → log-output).

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import log-output:1.7 ping-pong:1.9 -c k3s-default

kubectl apply -f manifests/
kubectl apply -f ../ping_pong/manifests/

kubectl get pods,svc,ingress
kubectl logs -l app=log-output
```

## Access via Ingress

- Log output: http://localhost:8081/
- Ping-pong: http://localhost:8081/pingpong

Example log-output response:

```text
2026-07-17T14:00:00.000Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43
```
