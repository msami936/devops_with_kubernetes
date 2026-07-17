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

Create the cluster with a host mapping for the NodePort (30080):

```bash
k3d cluster create k3s-default -p "8080:30080@server:0"
```

Then:

```bash
k3d image import todo-app:1.5 -c k3s-default

kubectl apply -f manifests/

kubectl get pods,svc
kubectl logs -l app=todo-app
```

## Access via NodePort

The Service exposes the app on NodePort `30080`, mapped to host port `8080`.

Open http://localhost:8080 in a browser.
