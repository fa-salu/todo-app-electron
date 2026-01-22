const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("todoAPI", {
  // Tasks
  getTasks: (filter) => ipcRenderer.invoke("get-tasks", filter),
  createTask: (task) => ipcRenderer.invoke("create-task", task),
  updateTask: (id, updates) => ipcRenderer.invoke("update-task", id, updates),
  deleteTask: (id) => ipcRenderer.invoke("delete-task", id),

  // Folders
  getFolders: () => ipcRenderer.invoke("get-folders"),
  createFolder: (name) => ipcRenderer.invoke("create-folder", name),
  deleteFolder: (id) => ipcRenderer.invoke("delete-folder", id),

  // Stats
  getCounts: () => ipcRenderer.invoke("get-counts"),
});
