import express, { Router } from 'express'
import { createBudget, createCategory, createRecurring, createTransaction, deleteBudget, deleteCategory, deleteRecurring, deleteTransaction, exportTransactions, importTransactions, listBudgets, listCategories, listRecurring, listTransactions, overview, updateBudget, updateCategory, updateTransaction } from '../controllers/resourceController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { budgetSchema, categorySchema, recurringSchema, transactionSchema } from '../validators/schemas.js'

export const resourceRoutes = Router()
resourceRoutes.use(requireAuth)
resourceRoutes.get('/transactions', listTransactions)
resourceRoutes.post('/transactions', validate(transactionSchema), createTransaction)
resourceRoutes.put('/transactions/:id', validate(transactionSchema), updateTransaction)
resourceRoutes.delete('/transactions/:id', deleteTransaction)
resourceRoutes.get('/transactions/export', exportTransactions)
resourceRoutes.post('/transactions/import', express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }), importTransactions)
resourceRoutes.get('/categories', listCategories)
resourceRoutes.post('/categories', validate(categorySchema), createCategory)
resourceRoutes.put('/categories/:id', validate(categorySchema), updateCategory)
resourceRoutes.delete('/categories/:id', deleteCategory)
resourceRoutes.get('/budgets', listBudgets)
resourceRoutes.post('/budgets', validate(budgetSchema), createBudget)
resourceRoutes.put('/budgets/:id', validate(budgetSchema), updateBudget)
resourceRoutes.delete('/budgets/:id', deleteBudget)
resourceRoutes.get('/recurring-transactions', listRecurring)
resourceRoutes.post('/recurring-transactions', validate(recurringSchema), createRecurring)
resourceRoutes.delete('/recurring-transactions/:id', deleteRecurring)
resourceRoutes.get('/analytics/overview', overview)
