# Todo app (exercise project)

From exercise **4.10** the project is split into two repositories:

| Repository | Contents |
|---|---|
| [todo-app-code](https://github.com/msami936/todo-app-code) | Frontend, backend, broadcaster source + CI |
| [todo-app-configs](https://github.com/msami936/todo-app-configs) | Kustomize base/overlays + GitOps targets |

Flux on k3d (see [`../clusters/k3d/todo-app.yaml`](../clusters/k3d/todo-app.yaml)) pulls **only** from `todo-app-configs`.

```text
todo-app-code (push main / tag)
        │  build & push images
        │  commit image tags
        ▼
todo-app-configs (main)
        │  Flux reconcile
        ▼
   staging / production namespaces
```

## Environments (4.9)

| Env | Namespace | Config path | Broadcaster | DB backup |
|---|---|---|---|---|
| Staging | `staging` | `kustomize/overlays/staging` | log only | no |
| Production | `production` | `kustomize/overlays/production` | webhook Secret | CronJob |

## Legacy tree in this course repo

`the_project/` still contains a historical copy of app + manifests used for earlier exercises (1.x–4.9). **GitOps source of truth after 4.10 is the two repos above.** Prefer changing code in `todo-app-code` and manifests in `todo-app-configs`.

## Secrets

Applied outside GitOps (e.g. `broadcaster-secret` in `production`).
