# Log output app

Split into two containers in one pod that share an `emptyDir` volume:

1. **log-generator** – creates a random string on startup and appends `timestamp: string` to a file every 5 seconds
2. **log-reader** – HTTP server that returns ConfigMap data, the latest log line, and the ping-pong count over HTTP

Config comes from ConfigMap `log-output-config` ([ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/), [configure a Pod to use a ConfigMap](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/)):

- env `MESSAGE`
- file `information.txt` mounted at `/config/information.txt`

## Run locally

```bash
mkdir -p /tmp/shared /tmp/config
echo 'this text is from file' > /tmp/config/information.txt
LOG_FILE=/tmp/shared/log.txt node generator.js &
LOG_FILE=/tmp/shared/log.txt INFO_FILE=/tmp/config/information.txt MESSAGE='hello world' PINGPONG_URL=http://localhost:3001/pings PORT=3000 node reader.js
```

Open http://localhost:3000

## Build and run with Docker

```bash
docker build -t log-output:2.5 .
```

## Deploy to Kubernetes (k3d)

Log output and Ping-pong run in the `exercises` namespace.

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import log-output:2.5 ping-pong:2.1 -c k3s-default

kubectl apply -f ../namespaces/exercises.yaml
kubectl apply -f manifests/
kubectl apply -f ../ping_pong/manifests/

kubectl get pods,svc,ingress,configmap -n exercises
```

## Access via Ingress

- Log output: http://localhost:8081/
- Ping-pong: http://localhost:8081/pingpong

Example log-output response:

```text
file content: this text is from file
env variable: MESSAGE=hello world
2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43.
Ping / Pongs: 3
```

## Deploy to GKE (exercise 3.2)

Manifests: `manifests-gke/`. Shared Ingress lives in `../ping_pong/manifests-gke/ingress.yaml`.

```bash
docker build -t msami936/log-output:3.2 .
docker push msami936/log-output:3.2

kubectl apply -f ../namespaces/exercises.yaml
kubectl apply -f ../ping_pong/manifests-gke/postgres.yaml
kubectl apply -f ../ping_pong/manifests-gke/deployment.yaml
kubectl apply -f ../ping_pong/manifests-gke/service.yaml
kubectl apply -f manifests-gke/
kubectl apply -f ../ping_pong/manifests-gke/ingress.yaml
```
