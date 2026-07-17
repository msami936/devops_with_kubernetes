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

## Deploy to GKE (exercise 3.5 / 3.6)

```bash
# Build & push
docker build -t msami936/todo-app:3.6 .
docker build -t msami936/todo-backend:3.6 ./backend
docker push msami936/todo-app:3.6
docker push msami936/todo-backend:3.6

# Apply via Kustomize (from repo root)
kubectl apply -k the_project/kustomize/overlays/gke

kubectl get pods,svc,ingress,pvc -n project
kubectl get ingress todo-app -n project --watch
```

`todo-app` uses a **ReadWriteOnce** PVC for the image cache, so its Deployment uses [`strategy: Recreate`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy) instead of RollingUpdate (avoids two pods mounting the same volume).

### Automatic deployment (exercise 3.6)

GitHub Actions workflow: [`.github/workflows/project-gke.yml`](../.github/workflows/project-gke.yml)

On push to `main` (changes under `the_project/`), it builds both images, pushes to Docker Hub, updates the GKE Kustomize overlay image tags, and applies them.

Required repository secrets:

| Secret | Value |
|--------|--------|
| `DOCKERHUB_TOKEN` | Docker Hub access token for `msami936` |
| `GKE_SA_KEY` | JSON key for a GCP service account with `roles/container.developer` |

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
