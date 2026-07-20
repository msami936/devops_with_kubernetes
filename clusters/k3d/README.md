# Flux GitOps (k3d)

Flux is bootstrapped against this path (`flux bootstrap ... --path=./clusters/k3d`).

| Resource | Role |
|---|---|
| `flux-system/` | Flux controllers + self-manage sync (this repo) |
| `log-output.yaml` | Syncs `./log_output/manifests` from **this** repo (4.7) |
| `todo-app.yaml` | Syncs staging + production from **[todo-app-configs](https://github.com/msami936/todo-app-configs)** (4.9 / 4.10) |

Application source: [todo-app-code](https://github.com/msami936/todo-app-code).
