import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export type JwtPayload = { userId: string }

export const hashPassword = (password: string) => bcrypt.hash(password, 12)
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash)
export const signToken = (userId: string) => jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] })
export const verifyToken = (token: string) => jwt.verify(token, env.jwtSecret) as JwtPayload
