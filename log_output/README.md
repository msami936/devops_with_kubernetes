# Log output app

Generates a random string on startup and prints it every 5 seconds with a timestamp.

## Run locally

```bash
node index.js
```

## Build and run with Docker

```bash
docker build -t log-output:1.1 .
docker run --rm log-output:1.1
```

## Deploy to Kubernetes (k3d)

```bash
# Import the local image into the k3d cluster
k3d image import log-output:1.1 -c k3s-default

# Apply the declarative deployment
kubectl apply -f manifests/

# Confirm it is running
kubectl get pods
kubectl logs -l app=log-output -f
```

Restart the deployment:

```bash
kubectl rollout restart deployment/log-output
kubectl logs -l app=log-output -f
```
