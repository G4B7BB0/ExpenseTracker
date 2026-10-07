import type { RequestHandler } from 'express'
import type { z } from 'zod'

export const validate = (schema: z.ZodType): RequestHandler => (request, response, next) => {
  const result = schema.safeParse(request.body)
  if (!result.success) {
    response.status(400).json({ error: { message: 'Invalid input', details: result.error.flatten() } })
    return
  }
  request.body = result.data
  next()
}
