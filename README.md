# ExpenseTracker

ExpenseTracker is a Windows desktop application for managing personal finances in one place. It combines a focused dashboard with transaction management, budgets, recurring payments, categories, analytics, and CSV data exchange.

> **Status: Completed**
>
> ExpenseTracker was completed through a vibe-coding workflow and is packaged as a local-first Electron application.

![ExpenseTracker brand mark](client/src/assets/hero.png)

## Screenshots

### Account workspace

![ExpenseTracker login screen](client/public/screenshots/login.png)

The application opens with a dedicated account workspace. After signing in, users can move between the dashboard and every finance-management section from the sidebar.

## Features

- Secure local account authentication with JWT sessions and bcrypt password hashing
- Dashboard with balance, income, expenses, savings, trends, charts, recent transactions, upcoming payments, and budget progress
- Create, edit, filter, and delete income and expense transactions
- Create and manage income and expense categories
- Set monthly budgets globally or for a specific category
- Schedule recurring income and expenses with daily, weekly, monthly, or yearly frequencies
- Analytics views with monthly trends and category breakdowns
- Import and export transactions as CSV
- Light and dark themes, responsive layout, reduced-motion support, and compact mode
- Windows desktop packaging through Electron with a local SQLite database

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express 5, TypeScript
- **Desktop:** Electron
- **Database:** SQLite with Prisma ORM
- **Validation and security:** Zod, JWT, bcrypt, Helmet, CORS
- **Testing:** Vitest and Supertest

## Requirements

- Windows 10 or Windows 11
- Node.js 20 or newer
- npm 10 or newer

## Getting started

1. Clone the repository and open the project directory.
2. Install the root, client, and server dependencies:

   ```bash
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

3. Copy `.env.example` to `.env` if you need to override local development settings.
4. Start the frontend and backend together:

   ```bash
   npm run dev
   ```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:3000`.

## Build the Windows application

Create an unpacked Windows build:

```bash
npm run build:desktop
```

The executable is generated at:

```text
release/win-unpacked/ExpenseTracker.exe
```

Create an NSIS installer:

```bash
npm run build:installer
```

The desktop application starts the local API automatically and opens the user interface after the API is ready. No PostgreSQL server or other external service is required.

## Useful commands

```bash
npm run dev
npm run build
npm test
npm run dev --prefix client
npm run dev --prefix server
```

## Data and privacy

Each desktop installation uses an isolated SQLite database in the Windows user profile:

```text
%APPDATA%\expense-tracker\data
```

The database and JWT secret are created locally for each installation. Personal data is not included in the repository. Do not commit `.env`, database files, `release/`, or `node_modules/`.

The Prisma schema is defined in `prisma/schema.prisma`. During startup, the server creates missing tables in the local database. To initialize a development database manually:

```bash
npx --prefix server prisma db push --schema prisma/schema.prisma
```

## Project structure

```text
client/     React frontend and UI assets
server/     Express API and business logic
electron/   Electron desktop entry point
prisma/     Database schema
release/    Generated Windows builds
```

## License

This project is currently distributed without a separate license file. Add a license before publishing it for external reuse.
