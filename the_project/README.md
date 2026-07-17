# Todo app

Simple web server for the course project. Listens on the port given by the `PORT` environment variable (default `3000`) and logs `Server started in port NNNN` on startup.

A GET request to `/` returns a simple HTML page.

## Run locally

```bash
PORT=3000 node index.js
```

Open http://localhost:3000 in a browser.

## Build and run with Docker

```bash
docker build -t todo-app:1.5 .
docker run --rm -e PORT=3000 -p 3000:3000 todo-app:1.5
```

## Deploy to Kubernetes (k3d)

`PORT` is set in the Deployment via [`env`](https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/).

```bash
k3d image import todo-app:1.5 -c k3s-default

kubectl apply -f manifests/

kubectl get pods
kubectl logs -l app=todo-app
```

## Access with port-forward

```bash
kubectl port-forward deployment/todo-app 8080:3000
```

Then open http://localhost:8080 in a browser.

You will not have Ingress/Service access yet; networking comes in later exercises.
