# Flux GitOps (k3d)

Flux is bootstrapped against this path (`flux bootstrap ... --path=./clusters/k3d`).

| Resource | Role |
|---|---|
| `flux-system/` | Flux controllers + self-manage sync |
| `log-output.yaml` | Syncs `./log_output/manifests` into the cluster |

See [`log_output/README.md`](../log_output/README.md) for exercise 4.7 details.
