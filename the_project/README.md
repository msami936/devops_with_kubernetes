# Todo app

Frontend serves HTML/JS and the cached Picsum image. Todo items are stored by a separate **todo-backend** service.

All ports, URLs, and other settings come from ConfigMaps (no hardcoded config in source).

## Architecture

- `todo-app` – HTML, form UI, image cache on PVC
- `todo-backend` – `GET /todos` and `POST /todos` stored in Postgres (140-char limit; request logging to stdout)
- ConfigMaps: `todo-app-config`, `todo-backend-config`
- Secret + StatefulSet: `todo-postgres-secret`, `todo-postgres`
- CronJob `wiki-todo`: every hour adds `Read <wikipedia-url>` via the backend API (truncated to 140 chars)

Ingress routes `/todos` to the backend and `/` to the frontend.

## Logging (exercise 2.10)

The backend logs every `POST /todos` to stdout, including rejected (too long) payloads. With Loki + Promtail + Grafana:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm upgrade --install loki grafana/loki-stack \
  --namespace=loki-stack --create-namespace \
  --set grafana.enabled=true \
  --set grafana.adminPassword=admin
```

Port-forward Grafana and open Explore → Loki:

```bash
kubectl port-forward -n loki-stack svc/loki-grafana 3000:80
```

Login: `admin` / `admin`. Example LogQL:

```
{namespace="project", app="todo-backend"} |= "todo request"
```

Test a too-long todo (expect HTTP 400 and a rejection log in Grafana):

```bash
kubectl port-forward -n project svc/todo-backend 3001:3001
# then POST a body with content longer than 140 characters
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

## Build images

```bash
docker build -t todo-app:2.6 .
docker build -t todo-backend:2.10 ./backend
```

## Deploy to Kubernetes (k3d)

Project resources run in the `project` namespace.

```bash
k3d cluster create k3s-default -p "8081:80@loadbalancer"
```

Then:

```bash
k3d image import todo-app:2.6 todo-backend:2.10 -c k3s-default

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
