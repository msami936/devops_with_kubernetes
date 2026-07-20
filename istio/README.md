# Exercise 5.2 — Getting started with Istio (ambient)

Walkthrough of the [Istio ambient getting started](https://istio.io/latest/docs/ambient/getting-started/) guide on **k3d**, through [Clean up](https://istio.io/latest/docs/ambient/getting-started/cleanup/).

## CLI

```powershell
# Windows: download release zip from GitHub (e.g. istio-1.30.3-win.zip)
# Add istio-1.30.3\bin to PATH
istioctl version --remote=false
```

## Install on k3d

Default `global.platform=k3d` alone mounted CNI binaries under `/bin`, while this k3s node looks in `/var/lib/rancher/k3s/data/cni`. Install with explicit paths:

```powershell
istioctl install --set profile=ambient `
  --set values.global.platform=k3d `
  --set values.cni.cniConfDir=/var/lib/rancher/k3s/agent/etc/cni/net.d `
  --set values.cni.cniBinDir=/var/lib/rancher/k3s/data/cni `
  --skip-confirmation
```

Gateway API CRDs were already present; otherwise:

```powershell
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/experimental-install.yaml
```

## Sample app (Bookinfo)

From the Istio release directory:

```powershell
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/platform/kube/bookinfo-versions.yaml
kubectl apply -f samples/bookinfo/gateway-api/bookinfo-gateway.yaml
kubectl annotate gateway bookinfo-gateway networking.istio.io/service-type=ClusterIP --namespace=default
kubectl port-forward svc/bookinfo-gateway-istio 8080:80
# http://localhost:8080/productpage
```

Join ambient mesh:

```powershell
kubectl label namespace default istio.io/dataplane-mode=ambient
```

## Kiali + existing Prometheus

Did **not** install `samples/addons/prometheus.yaml`. Pointed Kiali at the cluster Prometheus (`prometheus` namespace, kube-prometheus-stack):

```yaml
prometheus:
  enabled: true
  url: http://prometheus-kube-prometheus-prometheus.prometheus:9090
```

See patched `kiali.yaml` in this folder. Apply with `kubectl apply -f kiali.yaml`.

## Auth + traffic (verified)

- L4 `AuthorizationPolicy` on `productpage` (ztunnel) — curl pod blocked, gateway allowed
- Waypoint + L7 policy — `DELETE` and foreign SAs denied; curl `GET` allowed
- `HTTPRoute` reviews 90/10 — observed ~36× v1 / 4× v2 over 20 requests

## Clean up

Followed the official cleanup (waypoint, ambient label, Bookinfo, curl, Kiali, `istioctl uninstall --purge`, delete `istio-system`). Gateway API CRDs left in place (they existed before this exercise).

## References

- [What is Istio](https://istio.io/latest/docs/overview/what-is-istio/)
- [Dataplane modes](https://istio.io/latest/docs/overview/dataplane-modes/)
- [Ambient overview](https://istio.io/latest/docs/ambient/overview/)
- [k3d platform prerequisites](https://istio.io/latest/docs/ambient/install/platform-prerequisites/#k3d)
