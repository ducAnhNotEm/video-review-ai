const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');

let mainWindow;

// Initialize IPC handlers from backend
// In production and dev, we require the compiled JS from backend
function initializeIpc() {
  try {
    const { initIpc } = require(path.join(__dirname, '../backend/dist/index.js'));
    initIpc(ipcMain);
    console.log('IPC Handlers initialized successfully from backend module.');
  } catch (err) {
    console.error('Failed to initialize backend IPC. Make sure backend is compiled:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "AI Video Agent Studio",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
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

app.whenReady().then(() => {
  // Register custom protocol to bypass file:// security for local media
  protocol.handle('media', (request) => {
    // URL format: media://absolute/path/to/file.mp4
    const url = request.url.replace('media://', '');
    try {
      const filePath = decodeURIComponent(url);
      return require('net').fetch('file:///' + filePath);
    } catch (error) {
      console.error('Media protocol error:', error);
      return new Response('File not found', { status: 404 });
    }
  });

  initializeIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
