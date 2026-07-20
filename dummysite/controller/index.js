const k8s = require('@kubernetes/client-node')

const GROUP = 'stable.dwk'
const VERSION = 'v1'
const PLURAL = 'dummysites'
const SERVICE_TYPE = process.env.SERVICE_TYPE || 'LoadBalancer'

const kc = new k8s.KubeConfig()
if (process.env.KUBERNETES_SERVICE_HOST) {
  kc.loadFromCluster()
} else {
  kc.loadFromDefault()
}

const customApi = kc.makeApiClient(k8s.CustomObjectsApi)
const appsApi = kc.makeApiClient(k8s.AppsV1Api)
const coreApi = kc.makeApiClient(k8s.CoreV1Api)

function resourceName(siteName) {
  return `dummysite-${siteName}`
}

function ownerRef(site) {
  return {
    apiVersion: `${GROUP}/${VERSION}`,
    kind: 'DummySite',
    name: site.metadata.name,
    uid: site.metadata.uid,
    controller: true,
    blockOwnerDeletion: true,
  }
}

function labelsFor(site) {
  return {
    app: resourceName(site.metadata.name),
    'dummysite.stable.dwk/name': site.metadata.name,
  }
}

function buildDeployment(site) {
  const name = resourceName(site.metadata.name)
  const url = site.spec.website_url
  const labels = labelsFor(site)

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace: site.metadata.namespace,
      labels,
      ownerReferences: [ownerRef(site)],
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: labels },
      template: {
        metadata: { labels },
        spec: {
          initContainers: [
            {
              name: 'fetch-site',
              image: 'curlimages/curl:8.5.0',
              env: [{ name: 'WEBSITE_URL', value: url }],
              command: [
                'sh',
                '-c',
                [
                  'echo "Fetching $WEBSITE_URL"',
                  'curl -fsSL -A "DummySite-Controller/5.1" -L --max-time 60 "$WEBSITE_URL" -o /data/index.html \\',
                  '  || printf "<html><body><h1>Failed to fetch</h1><p>%s</p></body></html>\\n" "$WEBSITE_URL" > /data/index.html',
                  'ls -la /data',
                ].join('\n'),
              ],
              volumeMounts: [{ name: 'html', mountPath: '/data' }],
            },
          ],
          containers: [
            {
              name: 'nginx',
              image: 'nginx:1.25-alpine',
              ports: [{ containerPort: 80, name: 'http' }],
              volumeMounts: [{ name: 'html', mountPath: '/usr/share/nginx/html', readOnly: true }],
              resources: {
                requests: { cpu: '10m', memory: '32Mi' },
                limits: { cpu: '100m', memory: '128Mi' },
              },
            },
          ],
          volumes: [{ name: 'html', emptyDir: {} }],
        },
      },
    },
  }
}

function buildService(site) {
  const name = resourceName(site.metadata.name)
  const labels = labelsFor(site)

  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name,
      namespace: site.metadata.namespace,
      labels,
      ownerReferences: [ownerRef(site)],
    },
    spec: {
      type: SERVICE_TYPE,
      selector: labels,
      ports: [{ name: 'http', port: 80, targetPort: 80 }],
    },
  }
}

async function exists(fn) {
  try {
    await fn()
    return true
  } catch (err) {
    if (err?.response?.statusCode === 404 || err?.code === 404 || err?.statusCode === 404) {
      return false
    }
    // Newer client may use HttpError with body
    const status = err?.response?.status || err?.body?.code
    if (status === 404) return false
    throw err
  }
}

async function ensureDeployment(site) {
  const name = resourceName(site.metadata.name)
  const ns = site.metadata.namespace
  const body = buildDeployment(site)

  const found = await exists(() =>
    appsApi.readNamespacedDeployment({ name, namespace: ns }),
  )
  if (found) {
    console.log(`Deployment ${ns}/${name} already exists`)
    return
  }
  await appsApi.createNamespacedDeployment({ namespace: ns, body })
  console.log(`Created Deployment ${ns}/${name}`)
}

async function ensureService(site) {
  const name = resourceName(site.metadata.name)
  const ns = site.metadata.namespace
  const body = buildService(site)

  const found = await exists(() =>
    coreApi.readNamespacedService({ name, namespace: ns }),
  )
  if (found) {
    console.log(`Service ${ns}/${name} already exists`)
    return
  }
  await coreApi.createNamespacedService({ namespace: ns, body })
  console.log(`Created Service ${ns}/${name} (type=${SERVICE_TYPE})`)
}

async function reconcile(site) {
  const name = site.metadata.name
  const ns = site.metadata.namespace
  const url = site.spec?.website_url

  if (!url) {
    console.warn(`DummySite ${ns}/${name} has no website_url, skipping`)
    return
  }

  console.log(`Reconciling DummySite ${ns}/${name} -> ${url}`)
  try {
    await ensureDeployment(site)
    await ensureService(site)
  } catch (err) {
    console.error(`Failed to reconcile ${ns}/${name}:`, err?.body || err?.message || err)
  }
}

async function startWatch() {
  const watch = new k8s.Watch(kc)
  console.log('DummySite controller watching dummysites.stable.dwk ...')

  const path = `/apis/${GROUP}/${VERSION}/${PLURAL}`

  const run = async () => {
    try {
      await watch.watch(
        path,
        {},
        async (type, apiObj) => {
          if (type === 'ADDED' || type === 'MODIFIED') {
            // Skip if deleting
            if (apiObj.metadata?.deletionTimestamp) return
            await reconcile(apiObj)
          } else if (type === 'DELETED') {
            console.log(
              `DummySite ${apiObj.metadata.namespace}/${apiObj.metadata.name} deleted (owned resources GC'd via ownerReferences)`,
            )
          }
        },
        (err) => {
          if (err) {
            console.error('Watch ended with error, restarting in 5s:', err?.message || err)
          } else {
            console.log('Watch ended, restarting in 5s')
          }
          setTimeout(run, 5000)
        },
      )
    } catch (err) {
      console.error('Failed to start watch, retrying in 5s:', err?.message || err)
      setTimeout(run, 5000)
    }
  }

  // Also reconcile existing sites once at startup
  try {
    const list = await customApi.listCustomObjectForAllNamespaces({
      group: GROUP,
      version: VERSION,
      plural: PLURAL,
    })
    const items = list?.items || list?.body?.items || []
    console.log(`Found ${items.length} existing DummySite(s)`)
    for (const site of items) {
      await reconcile(site)
    }
  } catch (err) {
    console.warn('Initial list failed (CRD may not be ready yet):', err?.message || err)
  }

  await run()
}

startWatch().catch((err) => {
  console.error('Controller crashed:', err)
  process.exit(1)
})
