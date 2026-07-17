# Todo app

Simple web server for the course project. Listens on the port given by the `PORT` environment variable (default `3000`) and logs `Server started in port NNNN` on startup.

## Run locally

```bash
PORT=3000 node index.js
```

## Build and run with Docker

```bash
docker build -t todo-app:1.2 .
docker run --rm -e PORT=3000 -p 3000:3000 todo-app:1.2
```

## Deploy to Kubernetes (k3d)

```bash
k3d image import todo-app:1.2 -c k3s-default

kubectl create deployment todo-app --image=todo-app:1.2
kubectl set env deployment/todo-app PORT=3000
kubectl patch deployment todo-app -p '{"spec":{"template":{"spec":{"containers":[{"name":"todo-app","imagePullPolicy":"Never"}]}}}}'

kubectl get pods
kubectl logs -l app=todo-app
```

You will not have external access to the port yet; networking comes in later exercises.
