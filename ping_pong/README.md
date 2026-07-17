# Ping-pong app

Responds to `GET /pingpong` with `pong N` and exposes `GET /pings` with the current pong count.
Also responds `200 ok` on `GET /` so GKE Ingress health checks succeed.
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

## Deploy to GKE

### Prerequisites

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
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

### Exercise 3.1 — LoadBalancer

```bash
docker build -t msami936/ping-pong:3.1 .
docker push msami936/ping-pong:3.1

kubectl apply -f ../namespaces/exercises.yaml
kubectl apply -f manifests-gke/postgres.yaml
# Use image tag 3.1 in deployment if deploying 3.1 only
kubectl apply -f manifests-gke/
```

### Exercise 3.2 — Ingress (Log output + Ping-pong)

Ping-pong Service is **ClusterIP**. GKE Ingress routes:

- `/` → log-output
- `/pingpong` → ping-pong

Ping-pong returns HTTP 200 on `/` for Ingress health checks.

```bash
docker build -t msami936/ping-pong:3.2 .
docker push msami936/ping-pong:3.2
docker build -t msami936/log-output:3.2 ../log_output
docker push msami936/log-output:3.2

kubectl apply -f ../namespaces/exercises.yaml
kubectl apply -f manifests-gke/postgres.yaml
kubectl apply -f manifests-gke/deployment.yaml
kubectl apply -f manifests-gke/service.yaml
kubectl apply -f ../log_output/manifests-gke/
# (older) kubectl apply -f manifests-gke/ingress.yaml
```

### Exercise 3.3 — Gateway API

Replaces Ingress with [Gateway API HTTP routing](https://gateway-api.sigs.k8s.io/guides/user-guides/http-routing/):

- `Gateway` `dwk-gateway` (`gke-l7-global-external-managed`)
- `HTTPRoute` `/pingpong` + `/pings` → ping-pong
- `HTTPRoute` `/` → log-output

```bash
gcloud container clusters update dwk-cluster \
  --zone=europe-north1-a \
  --gateway-api=standard

kubectl delete ingress dwk-ingress -n exercises --ignore-not-found
kubectl apply -f manifests-gke/gateway.yaml
kubectl apply -f manifests-gke/httproute-ping-pong.yaml
kubectl apply -f ../log_output/manifests-gke/httproute.yaml

kubectl get gateway,httproute -n exercises
# Wait until ADDRESS is set and PROGRAMMED=True
kubectl get gateway dwk-gateway -n exercises --watch
```

Test:

```bash
curl http://GATEWAY-IP/
curl http://GATEWAY-IP/pingpong
curl http://GATEWAY-IP/pings
```
