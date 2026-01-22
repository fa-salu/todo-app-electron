// SVG Icons (Offline)
const Icons = {
  today:
    '<svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
  upcoming:
    '<svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>',
  completed:
    '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
};

// State
let state = {
  view: "today", // today, upcoming, completed, folder-{id}
  tasks: [],
  folders: [],
  counts: { pending: 0, today: 0, upcoming: 0 },
  editingTaskId: null,
};

// DOM Elements
const els = {
  // Layout
  pageTitle: document.getElementById("page-title"),
  currentDate: document.getElementById("current-date"),
  taskList: document.getElementById("task-list"),
  folderList: document.getElementById("folder-list"),

  // Nav
  navToday: document.querySelector('[data-view="today"]'),
  navUpcoming: document.querySelector('[data-view="upcoming"]'),
  navCompleted: document.querySelector('[data-view="completed"]'),
  countToday: document.getElementById("count-today"),
  countUpcoming: document.getElementById("count-upcoming"),

  // Modals & Forms
  taskModal: document.getElementById("task-modal"),
  folderModal: document.getElementById("folder-modal"),
  taskForm: document.getElementById("task-form"),
  folderForm: document.getElementById("folder-form"),

  // Inputs
  quickAdd: document.getElementById("quick-add-input"),
  taskTitle: document.getElementById("task-title"),
  taskDesc: document.getElementById("task-desc"),
  taskDate: document.getElementById("task-date"),
  taskPriority: document.getElementById("task-priority"),
  taskFolder: document.getElementById("task-folder"),
  folderName: document.getElementById("folder-name"),

  // Buttons
  fab: document.getElementById("fab-add-task"),
  addFolderBtn: document.getElementById("add-folder-btn"),
};

// Initialize
async function init() {
  setupIcons();
  setupEventListeners();
  renderDate();
  await refreshData();
}

function setupIcons() {
  els.navToday.querySelector(".icon").innerHTML = Icons.today;
  els.navUpcoming.querySelector(".icon").innerHTML = Icons.upcoming;
  els.navCompleted.querySelector(".icon").innerHTML = Icons.completed;
}

function renderDate() {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  els.currentDate.textContent = new Date().toLocaleDateString("en-US", options);
}

function setupEventListeners() {
  // Navigation
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const view = el.dataset.view;
      switchView(view);
    });
  });

  // Quick Add
  els.quickAdd.addEventListener("keypress", async (e) => {
    if (e.key === "Enter" && els.quickAdd.value.trim()) {
      await createStartTask(els.quickAdd.value.trim());
      els.quickAdd.value = "";
    }
  });

  // Modals used for creating NEW tasks/folders
  els.fab.addEventListener("click", () => openTaskModal());
  document
    .querySelectorAll(".close-modal")
    .forEach((b) =>
      b.addEventListener("click", () => els.taskModal.classList.add("hidden")),
    );

  els.addFolderBtn.addEventListener("click", () =>
    els.folderModal.classList.remove("hidden"),
  );
  document
    .querySelectorAll(".close-modal-folder")
    .forEach((b) =>
      b.addEventListener("click", () =>
        els.folderModal.classList.add("hidden"),
      ),
    );

  // Forms
  els.taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveTask();
  });

  els.folderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await createFolder();
  });

  // Outside click close
  els.taskModal.addEventListener("click", (e) => {
    if (e.target === els.taskModal) els.taskModal.classList.add("hidden");
  });
  els.folderModal.addEventListener("click", (e) => {
    if (e.target === els.folderModal) els.folderModal.classList.add("hidden");
  });
}

// Logic

async function refreshData() {
  state.folders = await window.todoAPI.getFolders();
  state.counts = await window.todoAPI.getCounts();

  // Render Sidebar (Folders & Counts)
  renderSidebar();

  // Fetch Tasks based on view
  let filter = {};
  if (state.view === "today") {
    filter.dueDate = new Date().toISOString().split("T")[0];
    filter.status = "pending"; // In Today, usually show pending. Completed go to Completed view? Or keep them?
    // Let's Keep "Todo" style: Today lists tasks for today.
  } else if (state.view === "upcoming") {
    filter.dateRange = "upcoming";
    filter.status = "pending";
  } else if (state.view === "completed") {
    filter.status = "completed";
  } else if (state.view.startsWith("folder-")) {
    filter.folderId = parseInt(state.view.split("-")[1]);
    filter.status = "pending";
  }

  state.tasks = await window.todoAPI.getTasks(filter);

  // For 'Today' view, if we want to show ALL tasks due today (even completed), we should adjust API.
  // But currently API handles simple filtering.
  // Let's trust the current flow. For 'Today' we usually care about what is pending.

  renderTasks();
}

function switchView(viewName) {
  state.view = viewName;

  // Update Sidebar Active State
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  if (viewName.startsWith("folder-")) {
    const folderLink = document.querySelector(
      `.nav-item[data-id="${viewName}"]`,
    );
    if (folderLink) folderLink.classList.add("active");
    const folder = state.folders.find((f) => f.id == viewName.split("-")[1]);
    els.pageTitle.textContent = folder ? folder.name : "Folder";
  } else {
    const standardLink = document.querySelector(
      `.nav-item[data-view="${viewName}"]`,
    );
    if (standardLink) standardLink.classList.add("active");
    els.pageTitle.textContent =
      viewName.charAt(0).toUpperCase() + viewName.slice(1);
  }

  refreshData();
}

