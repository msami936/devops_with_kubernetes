const { connect, StringCodec } = require('nats')

const requiredEnv = (name) => {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const NATS_URL = requiredEnv('NATS_URL')
const FORWARD_TO_EXTERNAL = (process.env.FORWARD_TO_EXTERNAL || 'false').toLowerCase() === 'true'
const BROADCASTER_URL = process.env.BROADCASTER_URL || ''
const NATS_SUBJECT = process.env.NATS_SUBJECT || 'todos.>'
const QUEUE_GROUP = process.env.QUEUE_GROUP || 'broadcasters'
const POD_NAME = process.env.HOSTNAME || 'broadcaster'

if (FORWARD_TO_EXTERNAL && !BROADCASTER_URL) {
  throw new Error('BROADCASTER_URL is required when FORWARD_TO_EXTERNAL=true')
}

const sc = StringCodec()

const formatMessage = (subject, data) => {
  const action = subject.endsWith('.updated')
    ? 'updated'
    : subject.endsWith('.created')
      ? 'created'
      : 'changed'

  const content = data && data.content ? String(data.content) : ''
  const done =
    data && typeof data.done === 'boolean' ? ` (done=${data.done})` : ''

  return `A todo was ${action}${content ? `: ${content}` : ''}${done}`
}

const handleMessage = async (subject, data) => {
  const payload = {
    user: 'bot',
    message: formatMessage(subject, data),
  }

  if (!FORWARD_TO_EXTERNAL) {
    console.log(
      `[${POD_NAME}] log-only subject=${subject} message=${payload.message}`
    )
    return
  }

  const response = await fetch(BROADCASTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`webhook responded ${response.status}`)
  }

  console.log(
    `[${POD_NAME}] forwarded subject=${subject} message=${payload.message}`
  )
}

const run = async () => {
  console.log(
    `[${POD_NAME}] FORWARD_TO_EXTERNAL=${FORWARD_TO_EXTERNAL}`
  )

  for (;;) {
    let nc
    try {
      nc = await connect({ servers: NATS_URL })
      console.log(
        `[${POD_NAME}] connected to NATS at ${NATS_URL}, queue=${QUEUE_GROUP}, subject=${NATS_SUBJECT}`
      )

      const sub = nc.subscribe(NATS_SUBJECT, { queue: QUEUE_GROUP })
      for await (const msg of sub) {
        const raw = sc.decode(msg.data)
        let data
        try {
          data = JSON.parse(raw)
        } catch {
          console.log(`[${POD_NAME}] ignoring non-JSON message: ${raw}`)
          continue
        }

        try {
          await handleMessage(msg.subject, data)
        } catch (error) {
          console.error(`[${POD_NAME}] handle failed: ${error.message}`)
        }
      }
    } catch (error) {
      console.log(`[${POD_NAME}] waiting for NATS: ${error.message}`)
    } finally {
      try {
        if (nc) {
          await nc.close()
        }
      } catch {
        // ignore
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
