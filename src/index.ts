import { initializeSession, EventEmitter } from 'session-messenger-nodejs'

import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url)) + '/'

await initializeSession({ profileDataPath: __dirname + '../session-data' })
const events = new EventEmitter()
events.on('message', message => {
  console.log(message.toJSON())
})