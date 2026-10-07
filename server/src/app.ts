import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { healthRoutes } from './routes/healthRoutes.js'
import { authRoutes } from './routes/authRoutes.js'
import { resourceRoutes } from './routes/resourceRoutes.js'

export const app = express()

app.use(helmet())
app.use(cors({ origin: env.clientUrls }))
app.use(express.json())

app.get('/api', (_request, response) => {
  response.json({
    name: 'expense-tracker-api',
    version: '0.1.0',
  })
})

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api', resourceRoutes)

const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')
app.use(express.static(clientDist))
app.use((_request, response, next) => {
  if (_request.path.startsWith('/api')) {
    next()
    return
  }
  response.sendFile(path.join(clientDist, 'index.html'), (error) => {
    if (error) next(error)
  })
})

app.use(errorHandler)
