# Ping-pong app

Responds to `GET /pingpong` with `pong N` and stores the request count in a file on a shared PersistentVolume (used by Log output).

## Run locally

```bash
mkdir -p /tmp/data
COUNT_FILE=/tmp/data/pong.txt PORT=3000 node index.js
```

Then open http://localhost:3000/pingpong

## Build and run with Docker

```bash
docker build -t ping-pong:1.11 .
docker run --rm -e PORT=3000 -e COUNT_FILE=/data/pong.txt -v pong-data:/data -p 3000:3000 ping-pong:1.11
```

## Deploy to Kubernetes (k3d)

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import ping-pong:1.11 log-output:1.11 -c k3s-default

kubectl apply -f ../volumes/
kubectl apply -f ../log_output/manifests/
kubectl apply -f manifests/

kubectl get pods,svc,ingress,pv,pvc
```

## Access via Ingress

- Log output status: http://localhost:8081/
- Ping-pong: http://localhost:8081/pingpong
