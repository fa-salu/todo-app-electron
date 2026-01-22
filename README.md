# Todo App (Offline)

**Project Type:** Desktop Application – Offline Task Management
**Tech Stack:** Electron, Node.js, Express, SQLite
**Platform:** Windows & Linux

---

## Project Overview

The **Todo App** is a fully offline desktop application designed for efficient task management.
Users can create tasks, organize them by folders or dates, mark them completed, and track progress.
The app leverages a lightweight SQLite database for local storage and is packaged as a standalone installer for end-users.

---

## Features

* Task creation with due dates and folder organization
* Mark tasks as completed
* Offline-first functionality
* Persistent local storage using SQLite
* Cross-platform support (Windows `.exe`, Linux `.AppImage`)

---

## Architecture

```
electron/       # Main process & database logic
renderer/       # Frontend interface
dist/           # Build artifacts (installers)
package.json    # Project configuration
electron-builder.yml  # Build configuration
```

* **Main Process:** Handles app lifecycle, database interactions, and IPC
* **Renderer:** User interface (HTML/CSS/JS)
* **Database:** SQLite, automatically initialized at runtime

---

## Build & Deployment

* **Linux:** `.AppImage` via `npm run dist`
* **Windows:** `.exe` via Windows build or CI/CD pipeline (GitHub Actions recommended)
* **Installation:** Standalone installers; no external dependencies required

