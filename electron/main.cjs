const { app, BrowserWindow, ipcMain, dialog, Notification, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;
const storePath = path.join(app.getPath('userData'), 'gameshop-store.json');
const uploadsDir = path.join(app.getPath('userData'), 'uploaded-games');

const DEFAULT_STATE = {
  wallet: 500,
  library: [],
  wishlist: [],
  account: null,
  uploadedGames: [],
};

// Static pattern scan run over every uploaded game's text files before it can be
// published. This is NOT a full security audit or sandboxed dynamic analysis —
// it's a first line of defense that catches obvious attempts to reach outside the
// game (network calls to third parties, Electron/Node internals, sandbox-escape
// patterns) or to load remote code after the fact.
const RISKY_PATTERNS = [
  { re: /\beval\s*\(/, message: 'Uses eval()' },
  { re: /new\s+Function\s*\(/, message: 'Uses the Function constructor to run dynamic code' },
  { re: /document\.write\s*\(/, message: 'Uses document.write' },
  { re: /require\s*\(\s*['"]/, message: 'Attempts to use Node.js require()' },
  { re: /\bprocess\s*\.\s*\w+/, message: 'References the Node.js process object' },
  { re: /\bchild_process\b/, message: 'References child_process' },
  { re: /\belectron\b/i, message: 'References Electron internals' },
  { re: /contextBridge|ipcRenderer|ipcMain/, message: 'References Electron IPC internals' },
  { re: /window\s*\.\s*(top|parent)\b/, message: 'Attempts to reach the parent/top window (sandbox-escape pattern)' },
  { re: /fetch\s*\(\s*['"]https?:\/\//, message: 'Makes a network request to an external URL' },
  { re: /new\s+XMLHttpRequest/, message: 'Uses XMLHttpRequest (network access)' },
  { re: /new\s+WebSocket\s*\(/, message: 'Opens a WebSocket connection' },
  { re: /document\.cookie/, message: 'Accesses document.cookie' },
  { re: /localStorage\s*\.\s*(?:setItem|getItem|removeItem)\s*\(\s*['"]gameshop-/, message: "Attempts to read/write GameShop's own storage keys" },
  { re: /<script[^>]+src\s*=\s*["']https?:\/\//i, message: 'Loads a remote script from an external URL' },
  { re: /<(?:iframe|embed|object)[^>]+src\s*=\s*["']https?:\/\//i, message: 'Embeds remote content from an external URL' },
];
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const SCANNABLE_EXT = /\.(html?|js|mjs|cjs|css)$/i;

function walkFiles(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walkFiles(full));
    else out.push(full);
  }
  return out;
}

function scanUpload(destDir) {
  const files = walkFiles(destDir);
  const findings = [];
  let totalSize = 0;
  for (const file of files) {
    totalSize += fs.statSync(file).size;
    if (!SCANNABLE_EXT.test(file)) continue;
    const content = fs.readFileSync(file, 'utf-8');
    const rel = path.relative(destDir, file);
    for (const { re, message } of RISKY_PATTERNS) {
      if (re.test(content)) findings.push({ file: rel, message });
    }
  }
  if (totalSize > MAX_UPLOAD_BYTES) {
    findings.push({ file: '(all files)', message: `Upload is ${(totalSize / 1024 / 1024).toFixed(1)}MB, over the 25MB limit` });
  }
  return findings;
}

ipcMain.handle('game:upload', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select the game folder (must contain an index.html)',
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const srcDir = result.filePaths[0];
  if (!fs.existsSync(path.join(srcDir, 'index.html'))) {
    return { error: 'That folder has no index.html at its root.' };
  }

  const id = 'upload-' + crypto.randomBytes(6).toString('hex');
  const destDir = path.join(uploadsDir, id);
  try {
    fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(srcDir, destDir, {
      recursive: true,
      filter: (src) => {
        const base = path.basename(src);
        return !base.startsWith('.') && base !== 'node_modules';
      },
    });
  } catch (err) {
    return { error: `Couldn't copy the game files: ${err.message}` };
  }

  const findings = scanUpload(destDir);
  const status = findings.length > 0 ? 'rejected' : 'approved';
  const entryUrl = pathToFileURL(path.join(destDir, 'index.html')).href;
  return { id, folder: destDir, entryUrl, status, findings };
});

const ICON_MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif' };
const MAX_ICON_BYTES = 3 * 1024 * 1024;

ipcMain.handle('game:pickIcon', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    title: 'Choose a game icon',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();
  const mime = ICON_MIME[ext];
  if (!mime) return { error: 'Unsupported image type.' };

  const stat = fs.statSync(filePath);
  if (stat.size > MAX_ICON_BYTES) {
    return { error: `Image is ${(stat.size / 1024 / 1024).toFixed(1)}MB, over the 3MB limit.` };
  }

  const data = fs.readFileSync(filePath);
  const dataUrl = `data:${mime};base64,${data.toString('base64')}`;
  return { dataUrl };
});

ipcMain.handle('game:deleteUpload', (_event, id) => {
  if (typeof id !== 'string' || !id.startsWith('upload-')) return;
  const target = path.join(uploadsDir, id);
  if (target.startsWith(uploadsDir)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

function readStore() {
  try {
    const raw = fs.readFileSync(storePath, 'utf-8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeStore(state) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(state, null, 2));
}

const SHARE_MESSAGE =
  "Check out GameShop, a game marketplace app I built — download it here: https://github.com/RespawnConsoles/GameShop/releases/latest";

ipcMain.handle('app:shareViaMessages', async () => {
  try {
    await shell.openExternal(`sms:&body=${encodeURIComponent(SHARE_MESSAGE)}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('store:get', () => readStore());
ipcMain.handle('store:set', (_event, state) => {
  writeStore(state);
  return state;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'GameShop',
    backgroundColor: '#0e0f13',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  if (!isDev) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-downloaded', () => {
      if (Notification.isSupported()) {
        new Notification({
          title: 'GameShop update ready',
          body: 'It will finish installing the next time you quit and reopen GameShop.',
        }).show();
      }
    });
    // Silent by design: no releases yet, or offline, shouldn't surface an error to the user.
    autoUpdater.checkForUpdates().catch(() => {});
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
