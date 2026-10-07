const { app, BrowserWindow, dialog, utilityProcess } = require('electron')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const port = Number(process.env.PORT || 3000)
let serverProcess
let mainWindow

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
  mainWindow.show()
})

function startServer() {
  const serverEntry = path.join(process.resourcesPath, 'server', 'dist', 'server.js')
  const dataDirectory = path.join(app.getPath('userData'), 'data')
  const databasePath = path.join(dataDirectory, 'expense-tracker.db')
  fs.mkdirSync(dataDirectory, { recursive: true })
  const secretPath = path.join(app.getPath('userData'), 'jwt-secret')
  if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, crypto.randomBytes(32).toString('hex'), { mode: 0o600 })
  const jwtSecret = fs.readFileSync(secretPath, 'utf8').trim()
  serverProcess = utilityProcess.fork(serverEntry, [], {
    cwd: path.dirname(serverEntry),
    env: {
      ...process.env,
      PORT: String(port),
      CLIENT_URL: `http://127.0.0.1:${port}`,
      DATABASE_URL: `file:${databasePath.replace(/\\/g, '/')}`,
      JWT_SECRET: jwtSecret,
    },
    stdio: 'pipe',
  })
  serverProcess.stdout?.on('data', (data) => console.log(data.toString().trim()))
  serverProcess.stderr?.on('data', (data) => console.error(data.toString().trim()))
  serverProcess.on('error', (error) => {
    dialog.showErrorBox('ExpenseTracker', `Impossibile avviare il server locale.\n\n${error.message}`)
  })
  serverProcess.on('exit', (code) => {
    if (code && !app.isQuitting) {
      dialog.showErrorBox('ExpenseTracker', `Il servizio locale si è chiuso inaspettatamente (codice ${code}).`)
    }
  })
}

function waitForServer(attempt = 0) {
  return new Promise((resolve, reject) => {
    const request = http.get(`http://127.0.0.1:${port}/api/health`, (response) => {
      response.resume()
      if (response.statusCode && response.statusCode < 500) {
        resolve()
        return
      }
      retryOrReject()
    })
    request.on('error', retryOrReject)
    request.setTimeout(500, () => {
      request.destroy()
      retryOrReject()
    })

    function retryOrReject() {
      if (attempt >= 40) {
        reject(new Error('Il servizio locale non è disponibile.'))
        return
      }
      setTimeout(() => waitForServer(attempt + 1).then(resolve, reject), 250)
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'ExpenseTracker | Gestione spese',
    backgroundColor: '#f1f5f9',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadURL(`http://127.0.0.1:${port}`)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.expensetracker.desktop')
  startServer()
  waitForServer().then(createWindow).catch((error) => {
    dialog.showErrorBox('ExpenseTracker', `${error.message}\n\nVerifica che la configurazione del database sia disponibile.`)
    app.quit()
  })
  app.on('activate', () => {
    if (mainWindow) mainWindow.show()
  })
})

app.on('before-quit', () => {
  app.isQuitting = true
  if (serverProcess && !serverProcess.killed) serverProcess.kill()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
