import { createApp } from './app.js'
import { env } from './lib/env.js'
import { startScheduler } from './lib/scheduler.js'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`)
})

startScheduler()
