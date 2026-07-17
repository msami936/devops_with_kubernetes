# Todo app

Frontend serves HTML/JS and the cached Picsum image. Todo items are stored by a separate **todo-backend** service.

Configuration is managed with **Kustomize** (`kustomize/base` + overlays).

## Architecture

- `todo-app` – HTML, form UI, image cache on PVC
- `todo-backend` – `GET /todos` and `POST /todos` stored in Postgres (140-char limit; request logging)
- ConfigMaps: `todo-app-config`, `todo-backend-config`
- Secret + StatefulSet: `todo-postgres-secret`, `todo-postgres`
- CronJob `wiki-todo`: hourly Wikipedia read todos
- CronJob `todo-db-backup`: daily `pg_dump` → Google Cloud Storage
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

## Deploy to GKE (exercise 3.5–3.7)

```bash
# Build & push
docker build -t msami936/todo-app:3.7 .
docker build -t msami936/todo-backend:3.7 ./backend
docker push msami936/todo-app:3.7
docker push msami936/todo-backend:3.7

# Apply via Kustomize (from repo root) — default namespace: project
kubectl apply -k the_project/kustomize/overlays/gke

kubectl get pods,svc,ingress,pvc -n project
kubectl get ingress todo-app -n project --watch
```

`todo-app` uses a **ReadWriteOnce** PVC for the image cache, so its Deployment uses [`strategy: Recreate`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy) instead of RollingUpdate (avoids two pods mounting the same volume).

### Automatic deployment (exercise 3.6 / 3.7)

GitHub Actions workflow: [`.github/workflows/project-gke.yml`](../.github/workflows/project-gke.yml)

On push (changes under `the_project/`), it builds both images, pushes to Docker Hub, and deploys with Kustomize into a **per-branch namespace**:

| Branch | Namespace |
|--------|-----------|
| `main` | `project` |
| any other branch | same as the branch name |

Branch names are assumed to be valid Kubernetes namespace names.

### Delete environment on branch delete (exercise 3.8)

Workflow: [`.github/workflows/project-delete-env.yml`](../.github/workflows/project-delete-env.yml)

When a branch is deleted, the matching namespace is removed from the cluster. The `project` namespace (from `main`) is never deleted by this workflow.

Required repository secrets:

| Secret | Value |
|--------|--------|
| `DOCKERHUB_TOKEN` | Docker Hub access token for `msami936` |
| `GKE_SA_KEY` | JSON key for a GCP service account with `roles/container.developer` |

Test:

```bash
curl http://INGRESS-IP/
curl http://INGRESS-IP/todos

# Feature-branch environment (example branch: demo)
kubectl get pods,svc,ingress -n demo

# After deleting the branch remotely:
# git push origin --delete demo
kubectl get ns demo   # NotFound
```

## DBaaS vs DIY (exercise 3.9)

This project currently runs **DIY Postgres**: a StatefulSet + PVC inside the cluster (see `kustomize/base/postgres.yaml`). The alternative on GKE is **DBaaS**, e.g. [Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres).

### Initialization — work and cost

| | DIY (StatefulSet + PVC) | DBaaS (e.g. Cloud SQL) |
|--|-------------------------|-------------------------|
| **Work to start** | Write manifests (StatefulSet, Service, Secret, PVC), wire `DATABASE_URL`, choose storage class. Fits the same `kubectl apply` / CI path as the app. | Create instance (console/Terraform/API), networking (VPC / private IP / Auth Proxy or Workload Identity), DB user/password, connect the backend. More GCP-specific glue, less Kubernetes YAML. |
| **Up-front cost** | Mostly cluster + disk: PVC storage is cheap; DB shares node CPU/RAM with other pods. | Dedicated instance bill from day one (vCPU, RAM, storage), even when idle. Small Cloud SQL instances are often more expensive than a bit of node capacity for a tiny course app. |
| **Time to first working DB** | Fast if you already deploy K8s manifests; you own image, version, and env. | Fast for a default public instance; slower if you set up private networking and least-privilege access properly. |

