# Shared volumes

Cluster-level PersistentVolume and PersistentVolumeClaim used by the Log output and Ping-pong applications.

```bash
kubectl apply -f .
```

- PV: `shared-pv` (hostPath `/var/lib/shared-data`)
- PVC: `shared-pvc`
