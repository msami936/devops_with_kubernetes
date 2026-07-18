# Ping-pong app

Responds to `GET /` with `pong N` and exposes `GET /pings` with the current pong count.
`GET /healthz` returns 200 when Postgres is reachable (used as a ReadinessProbe).
On GKE, Gateway rewrites external `/pingpong` → `/` so the cluster URL does not leak into the app.
The counter is stored in Postgres.

## Run locally

Requires a local Postgres and:

```bash
npm install
PORT=3000 DATABASE_URL=postgres://postgres:postgres@localhost:5432/pingpong node index.js
```

## Build and run with Docker

```bash
docker build -t ping-pong:4.4 .
```

## Deploy to Kubernetes (k3d)

```bash
kubectl apply -f ../namespaces/exercises.yaml
kubectl apply -f ../postgres/secret.yaml
kubectl apply -f ../postgres/service.yaml
k3d image import ping-pong:4.4 -c k3s-default

# ReadinessProbe Deployment (pre-canary): manifests/deployment.yaml
# Canary Rollout (exercise 4.4): use rollout + AnalysisTemplate instead
kubectl delete deployment ping-pong -n exercises --ignore-not-found
kubectl apply -f manifests/analysis-template.yaml
kubectl apply -f manifests/rollout.yaml
kubectl apply -f manifests/service.yaml
kubectl apply -f ../log_output/manifests/

kubectl apply -f ../postgres/statefulset.yaml
kubectl get rollout,analysistemplate,pods -n exercises
```

## Canary analysis (exercise 4.4)

Requires [Argo Rollouts](https://argoproj.github.io/argo-rollouts/) and Prometheus (see `../monitoring`).

[`manifests/analysis-template.yaml`](manifests/analysis-template.yaml) watches **namespace CPU rate sum** for 5 minutes:

```promql
sum(rate(container_cpu_usage_seconds_total{namespace="exercises",container!=""}[5m])) * 1000
```

- Interval `1m`, count `5` (~5 minutes)
- Success when `result[0] < 200` (millicores; above a quiet baseline)
- First breach → analysis fails → canary **reverts**

[`manifests/rollout.yaml`](manifests/rollout.yaml) canary steps: `setWeight: 50` → pause → analysis → `setWeight: 100`.

Optional CPU burn for demos: set `ENABLE_CPU_STRESS=true` on the Rollout container.

If the threshold is set **too low** (e.g. `result[0] < 10` while baseline is ~15–40 mCPU), a normal update is aborted and the stable revision stays:

```text
RolloutAborted: ... Metric "cpu-usage" assessed Failed due to failed (2) > failureLimit (1)
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

### Exercise 3.4 — Path rewrite

Ping-pong serves at app root `/`. The HTTPRoute rewrites `/pingpong` → `/` with a [URLRewrite](https://gateway-api.sigs.k8s.io/guides/http-redirect-rewrite/) filter:

```bash
docker build -t msami936/ping-pong:3.4 .
docker push msami936/ping-pong:3.4

kubectl apply -f manifests-gke/deployment.yaml
kubectl apply -f manifests-gke/httproute-ping-pong.yaml
```

External clients still use `http://GATEWAY-IP/pingpong`; the app only sees `/`.
