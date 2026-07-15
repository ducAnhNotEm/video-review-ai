const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    console.log('Development mode: Skipping backend fork inside Electron (running independently).');
    return;
  }

  const backendPath = path.join(__dirname, '../backend/dist/src/index.js');
  
  console.log(`Starting background backend process: ${backendPath}`);
  
  backendProcess = fork(backendPath, [], {
    env: { ...process.env, PORT: '5000' }
  });

  backendProcess.on('message', (msg) => {
    console.log(`Backend process message:`, msg);
  });

  backendProcess.on('error', (err) => {
    console.error('Backend process encountered error:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "AI Video Agent Studio",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#070a13'
  });

  // Load Vite frontend (in development, load localhost:3000)
  // In production, we load the index.html from dist folder.
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) {
      backendProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
