const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./db");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Initialize Database
db.initDatabase(isDev);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  if (isDev) {
    // mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- IPC Handlers ---

ipcMain.handle("get-tasks", (event, filter) => {
  try {
    return db.getTasks(filter);
  } catch (err) {
    console.error("get-tasks error:", err);
    return [];
  }
});

ipcMain.handle("create-task", (event, task) => {
  try {
    return db.createTask(task);
  } catch (err) {
    console.error("create-task error:", err);
    throw err;
  }
});

ipcMain.handle("update-task", (event, id, updates) => {
  return db.updateTask(id, updates);
});

ipcMain.handle("delete-task", (event, id) => {
  return db.deleteTask(id);
});

ipcMain.handle("get-folders", () => {
  return db.getFolders();
});

ipcMain.handle("create-folder", (event, name) => {
  return db.createFolder(name);
});

ipcMain.handle("delete-folder", (event, id) => {
  return db.deleteFolder(id);
});

ipcMain.handle("get-counts", () => {
  return db.getCounts();
});
