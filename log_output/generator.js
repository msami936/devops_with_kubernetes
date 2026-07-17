const fs = require('fs')
const { randomUUID } = require('crypto')

const LOG_FILE = process.env.LOG_FILE || '/shared/log.txt'
const randomString = randomUUID()

const writeStatus = () => {
  const line = `${new Date().toISOString()}: ${randomString}`
  fs.appendFileSync(LOG_FILE, `${line}\n`)
  console.log(line)
}

writeStatus()
setInterval(writeStatus, 5000)
