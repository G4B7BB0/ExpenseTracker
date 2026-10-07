import { z } from 'zod'

export const registerSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().trim().min(2).max(80) })
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
export const transactionSchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().trim().min(1).max(200),
  date: z.coerce.date(),
  categoryId: z.string().cuid().optional().nullable(),
})
export const categorySchema = z.object({ name: z.string().trim().min(1).max(80), type: z.enum(['INCOME', 'EXPENSE']) })
export const budgetSchema = z.object({ amount: z.coerce.number().positive(), month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int().min(2000).max(2100), categoryId: z.string().cuid().optional().nullable() })
export const recurringSchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().trim().min(1).max(200),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  nextExecution: z.coerce.date(),
  categoryId: z.string().cuid().optional().nullable(),
})
