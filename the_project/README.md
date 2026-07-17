# Todo app

Frontend serves HTML/JS and the cached Picsum image. Todo items are stored by a separate **todo-backend** service.

Configuration is managed with **Kustomize** (`kustomize/base` + overlays).

## Architecture

- `todo-app` – HTML, form UI, image cache on PVC
- `todo-backend` – `GET /todos` and `POST /todos` stored in Postgres (140-char limit; request logging)
- ConfigMaps: `todo-app-config`, `todo-backend-config`
- Secret + StatefulSet: `todo-postgres-secret`, `todo-postgres`
- CronJob `wiki-todo`: hourly Wikipedia read todos
- Ingress (GKE overlay): `/` → frontend, `/todos` → backend

## Kustomize layout

```text
kustomize/
  base/                 # shared resources
  overlays/
    gke/                # Docker Hub images + GCE Ingress
```

Preview:

```bash
kubectl kustomize kustomize/overlays/gke
```

## Deploy to GKE (exercise 3.5)

```bash
# Build & push
docker build -t msami936/todo-app:3.5 .
docker build -t msami936/todo-backend:3.5 ./backend
docker push msami936/todo-app:3.5
docker push msami936/todo-backend:3.5

# Apply via Kustomize
kubectl apply -k kustomize/overlays/gke

kubectl get pods,svc,ingress,pvc -n project
kubectl get ingress todo-app -n project --watch
```

Test:

```bash
curl http://INGRESS-IP/
curl http://INGRESS-IP/todos
```

## Run locally

Terminal 1 (backend):

```bash
cd backend
PORT=3001 TODOS_PATH=/todos MAX_TODO_LENGTH=140 \
DATABASE_URL=postgres://postgres:postgres@localhost:5432/todos \
node index.js
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

## Legacy manifests (k3d)

The older `manifests/` + `postgres/` files remain for local k3d from earlier exercises:

```bash
kubectl apply -f ../namespaces/project.yaml
kubectl apply -f postgres/
kubectl apply -f ../volumes/todo-persistentvolume.yaml
kubectl apply -f ../volumes/todo-persistentvolumeclaim.yaml
kubectl apply -f manifests/
```