### Maintenance

| | DIY | DBaaS |
|--|-----|-------|
| **Who patches OS / Postgres** | You (image tags, rolling restarts, testing upgrades). | Provider (scheduled maintenance windows; you still choose major versions). |
| **HA / failover** | You design it (replicas, operators, or accept single-pod risk). A lone StatefulSet is a single point of failure. | Built-in regional HA / failover options with a checkbox (and higher price). |
| **Scaling** | Resize PVC / nodes; vertical/horizontal DB scaling is manual and careful. | Resize instance / add read replicas via API; easier but still needs app awareness. |
| **Config / extensions** | Full control (`postgresql.conf`, extensions, custom images). | Limited to what the service allows; some knobs only via larger machine tiers. |
| **Monitoring** | You wire Prometheus/Grafana/logging (as in earlier course parts). | Metrics and logs integrate with Cloud Monitoring out of the box. |
| **Portability** | Same pattern works on k3d, GKE, or another cloud with small changes. | Tied to one cloud vendor’s product and networking model. |

### Backups and restore

| | DIY | DBaaS |
|--|-----|-------|
| **What you get by default** | PVC persistence across pod restarts. **Not** a backup strategy: deleting the namespace/PVC (or a bad reclaim policy) can lose data. | Automated backups and retention policies are part of the product. |
| **How you back up** | You schedule `pg_dump` / volume snapshots / an operator’s backup CRDs; store dumps elsewhere (GCS); test restores yourself. | Console/API: on-demand backup, PITR (point-in-time recovery) on supported tiers; restore to a new instance with little custom scripting. |
| **Ease** | Flexible but easy to get wrong; restore drills are your responsibility. | Much easier day-to-day; restore is a documented product flow rather than a custom runbook. |

### Summary for this project

- **DIY** wins on learning value, cost for a small GKE cluster, and keeping everything in Kustomize/CI. You trade that for owning upgrades, HA, and real backups.
- **DBaaS** wins when uptime, managed backups/PITR, and low ops load matter more than control or monthly bill.

For this course app we keep **DIY Postgres** (StatefulSet + PVC): it matches the Kubernetes exercises, stays cheap on a single-node cluster, and is enough for ephemeral branch environments. For production traffic or data you cannot afford to lose, **Cloud SQL** (or similar) would be the safer default unless the team deliberately invests in operators, HA, and tested backup/restore.

## Database backup to GCS (exercise 3.10)

CronJob `todo-db-backup` runs once per day (`0 0 * * *`), dumps the `todos` database with `pg_dump`, and uploads `backup-YYYY-MM-DD.sql` to bucket `gs://msami936-todo-db-backups`.

Manifest: [`kustomize/base/cronjob-db-backup.yaml`](kustomize/base/cronjob-db-backup.yaml)

The GCS credentials are **not** in git. Create them once on the cluster:

```bash
# Service account + key (example — already done for this project as todo-backup-sa)
gcloud iam service-accounts create todo-backup-sa --display-name="Todo DB Backup Storage SA"
gcloud projects add-iam-policy-binding sigma-tractor-452214-c9 \
  --role="roles/storage.objectCreator" \
  --member="serviceAccount:todo-backup-sa@sigma-tractor-452214-c9.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding sigma-tractor-452214-c9 \
  --role="roles/storage.objectViewer" \
  --member="serviceAccount:todo-backup-sa@sigma-tractor-452214-c9.iam.gserviceaccount.com"
gcloud iam service-accounts keys create key.json \
  --iam-account=todo-backup-sa@sigma-tractor-452214-c9.iam.gserviceaccount.com

kubectl create secret generic storage-sa-key -n project --from-file=key.json=key.json
rm key.json   # do not commit
```

Manual test:

```bash
kubectl create job --from=cronjob/todo-db-backup todo-db-backup-manual -n project
kubectl logs -f job/todo-db-backup-manual -n project
gcloud storage ls gs://msami936-todo-db-backups/
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
