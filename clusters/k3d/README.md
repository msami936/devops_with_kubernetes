# Flux GitOps (k3d)

Flux is bootstrapped against this path (`flux bootstrap ... --path=./clusters/k3d`).

| Resource | Role |
|---|---|
| `flux-system/` | Flux controllers + self-manage sync |
| `log-output.yaml` | Syncs `./log_output/manifests` (exercise 4.7) |
| `todo-project.yaml` | Syncs `./the_project/kustomize/overlays/local` from **main** (exercise 4.8) |

Create the broadcaster webhook Secret once (not stored in Git):

```bash
kubectl -n project create secret generic broadcaster-secret \
  --from-literal=BROADCASTER_URL='https://webhook.site/<uuid>' \
  --dry-run=client -o yaml | kubectl apply -f -
```
