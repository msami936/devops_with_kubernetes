# Ping-pong as Knative Serving (exercise 5.7)

Convert the Ping-pong Deployment to a [Knative Service](https://knative.dev/docs/serving/convert-deployment-to-knative-service/) so it can scale to zero.

Deploy on the **`k3d-knative`** cluster from exercise 5.6 (Knative Serving + Kourier + Magic DNS).

## Image

Knative tries to resolve image digests from Docker Hub. For a local image:

```powershell
docker tag msami936/ping-pong:4.1 dev.local/ping-pong:5.7   # or rebuild
k3d image import dev.local/ping-pong:5.7 -c knative
# `dev.local` is in registries-skipping-tag-resolving by default
```

Do **not** set env `PORT` on the Knative container — it is reserved; Knative injects it from `containerPort`.

## Deploy

```powershell
kubectl config use-context k3d-knative
kubectl create namespace exercises --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f ../../postgres/secret.yaml
kubectl apply -f ../../postgres/service.yaml
kubectl apply -f ../../postgres/statefulset.yaml
kubectl apply -f ksvc.yaml
kubectl apply -f log-output.yaml

kubectl wait --for=condition=Ready ksvc/ping-pong -n exercises --timeout=180s
kubectl get ksvc -n exercises
```

## Call via FQDN (from log-output)

```text
PINGPONG_URL=http://ping-pong.exercises.svc.cluster.local/pings
```

Short names like `http://ping-pong:3000` break under Knative Host-based routing (port 80, FQDN Host).

## Access from the host

```powershell
curl -H "Host: ping-pong.exercises.172.21.0.3.sslip.io" http://localhost:18081/
# pong N

kubectl -n exercises port-forward svc/log-output 8080:3000
# http://localhost:8080/status  → includes Ping / Pongs
```

Optional browser `/pingpong` path: Gateway API [URL rewrite](https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/) Host → `ping-pong.exercises.<ip>.sslip.io`, path `/pingpong` → `/` (see `httproute-tip.yaml`).

## Scale to zero

While log-output is up, its readiness probe keeps calling `/pings`, so ping-pong stays warm. Scale log-output to 0 to observe idle scale-down, then curl the Host URL to wake it.

```powershell
kubectl -n exercises scale deploy/log-output --replicas=0
kubectl get pods -n exercises -l serving.knative.dev/service=ping-pong -w
```
