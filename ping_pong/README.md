# Ping-pong app

Responds to `GET /pingpong` with `pong N` and exposes `GET /pings` with the current pong count for other pods (Log output).

## Run locally

```bash
PORT=3000 node index.js
```

- http://localhost:3000/pingpong
- http://localhost:3000/pings

## Build and run with Docker

```bash
docker build -t ping-pong:2.1 .
docker run --rm -e PORT=3000 -p 3000:3000 ping-pong:2.1
```

## Deploy to Kubernetes (k3d)

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import ping-pong:2.1 log-output:2.1 -c k3s-default

kubectl apply -f ../log_output/manifests/
kubectl apply -f manifests/

kubectl get pods,svc,ingress
```

## Access via Ingress

- Log output status: http://localhost:8081/
- Ping-pong: http://localhost:8081/pingpong
