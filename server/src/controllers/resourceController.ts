import type { Request, Response } from 'express'
import { parse } from 'csv-parse/sync'
import { TransactionType } from '@prisma/client'
import { prisma } from '../utils/prisma.js'

const user = (request: Request) => request.userId as string
const serialize = (value: unknown) => JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'object' && item?.constructor?.name === 'Decimal' ? Number(item) : item))

export async function listTransactions(request: Request, response: Response) {
  const transactions = await prisma.transaction.findMany({ where: { userId: user(request) }, include: { category: true }, orderBy: { date: 'desc' } })
  return response.json({ transactions: serialize(transactions) })
}
export async function createTransaction(request: Request, response: Response) {
  const transaction = await prisma.transaction.create({ data: { ...request.body, userId: user(request) }, include: { category: true } })
  return response.status(201).json({ transaction: serialize(transaction) })
}
export async function updateTransaction(request: Request, response: Response) {
  const transaction = await prisma.transaction.updateMany({
    where: { id: String(request.params.id), userId: user(request) },
    data: request.body,
  })
  if (!transaction.count) return response.status(404).json({ error: { message: 'Transaction not found' } })
  const updated = await prisma.transaction.findFirst({ where: { id: String(request.params.id), userId: user(request) }, include: { category: true } })
  return response.json({ transaction: serialize(updated) })
}
export async function deleteTransaction(request: Request, response: Response) {
  const result = await prisma.transaction.deleteMany({ where: { id: String(request.params.id), userId: user(request) } })
  return result.count ? response.status(204).send() : response.status(404).json({ error: { message: 'Transaction not found' } })
}
export async function listCategories(request: Request, response: Response) {
  return response.json({ categories: await prisma.category.findMany({ where: { userId: user(request) }, orderBy: { name: 'asc' } }) })
}
export async function createCategory(request: Request, response: Response) {
  const category = await prisma.category.create({ data: { ...request.body, userId: user(request) } })
  return response.status(201).json({ category })
}
export async function updateCategory(request: Request, response: Response) {
  const result = await prisma.category.updateMany({ where: { id: String(request.params.id), userId: user(request) }, data: request.body })
  if (!result.count) return response.status(404).json({ error: { message: 'Category not found' } })
  return response.json({ category: await prisma.category.findFirst({ where: { id: String(request.params.id), userId: user(request) } }) })
}
export async function deleteCategory(request: Request, response: Response) {
  const categoryId = String(request.params.id)
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId: user(request) } })
  if (!category) return response.status(404).json({ error: { message: 'Category not found' } })
  await prisma.$transaction([
    prisma.transaction.updateMany({ where: { categoryId, userId: user(request) }, data: { categoryId: null } }),
    prisma.budget.updateMany({ where: { categoryId, userId: user(request) }, data: { categoryId: null } }),
    prisma.recurringTransaction.updateMany({ where: { categoryId, userId: user(request) }, data: { categoryId: null } }),
    prisma.category.delete({ where: { id: categoryId } }),
  ])
  const result = { count: 1 }
  return result.count ? response.status(204).send() : response.status(404).json({ error: { message: 'Category not found' } })
}
export async function listBudgets(request: Request, response: Response) {
  const budgets = await prisma.budget.findMany({ where: { userId: user(request) }, include: { category: true }, orderBy: [{ year: 'desc' }, { month: 'desc' }] })
  return response.json({ budgets: serialize(budgets) })
}
export async function createBudget(request: Request, response: Response) {
  const budget = await prisma.budget.create({ data: { ...request.body, userId: user(request) }, include: { category: true } })
  return response.status(201).json({ budget: serialize(budget) })
}
export async function updateBudget(request: Request, response: Response) {
  const result = await prisma.budget.updateMany({ where: { id: String(request.params.id), userId: user(request) }, data: request.body })
  if (!result.count) return response.status(404).json({ error: { message: 'Budget not found' } })
  const budget = await prisma.budget.findFirst({ where: { id: String(request.params.id), userId: user(request) }, include: { category: true } })
  return response.json({ budget: serialize(budget) })
}
export async function deleteBudget(request: Request, response: Response) {
  const result = await prisma.budget.deleteMany({ where: { id: String(request.params.id), userId: user(request) } })
  return result.count ? response.status(204).send() : response.status(404).json({ error: { message: 'Budget not found' } })
}
export async function listRecurring(request: Request, response: Response) {
  const rows = await prisma.recurringTransaction.findMany({ where: { userId: user(request) }, include: { category: true }, orderBy: { nextExecution: 'asc' } })
  return response.json({ recurringTransactions: serialize(rows) })
}
export async function createRecurring(request: Request, response: Response) {
  const row = await prisma.recurringTransaction.create({ data: { ...request.body, userId: user(request) }, include: { category: true } })
  return response.status(201).json({ recurringTransaction: serialize(row) })
}
export async function deleteRecurring(request: Request, response: Response) {
  const result = await prisma.recurringTransaction.deleteMany({ where: { id: String(request.params.id), userId: user(request) } })
  return result.count ? response.status(204).send() : response.status(404).json({ error: { message: 'Recurring transaction not found' } })
}
export async function overview(request: Request, response: Response) {
  const rows = await prisma.transaction.findMany({ where: { userId: user(request) } })
  const income = rows.filter((row) => row.type === 'INCOME').reduce((sum, row) => sum + Number(row.amount), 0)
  const expenses = rows.filter((row) => row.type === 'EXPENSE').reduce((sum, row) => sum + Number(row.amount), 0)
  return response.json({ income, expenses, balance: income - expenses, transactionCount: rows.length })
}

export async function exportTransactions(request: Request, response: Response) {
  const rows = await prisma.transaction.findMany({ where: { userId: user(request) }, include: { category: true }, orderBy: { date: 'desc' } })
  const csv = ['description,amount,type,date,category', ...rows.map((row) => [row.description, row.amount.toString(), row.type, row.date.toISOString(), row.category?.name ?? ''].map((value) => `"${value.replaceAll('"', '""')}"`).join(','))].join('\n')
  response.setHeader('Content-Type', 'text/csv; charset=utf-8')
  response.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"')
  return response.send(csv)
}

export async function importTransactions(request: Request, response: Response) {
  const records = parse(String(request.body ?? ''), { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
  const errors: { row: number; message: string }[] = []
  let imported = 0

  for (const [index, record] of records.entries()) {
    const amount = Number(record.amount)
    const type = record.type?.toUpperCase()
    const date = new Date(record.date)
    if (!record.description || !Number.isFinite(amount) || amount <= 0 || !['INCOME', 'EXPENSE'].includes(type) || Number.isNaN(date.getTime())) {
      errors.push({ row: index + 2, message: 'description, amount, type e date sono obbligatori e validi' })
      continue
    }
    let categoryId: string | null = null
    if (record.category) {
      const category = await prisma.category.findFirst({ where: { userId: user(request), name: record.category, type: type as TransactionType } })
      categoryId = category?.id ?? null
    }
    await prisma.transaction.create({ data: { description: record.description, amount, type: type as TransactionType, date, categoryId, userId: user(request) } })
    imported += 1
  }
  return response.status(201).json({ imported, rejected: errors.length, errors })
}
