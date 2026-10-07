import { Router } from 'express'
import { login, me, register } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { loginSchema, registerSchema } from '../validators/schemas.js'

export const authRoutes = Router()
authRoutes.post('/register', validate(registerSchema), register)
authRoutes.post('/login', validate(loginSchema), login)
authRoutes.get('/me', requireAuth, me)
