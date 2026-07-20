# Wikipedia with init + sidecar (Exercise 5.4)

One Pod, three containers, shared [`emptyDir`](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir) at `/usr/share/nginx/html`:

| Container | Role |
|-----------|------|
| **fetch-kubernetes** (init) | `curl` [Kubernetes](https://en.wikipedia.org/wiki/Kubernetes) → `index.html` |
| **nginx** (main) | Serves the shared www directory |
| **random-refresher** (sidecar) | Sleeps 5–15 min, then `curl -L` [Special:Random](https://en.wikipedia.org/wiki/Special:Random) → replaces `index.html` |

## Deploy

```bash
kubectl apply -f manifests/
kubectl -n exercises rollout status deploy/wikipedia
kubectl port-forward -n exercises svc/wikipedia 8080:80
# open http://localhost:8080  → Kubernetes article (until sidecar refreshes)
```

Sidecar logs:

```bash
kubectl -n exercises logs -l app=wikipedia -c random-refresher -f
```
