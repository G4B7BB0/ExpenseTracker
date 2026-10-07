import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './utils/prisma.js'

async function initializeDatabase() {
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON')
  const statements = [
    `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "passwordHash" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "type" TEXT NOT NULL, "userId" TEXT NOT NULL, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "Transaction" ("id" TEXT NOT NULL PRIMARY KEY, "amount" REAL NOT NULL, "type" TEXT NOT NULL, "description" TEXT NOT NULL, "date" DATETIME NOT NULL, "categoryId" TEXT, "userId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "Budget" ("id" TEXT NOT NULL PRIMARY KEY, "amount" REAL NOT NULL, "month" INTEGER NOT NULL, "year" INTEGER NOT NULL, "categoryId" TEXT, "userId" TEXT NOT NULL, FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "RecurringTransaction" ("id" TEXT NOT NULL PRIMARY KEY, "amount" REAL NOT NULL, "type" TEXT NOT NULL, "description" TEXT NOT NULL, "frequency" TEXT NOT NULL, "nextExecution" DATETIME NOT NULL, "categoryId" TEXT, "userId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE INDEX IF NOT EXISTS "Category_userId_idx" ON "Category"("userId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Category_userId_name_type_key" ON "Category"("userId", "name", "type")`,
    `CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", "date")`,
    `CREATE INDEX IF NOT EXISTS "Transaction_userId_type_idx" ON "Transaction"("userId", "type")`,
    `CREATE INDEX IF NOT EXISTS "Budget_userId_year_month_idx" ON "Budget"("userId", "year", "month")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Budget_userId_categoryId_month_year_key" ON "Budget"("userId", "categoryId", "month", "year")`,
    `CREATE INDEX IF NOT EXISTS "RecurringTransaction_userId_nextExecution_idx" ON "RecurringTransaction"("userId", "nextExecution")`,
  ]
  for (const statement of statements) await prisma.$executeRawUnsafe(statement)
}

initializeDatabase()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`ExpenseTracker API listening on port ${env.port}`)
    })
  })
  .catch((error) => {
    console.error('Database initialization failed', error)
    process.exitCode = 1
  })
