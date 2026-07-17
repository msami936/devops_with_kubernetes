# Ping-pong app

Responds to `GET /pingpong` with `pong N` and exposes `GET /pings` with the current pong count.
The counter is stored in Postgres.

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

## Deploy to GKE (exercise 3.1)

Uses a **LoadBalancer** Service so GCP assigns a public EXTERNAL-IP.
Manifests: `manifests-gke/` (image from Docker Hub, Postgres with default StorageClass).

### Prerequisites

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
# Billing must be enabled on the project (required for GKE)
gcloud services enable container.googleapis.com
```

### Create cluster (once)

```bash
gcloud container clusters create dwk-cluster \
  --zone=europe-north1-a \
  --num-nodes=1 \
  --machine-type=e2-small \
  --disk-size=30

gcloud container clusters get-credentials dwk-cluster --zone=europe-north1-a
```

### Build & push image

```bash
docker build -t msami936/ping-pong:3.1 .
docker push msami936/ping-pong:3.1
```

### Deploy

```bash
kubectl apply -f ../namespaces/exercises.yaml
kubectl apply -f manifests-gke/

kubectl get pods,svc -n exercises
# Wait until EXTERNAL-IP is assigned on the LoadBalancer
kubectl get svc ping-pong -n exercises --watch
```

### Test

```bash
curl http://EXTERNAL-IP/pingpong
curl http://EXTERNAL-IP/pings
```
