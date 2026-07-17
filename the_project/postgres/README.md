# Project Postgres

StatefulSet (1 replica) for Todo backend data in the `project` namespace.

```bash
kubectl apply -f .
kubectl get pods,svc,statefulset,pvc -n project
```
