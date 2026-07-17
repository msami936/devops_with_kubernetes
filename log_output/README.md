# Log output app

Split into two containers in one pod that share an `emptyDir` volume:

1. **log-generator** – creates a random string on startup and appends `timestamp: string` to a file every 5 seconds
2. **log-reader** – HTTP server that reads the shared file and returns the latest line on `GET /`, plus the ping-pong count from a shared PersistentVolume

## Run locally

```bash
mkdir -p /tmp/shared /tmp/data
LOG_FILE=/tmp/shared/log.txt node generator.js &
LOG_FILE=/tmp/shared/log.txt COUNT_FILE=/tmp/data/pong.txt PORT=3000 node reader.js
```

Open http://localhost:3000

## Build and run with Docker

```bash
docker build -t log-output:1.11 .
```

## Deploy to Kubernetes (k3d)

Shares Ingress with the ping-pong app. Shared request count uses PV/PVC from `../volumes`.

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import log-output:1.11 ping-pong:1.11 -c k3s-default

kubectl apply -f ../volumes/
kubectl apply -f manifests/
kubectl apply -f ../ping_pong/manifests/

kubectl get pods,svc,ingress,pv,pvc
```

## Logs for multi-container pod

```bash
kubectl logs -l app=log-output -c log-generator
kubectl logs -l app=log-output -c log-reader
```

## Access via Ingress

- Log output: http://localhost:8081/
- Ping-pong: http://localhost:8081/pingpong

Example log-output response:

```text
2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43.
Ping / Pongs: 3
```
