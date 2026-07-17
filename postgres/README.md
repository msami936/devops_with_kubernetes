# Postgres for exercises

StatefulSet with one replica used by the Ping-pong app.

```bash
kubectl apply -f .
kubectl get pods,svc,statefulset,pvc -n exercises
```

Debug connection (as in the course hint):

```bash
kubectl run -it --rm --restart=Never --image postgres:16-alpine -n exercises psql-for-debugging -- \
  psql postgres://postgres:postgres@postgres:5432/pingpong
```
