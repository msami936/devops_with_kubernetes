# Exercise 5.6 — Trying serverless (Knative Serving)

Knative Serving **v1.22.1** on a dedicated k3d cluster with **Kourier** + **Magic DNS (sslip.io)**.

Guide followed: [Install Serving with YAML](https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/).

## Cluster

Existing `k3s-default` already used host port **8081**, so this cluster uses **18081/18082** instead:

```powershell
k3d cluster create knative `
  --port "18082:30080@agent:0" `
  -p "18081:80@loadbalancer" `
  --agents 2 `
  --k3s-arg "--disable=traefik@server:0" `
  --image rancher/k3s:v1.34.1-k3s1

kubectl config use-context k3d-knative
```

(Course sample uses `8081`/`8082` when those ports are free.)

## Install

```powershell
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.22.1/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.22.1/serving-core.yaml
kubectl apply -f https://github.com/knative-extensions/net-kourier/releases/download/knative-v1.22.1/kourier.yaml

kubectl patch configmap/config-network -n knative-serving --type merge `
  --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'

# Magic DNS
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.22.1/serving-default-domain.yaml
```

Pods in `knative-serving` became Ready after images finished pulling (transient `ContainerCreating` / webhook cert bootstrap is normal).

## Hello service + demos

Manifests: `manifests/hello.yaml` (deploy), then update TARGET / traffic as in:

- [Deploying a Knative Service](https://knative.dev/docs/getting-started/first-service/)
- [Autoscaling](https://knative.dev/docs/getting-started/first-autoscale/)
- [Traffic splitting](https://knative.dev/docs/getting-started/first-traffic-split/)

```powershell
kubectl apply -f manifests/hello.yaml
kubectl get ksvc
# URL e.g. http://hello.default.172.21.0.3.sslip.io

curl -H "Host: hello.default.172.21.0.3.sslip.io" http://localhost:18081/
# Hello World!
```

### Verified

| Step | Result |
|------|--------|
| Deploy | `Hello World!` |
| Scale to zero | Pod `Terminating` ~2 min idle; curl brings a new pod |
| New revision `TARGET=Knative` | `Hello Knative!` |
| 50/50 traffic | Mixed `Hello World!` / `Hello Knative!` |

## Switch contexts

```powershell
kubectl config use-context k3d-knative      # this exercise
kubectl config use-context k3d-k3s-default  # previous course work
```
