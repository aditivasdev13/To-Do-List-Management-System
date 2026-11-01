# TaskFlow - To-Do List Management System
**College Mini Project — C++ & Web Edition**

---

## 1. Why couldn't you run `todo.cpp`?

A `.cpp` file is **C++ source code**, not an executable program (`.exe`). Windows cannot run `.cpp` files directly. To run it, you must first **compile** it with a C++ compiler such as `g++` (MinGW / GCC) or MSVC (`cl.exe`).

On your machine, neither `g++` nor `cl` is currently installed or in your system PATH.

### How to Compile & Run the C++ Program:
1. Open PowerShell or Command Prompt as Administrator and install MinGW-w64:
   ```powershell
   winget install -e --id MSYS2.MSYS2
   ```
2. Once installed and added to PATH, compile your code:
   ```bash
   g++ -std=c++11 -o todo.exe todo.cpp
   ```
3. Run the executable:
   ```cmd
   .\todo.exe
   ```
   *(Or double-click `compile_and_run.bat` in this directory!)*

---

## 2. Web Edition (TaskFlow)

We built a **modern, responsive web application** that implements every single feature from your C++ project, with visual enhancements and two-way file compatibility with `tasks.txt`!

### Features Included:
- **Add / Edit / Delete Tasks**: Full task lifecycle with title, description, priority, and due date.
- **Priority Levels**: Low (Emerald), Medium (Amber), High (Rose glow).
- **Due Dates & Overdue Detection**: Live overdue indicators with pulsing alert animations.
- **Status Filtering Tabs**: `All`, `Pending`, `Completed`, and `Overdue`.
- **Live Search**: Instant keyword filtering across task titles and descriptions.
- **Smart Sorting**: Sort by Priority (High to Low / Low to High), Due Date (Earliest / Latest), or Creation ID.
- **Interactive Statistics Dashboard**: Real-time counters for Total Tasks, Pending, Completed, Overdue, High-Priority Open, and an animated Completion Rate progress bar.
- **Local Storage Persistence**: Your tasks are saved automatically in your browser.
- **Two-Way C++ `tasks.txt` Sync**:
  - **Export `tasks.txt`**: Generates a file in the exact pipe-delimited format (`id|title|description|priority|dueDate|completed`) used by `todo.cpp`.
  - **Import `tasks.txt`**: Load your existing data from your C++ console run into the web interface.

---

## 3. How to Open the Webpage

You can launch the web application in any of these ways:

### Option A (Instant Double-Click):
- Simply double-click **[`open_webpage.bat`](file:///C:/Users/HARSH%20ANAND/.gemini/antigravity-ide/scratch/todo-web-app/open_webpage.bat)** or directly double-click **[`index.html`](file:///C:/Users/HARSH%20ANAND/.gemini/antigravity-ide/scratch/todo-web-app/index.html)** in Windows File Explorer. It opens right up in Chrome, Edge, or Firefox!

### Option B (Local Server):
- The local server is already running for you at:
  **http://localhost:3000**
- To start it again in the future:
  ```bash
  node server.js
  ```
