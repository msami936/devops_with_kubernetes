const { randomUUID } = require('crypto')

const randomString = randomUUID()

const printStatus = () => {
  const timestamp = new Date().toISOString()
  console.log(`${timestamp}: ${randomString}`)
}

printStatus()
setInterval(printStatus, 5000)
