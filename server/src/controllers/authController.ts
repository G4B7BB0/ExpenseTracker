import type { Request, Response } from 'express'
import { comparePassword, hashPassword, signToken } from '../utils/auth.js'
import { prisma } from '../utils/prisma.js'

export async function register(request: Request, response: Response) {
  const { email, password, name } = request.body
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return response.status(409).json({ error: { message: 'Email already registered' } })
  const user = await prisma.user.create({ data: { email: email.toLowerCase(), name, passwordHash: await hashPassword(password) } })
  return response.status(201).json({ token: signToken(user.id), user: { id: user.id, email: user.email, name: user.name } })
}

export async function login(request: Request, response: Response) {
  const { email, password } = request.body
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !(await comparePassword(password, user.passwordHash))) return response.status(401).json({ error: { message: 'Invalid credentials' } })
  return response.json({ token: signToken(user.id), user: { id: user.id, email: user.email, name: user.name } })
}

export async function me(request: Request, response: Response) {
  const user = await prisma.user.findUnique({ where: { id: request.userId }, select: { id: true, email: true, name: true, createdAt: true } })
  if (!user) return response.status(404).json({ error: { message: 'User not found' } })
  return response.json({ user })
}