function renderSidebar() {
  els.countToday.textContent = state.counts.today || 0;
  els.countUpcoming.textContent = state.counts.upcoming || 0;

  els.folderList.innerHTML = "";
  state.folders.forEach((folder) => {
    const div = document.createElement("a");
    div.className = "nav-item";
    div.href = "#";
    div.dataset.id = `folder-${folder.id}`;
    div.dataset.view = `folder-${folder.id}`; // Unified for switchView
    div.innerHTML = `
            <span class="icon">${Icons.folder}</span>
            ${folder.name}
            <button class="delete-folder-btn" title="Delete Folder">&times;</button>
        `;

    // Active check
    if (state.view === `folder-${folder.id}`) div.classList.add("active");

    div.addEventListener("click", (e) => {
      // If clicked delete
      if (e.target.classList.contains("delete-folder-btn")) {
        e.preventDefault();
        e.stopPropagation();
        deleteFolder(folder.id);
        return;
      }
      e.preventDefault();
      switchView(`folder-${folder.id}`);
    });

    els.folderList.appendChild(div);
  });

  // Update folder select in Modal
  els.taskFolder.innerHTML = '<option value="">Inbox (None)</option>';
  state.folders.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.name;
    els.taskFolder.appendChild(opt);
  });
}

function renderTasks() {
  els.taskList.innerHTML = "";

  if (state.tasks.length === 0) {
    els.taskList.innerHTML = `
            <div style="text-align:center; color: var(--text-secondary); margin-top: 50px;">
                <p>No tasks found.</p>
                ${state.view === "today" ? "<p>Add one above!</p>" : ""}
            </div>
        `;
    return;
  }

  state.tasks.forEach((task) => {
    const div = document.createElement("div");
    div.className = "task-item";
    if (task.status === "completed") div.classList.add("completed");

    div.innerHTML = `
            <div class="task-checkbox ${task.status === "completed" ? "completed" : ""}" data-id="${task.id}"></div>
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                ${task.description ? `<div class="task-meta">${task.description}</div>` : ""}
                <div class="task-meta">
                    ${task.dueDate ? `<span>📅 ${task.dueDate}</span>` : ""}
                    <div class="priority-indicator p-${task.priority}" title="${task.priority}"></div>
                </div>
            </div>
            <button class="actions-btn edit-btn" data-id="${task.id}">${Icons.edit}</button>
            <button class="actions-btn delete-btn" data-id="${task.id}">${Icons.trash}</button>
        `;

    // Checkbox click
    div.querySelector(".task-checkbox").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTaskStatus(task);
    });

    // Edit
    div.querySelector(".edit-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openTaskModal(task);
    });

    // Delete
    div.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });

    els.taskList.appendChild(div);
  });
}

// Actions

async function createStartTask(title) {
  // Quick add logic: Tries to infer context from view
  const today = new Date().toISOString().split("T")[0];
  const task = {
    title: title,
    priority: "medium",
    dueDate: state.view === "upcoming" ? null : today, // If upcoming, maybe leave date empty? Or default today? Let's default today unless in specific folder view?
    folderId: state.view.startsWith("folder-")
      ? parseInt(state.view.split("-")[1])
      : null,
  };

  if (state.view === "upcoming") task.dueDate = null; // No date for general upcoming quick add

  await window.todoAPI.createTask(task);
  refreshData();
}

async function saveTask() {
  const task = {
    title: els.taskTitle.value,
    description: els.taskDesc.value,
    dueDate: els.taskDate.value || null, // Allow empty
    priority: els.taskPriority.value,
    folderId: els.taskFolder.value ? parseInt(els.taskFolder.value) : null,
  };

  if (state.editingTaskId) {
    await window.todoAPI.updateTask(state.editingTaskId, task);
  } else {
    await window.todoAPI.createTask(task);
  }

  els.taskModal.classList.add("hidden");
  refreshData();
}

async function toggleTaskStatus(task) {
  const newStatus = task.status === "pending" ? "completed" : "pending";
  // Optimistic UI update could be done here, but let's just wait for DB
  await window.todoAPI.updateTask(task.id, { status: newStatus });
  refreshData();
}

async function deleteTask(id) {
  if (confirm("Are you sure you want to delete this task?")) {
    await window.todoAPI.deleteTask(id);
    refreshData();
  }
}

async function deleteFolder(id) {
  if (confirm("Delete this folder and all its tasks?")) {
    await window.todoAPI.deleteFolder(id);
    if (state.view === `folder-${id}`) switchView("today");
    else refreshData();
  }
}

async function createFolder() {
  const name = els.folderName.value.trim();
  if (name) {
    await window.todoAPI.createFolder(name);
    els.folderName.value = "";
    els.folderModal.classList.add("hidden");
    refreshData();
  }
}

function openTaskModal(task = null) {
  if (task) {
    state.editingTaskId = task.id;
    els.document.getElementById("modal-title").textContent = "Edit Task";
    els.taskTitle.value = task.title;
    els.taskDesc.value = task.description || "";
    els.taskDate.value = task.dueDate || "";
    els.taskPriority.value = task.priority || "medium";
    els.taskFolder.value = task.folderId || "";
  } else {
    state.editingTaskId = null;
    document.getElementById("modal-title").textContent = "New Task";
    els.taskTitle.value = "";
    els.taskDesc.value = "";
    // Default date: Today
    els.taskDate.value = new Date().toISOString().split("T")[0];
    els.taskPriority.value = "medium";

    // Default folder if in folder view
    if (state.view.startsWith("folder-")) {
      els.taskFolder.value = state.view.split("-")[1];
    } else {
      els.taskFolder.value = "";
    }
  }

  els.taskModal.classList.remove("hidden");
  els.taskTitle.focus();
}

// Start
init();
