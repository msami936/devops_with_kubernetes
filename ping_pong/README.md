# Ping-pong app

Responds to `GET /pingpong` with `pong N` and exposes `GET /pings` with the current pong count.
The counter is stored in Postgres (StatefulSet in the `exercises` namespace).

## Run locally

Requires a local Postgres and:

```bash
npm install
PORT=3000 DATABASE_URL=postgres://postgres:postgres@localhost:5432/pingpong node index.js
```

## Build and run with Docker

```bash
docker build -t ping-pong:2.7 .
```

## Deploy to Kubernetes (k3d)

```bash
kubectl apply -f ../namespaces/exercises.yaml
kubectl apply -f ../postgres/
k3d image import ping-pong:2.7 -c k3s-default
kubectl apply -f manifests/
kubectl apply -f ../log_output/manifests/

kubectl get pods,svc,statefulset,pvc -n exercises
```
