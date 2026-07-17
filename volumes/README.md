# Shared volumes

Cluster-level PersistentVolume and PersistentVolumeClaim used by the Log output and Ping-pong applications.

```bash
kubectl apply -f .
```

- PV/PVC for Log output + Ping-pong: `shared-pv` / `shared-pvc`
- PV/PVC for Todo image cache: `todo-image-pv` / `todo-image-pvc`
