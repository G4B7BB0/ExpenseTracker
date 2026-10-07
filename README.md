# ExpenseTracker

ExpenseTracker è una applicazione desktop Windows per la gestione ordinata delle spese, dei budget e dei movimenti ricorrenti. L’interfaccia è pensata per un uso professionale e per piccoli team.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite locale per desktop, Prisma ORM
- **Testing:** Vitest, Supertest

## Requisiti

- Node.js 20+
- npm 10+
- Windows 10/11

## Avvio

1. Copiare `.env.example` in `.env` e configurare i valori locali.
2. Installare le dipendenze:

   ```bash
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

3. Avviare client e server:

   ```bash
   npm run dev
   ```

Il frontend è disponibile su `http://localhost:5173`; il backend risponde su
`http://localhost:3000`.

## Applicazione Windows

Per creare la versione desktop:

```bash
npm run build:desktop
```

L’eseguibile avviabile viene generato in `release/win-unpacked/ExpenseTracker.exe`.
Per creare un installer Windows:

```bash
npm run build:installer
```

L’app desktop avvia automaticamente il servizio locale e apre la finestra solo
dopo che l’API è pronta. Usa SQLite nel profilo utente Windows e non richiede
PostgreSQL o altri servizi esterni.

## Comandi utili

```bash
npm run build
npm test
npm run dev --prefix client
npm run dev --prefix server
```

## Database

Ogni installazione desktop crea automaticamente un database SQLite vuoto e
isolato nel profilo utente Windows (`%APPDATA%\expense-tracker\data`). Il
database non è incluso nel repository, non viene caricato su GitHub e non è
condiviso con altri utenti. Anche il segreto JWT viene generato localmente per
ogni installazione.

Il modello è definito in `prisma/schema.prisma`; all’avvio il server crea le
tabelle mancanti nel database locale. Per inizializzare manualmente un database
vuoto in sviluppo, eseguire:

```bash
npx --prefix server prisma db push --schema prisma/schema.prisma
```

Le API disponibili includono autenticazione JWT, transazioni, categorie,
budget e analytics overview. Il client include login/registrazione, dashboard,
grafico per categoria e gestione di transazioni e categorie.

### Pubblicazione su GitHub

È sicuro pubblicare il codice senza dati personali: non aggiungere mai file
`.env`, `.db`, `release/` o cartelle `node_modules/` al commit. Il file
`.env.example` contiene solo valori dimostrativi e non segreti. Ogni utente
crea il proprio account e i propri dati localmente.
