# Exercise 5.5 — Platform comparison

**Verdict (arbitrary):** **Rancher is “better”** for this course-style / multi-cluster Kubernetes use case than **OpenShift**.

## Why Rancher wins (for us)

- **Kubernetes-native, not a fork** — manages upstream Kubernetes (k3s, RKE2, EKS, GKE, AKS, …) instead of a heavily customized distribution
- **Lower lock-in** — clusters stay closer to vanilla Kubernetes APIs and tooling (`kubectl`, Helm, Flux)
- **Faster to try locally** — pairs naturally with **k3s/k3d**, matching this course
- **Simpler mental model** — cluster lifecycle + fleet management, not a full opinionated PaaS
- **Cost / licensing** — generally cheaper / freer to experiment with than OpenShift enterprise subscriptions
- **Multi-cluster strength** — built around managing many clusters without one vendor runtime everywhere

## Where OpenShift is stronger (but we still pick Rancher)

- **Batteries included** — Routes, Operators, Pipelines, registry, monitoring, security defaults
- **Enterprise support & compliance** — strong for regulated orgs on a Red Hat stack
- **Opinionated security** — SCCs and tighter defaults
- **Developer PaaS feel** — BuildConfigs, Source-to-Image, Developer Console

## Bottom line

OpenShift is excellent as a **full application platform**. For learning, GitOps, and running workloads on **vanilla Kubernetes** (GKE + k3d), Rancher’s lighter multi-distro approach fits better.
