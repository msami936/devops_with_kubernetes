# Todo app

Frontend serves HTML/JS and the cached Picsum image. Todo items are stored by a separate **todo-backend** service.

## Architecture

- `todo-app` – HTML, form UI, image cache on PVC
- `todo-backend` – `GET /todos` and `POST /todos` (in-memory for now)

Ingress routes `/todos` to the backend and `/` to the frontend.

## Run locally

Terminal 1 (backend):

```bash
cd backend
PORT=3001 node index.js
```

Terminal 2 (frontend):

```bash
mkdir -p ./data
DATA_DIR=./data PORT=3000 node index.js
```

Open http://localhost:3000 — for local API calls without Ingress, point the browser UI at the backend or use a reverse proxy. In the cluster, `/todos` is routed by Ingress.

## Build images

```bash
docker build -t todo-app:2.2 .
docker build -t todo-backend:2.2 ./backend
```

## Deploy to Kubernetes (k3d)

Project resources run in the `project` namespace.

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import todo-app:2.2 todo-backend:2.2 -c k3s-default

kubectl apply -f ../namespaces/project.yaml
kubectl apply -f ../volumes/todo-persistentvolume.yaml
kubectl apply -f ../volumes/todo-persistentvolumeclaim.yaml
kubectl apply -f manifests/

kubectl get pods,svc,ingress,pvc -n project
```

If a PVC is stuck Pending after recreating the cluster, delete and recreate the PersistentVolume so it can bind again.

## Access via Ingress

Open http://localhost:8081

Create a todo with the form — it is saved via `POST /todos` and the list refreshes from `GET /todos`.
