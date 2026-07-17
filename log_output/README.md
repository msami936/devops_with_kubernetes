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

# Create a deployment
kubectl create deployment log-output --image=log-output:1.1

# Confirm it is running
kubectl get pods
kubectl logs -l app=log-output -f
```

Or, if the image is on Docker Hub:

```bash
kubectl create deployment log-output --image=<your-dockerhub-user>/log-output:1.1
kubectl logs -l app=log-output -f
```
