const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

let db;

function initDatabase(isDev) {
  let dbPath;
  if (isDev) {
    // Local usage for development
    const dbDir = path.join(__dirname, "../db");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbPath = path.join(dbDir, "todo.db");
  } else {
    // User data directory for production
    const dbDir = path.join(app.getPath("userData"), "db");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbPath = path.join(dbDir, "todo.db");
  }

  db = new Database(dbPath);
  // Enable WAL mode for better concurrency/performance
  db.pragma("journal_mode = WAL");

  createTables();
}

function createTables() {
  const createFoldersTable = `
    CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'custom', -- 'system' (like Inbox? not strictly needed if UI handles it) or 'custom'
        icon TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );`;

  const createTasksTable = `
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        dueDate TEXT,         -- ISO String YYYY-MM-DD
        priority TEXT DEFAULT 'medium', -- low, medium, high
        status TEXT DEFAULT 'pending',  -- pending, completed
        folderId INTEGER,
        completedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(folderId) REFERENCES folders(id) ON DELETE CASCADE
    );`;

  db.exec(createFoldersTable);
  db.exec(createTasksTable);
}

// --- Folders ---

const getFolders = () => {
  const stmt = db.prepare("SELECT * FROM folders ORDER BY createdAt ASC");
  return stmt.all();
};

const createFolder = (name, icon = "folder") => {
  const stmt = db.prepare("INSERT INTO folders (name, icon) VALUES (?, ?)");
  const info = stmt.run(name, icon);
  return { id: info.lastInsertRowid, name, icon };
};

const deleteFolder = (id) => {
  const stmt = db.prepare("DELETE FROM folders WHERE id = ?");
  const info = stmt.run(id);
  return info.changes > 0;
};

// --- Tasks ---

const getTasks = (filter = {}) => {
  let query = "SELECT * FROM tasks WHERE 1=1";
  const params = [];

  if (filter.status) {
    query += " AND status = ?";
    params.push(filter.status);
  }

  if (filter.folderId) {
    query += " AND folderId = ?";
    params.push(filter.folderId);
  }

  // Date filtering can be complex, for simplified logic we might handle "Today" in JS or specific query
  if (filter.dueDate) {
    query += " AND dueDate = ?";
    params.push(filter.dueDate);
  } else if (filter.dateRange === "upcoming") {
    const today = new Date().toISOString().split("T")[0];
    query += " AND dueDate > ?";
    params.push(today);
  }

  query += " ORDER BY dueDate ASC, createdAt DESC";

  const stmt = db.prepare(query);
  return stmt.all(...params);
};

const createTask = (task) => {
  const stmt = db.prepare(`
        INSERT INTO tasks (title, description, dueDate, priority, folderId, status)
        VALUES (@title, @description, @dueDate, @priority, @folderId, 'pending')
    `);
  const info = stmt.run(task);
  return { ...task, id: info.lastInsertRowid, status: "pending" };
};

const updateTask = (id, updates) => {
  // Dynamic update query
  const fields = Object.keys(updates)
    .map((key) => `${key} = @${key}`)
    .join(", ");
  if (!fields) return null;

  if (updates.status === "completed" && !updates.completedAt) {
    updates.completedAt = new Date().toISOString();
    // Append completedAt to fields if it wasn't passed explicitly (it likely wasn't)
    // Re-construct the query to be safe or just rely on the caller passing it.
    // Let's simplified: If status is toggled to completed, we set completedAt.
    // But since we are building dynamic query, let's just add it to updates object and rebuild string.
    // Actually, let's simpler: Just trust `updates` has everything or handle special logic in Main before calling.
    // But for safety in DB layer:
  }

  // Re-generate fields strings in case we modified updates object (we technically didn't add new keys safely above without reassignment)
  // Let's do it cleanly:
  const safeUpdates = { ...updates, id };
  if (updates.status === "completed") {
    // check if completedAt is needed? For now let's assume UI/Controller handles logic or we add it here.
    // Let's add it if missing.
    if (!safeUpdates.completedAt) {
      safeUpdates.completedAt = new Date().toISOString();
    }
  } else if (updates.status === "pending") {
    safeUpdates.completedAt = null;
  }

  const fieldSet = Object.keys(safeUpdates)
    .filter((k) => k !== "id")
    .map((k) => `${k} = @${k}`)
    .join(", ");

  const stmt = db.prepare(`UPDATE tasks SET ${fieldSet} WHERE id = @id`);
  const info = stmt.run(safeUpdates);
  return info.changes > 0;
};

const deleteTask = (id) => {
  const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
  const info = stmt.run(id);
  return info.changes > 0;
};

// Analytics / Counts
const getCounts = () => {
  const today = new Date().toISOString().split("T")[0];

  const pendingStmt = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'",
  );
  const todayStmt = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'pending' AND dueDate = ?",
  );
  const upcomingStmt = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'pending' AND dueDate > ?",
  );

  return {
    pending: pendingStmt.get().count,
    today: todayStmt.get(today).count,
    upcoming: upcomingStmt.get(today).count,
  };
};

module.exports = {
  initDatabase,
  getFolders,
  createFolder,
  deleteFolder,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getCounts,
};
