# Flux GitOps (k3d)

Flux is bootstrapped against this path (`flux bootstrap ... --path=./clusters/k3d`).

| Resource | Role |
|---|---|
| `flux-system/` | Flux controllers + self-manage sync |
| `log-output.yaml` | Syncs `./log_output/manifests` (exercise 4.7) |
| `todo-staging.yaml` | **main** → `./overlays/staging` → namespace `staging` (4.9) |
| `todo-production.yaml` | **semver tags ≥4.9.0** → `./overlays/production` → namespace `production` (4.9) |

Secrets (e.g. `broadcaster-secret` in `production`) are applied outside GitOps.

```bash
kubectl -n production create secret generic broadcaster-secret \
  --from-literal=BROADCASTER_URL='https://example.com/webhook' \
  --dry-run=client -o yaml | kubectl apply -f -
```
