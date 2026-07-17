# Todo app

Web server for the course project. Displays a Lorem Picsum image cached on a PersistentVolume for 10 minutes.

## Behaviour

- Fetches https://picsum.photos/1200 and stores it under `/data`
- Serves the same cached image for 10 minutes
- After expiry, serves the old image once more, then fetches a new one on the following request
- `GET /crash` exits the process (useful to test that the volume keeps the image across pod restarts)

## Run locally

```bash
mkdir -p ./data
DATA_DIR=./data PORT=3000 node index.js
```

Open http://localhost:3000

## Build and run with Docker

```bash
docker build -t todo-app:1.12 .
docker run --rm -e PORT=3000 -e DATA_DIR=/data -v todo-data:/data -p 3000:3000 todo-app:1.12
```

## Deploy to Kubernetes (k3d)

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import todo-app:1.12 -c k3s-default

kubectl apply -f ../volumes/todo-persistentvolume.yaml
kubectl apply -f ../volumes/todo-persistentvolumeclaim.yaml
kubectl apply -f manifests/

kubectl get pods,svc,ingress,pv,pvc
```

## Access via Ingress

Open http://localhost:8081
