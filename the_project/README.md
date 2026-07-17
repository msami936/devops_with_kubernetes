# Todo app

Frontend serves HTML/JS and the cached Picsum image. Todo items are stored by a separate **todo-backend** service.

All ports, URLs, and other settings come from ConfigMaps (no hardcoded config in source).

## Architecture

- `todo-app` – HTML, form UI, image cache on PVC
- `todo-backend` – `GET /todos` and `POST /todos` stored in Postgres
- ConfigMaps: `todo-app-config`, `todo-backend-config`
- Secret + StatefulSet: `todo-postgres-secret`, `todo-postgres`

Ingress routes `/todos` to the backend and `/` to the frontend.

## Run locally

Terminal 1 (backend):

```bash
cd backend
PORT=3001 TODOS_PATH=/todos MAX_TODO_LENGTH=140 node index.js
```

Terminal 2 (frontend):

```bash
mkdir -p ./data
PORT=3000 \
DATA_DIR=./data \
CACHE_MS=600000 \
PICSUM_URL=https://picsum.photos/1200 \
TODOS_API_PATH=/todos \
IMAGE_ROUTE=/image \
IMAGE_FILENAME=image.jpg \
META_FILENAME=image-meta.json \
MAX_TODO_LENGTH=140 \
node index.js
```

## Build images

```bash
docker build -t todo-app:2.6 .
docker build -t todo-backend:2.8 ./backend
```

## Deploy to Kubernetes (k3d)

Project resources run in the `project` namespace.

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import todo-app:2.6 todo-backend:2.8 -c k3s-default

kubectl apply -f ../namespaces/project.yaml
kubectl apply -f postgres/
kubectl apply -f ../volumes/todo-persistentvolume.yaml
kubectl apply -f ../volumes/todo-persistentvolumeclaim.yaml
kubectl apply -f manifests/

kubectl get pods,svc,ingress,pvc -n project
```

If a PVC is stuck Pending after recreating the cluster, delete and recreate the PersistentVolume so it can bind again.

## Access via Ingress

Open http://localhost:8081

Create a todo with the form — it is saved via `POST /todos` and the list refreshes from `GET /todos`.
