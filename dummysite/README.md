# DummySite CRD & Controller (Exercise 5.1)

Creates a `DummySite` custom resource with `spec.website_url`. A controller watches for new DummySites and creates:

- **Deployment** – nginx serving HTML fetched by a `curl` init container
- **Service** – exposes the site (`ClusterIP` locally; set `SERVICE_TYPE=LoadBalancer` on GKE)

The HTML copy does not need to be perfect (CSS/images may be broken for complex sites).

## Apply order

```bash
# 1. CRD
kubectl apply -f manifests/crd.yaml

# 2. Namespace, ServiceAccount, Role, Binding
kubectl apply -f manifests/rbac.yaml

# 3. Controller Deployment
kubectl apply -f manifests/deployment.yaml

# 4. DummySite
kubectl apply -f manifests/dummysite-example.yaml
```

## Verify

```bash
kubectl get dummysites -n dummysite
kubectl get deploy,svc,pods -n dummysite -l dummysite.stable.dwk/name=example

# Local / k3d
kubectl port-forward -n dummysite svc/dummysite-example 8080:80
# open http://localhost:8080  → Example Domain HTML

# GKE: set SERVICE_TYPE=LoadBalancer on the controller, then:
kubectl get svc dummysite-example -n dummysite
# open http://<EXTERNAL-IP>/
```

## Build

```bash
cd controller
docker build -t msami936/dummysite-controller:5.1 .
docker push msami936/dummysite-controller:5.1
```

## How it works

1. CRD `dummysites.stable.dwk` defines `DummySite` with `spec.website_url`.
2. Controller (Node.js + [`@kubernetes/client-node`](https://github.com/kubernetes-client/javascript)) watches `/apis/stable.dwk/v1/dummysites`.
3. On `ADDED`/`MODIFIED`, it creates a Deployment + Service owned by the DummySite (`ownerReferences` for garbage collection).
4. An init container curls the URL into an `emptyDir`; nginx serves `/usr/share/nginx/html`.
