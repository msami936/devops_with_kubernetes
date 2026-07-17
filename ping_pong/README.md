# Ping-pong app

Responds to `GET /pingpong` with `pong N`, where `N` is an in-memory request counter (starts at 0).

## Run locally

```bash
PORT=3000 node index.js
```

Then open http://localhost:3000/pingpong

## Build and run with Docker

```bash
docker build -t ping-pong:1.9 .
docker run --rm -e PORT=3000 -p 3000:3000 ping-pong:1.9
```

## Deploy to Kubernetes (k3d)

Shares Ingress with the Log output app. Create the cluster with:

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import ping-pong:1.9 log-output:1.7 -c k3s-default

kubectl apply -f ../log_output/manifests/
kubectl apply -f manifests/

kubectl get pods,svc,ingress
```

## Access via Ingress

- Log output status: http://localhost:8081/
- Ping-pong: http://localhost:8081/pingpong
