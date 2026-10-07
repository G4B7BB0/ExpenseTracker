import type { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error)

  if (error?.name === 'PrismaClientInitializationError') {
    response.status(503).json({
      error: {
        message: 'Database non disponibile. Verifica il file locale e la configurazione DATABASE_URL.',
      },
    })
    return
  }

  response.status(500).json({
    error: {
      message: 'Internal server error',
    },
  })
}
