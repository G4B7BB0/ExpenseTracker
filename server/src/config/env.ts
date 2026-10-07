import 'dotenv/config'

const port = Number(process.env.PORT ?? 3000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port')
}

export const env = {
  port,
  clientUrls: (process.env.CLIENT_URL ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET ?? 'development-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  databaseUrl: process.env.DATABASE_URL ?? 'file:../data/expense-tracker.db',
} as const
