# Greeter service (exercise 5.3)

HTTP greeter used by the log-output app inside the Istio ambient mesh.

- **v1** / **v2** Deployments (`VERSION` env) → `Hello from version N`
- **greeter-svc** – parent Service (called by log-output)
- **greeter-svc-1** / **greeter-svc-2** – version selectors for weighted routing
- **HTTPRoute** – 75% → svc-1 (v1), 25% → svc-2 (v2)

Requires Istio ambient + a waypoint in `exercises` (see `../istio/README.md` and log_output README).

```bash
docker build -t msami936/greeter:5.3 .
docker push msami936/greeter:5.3
kubectl apply -f manifests/
```
