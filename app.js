/**
 * TaskFlow - Modern To-Do List Management System
 * Web implementation of the C++ Mini Project with tasks.txt compatibility
 */

(function () {
  'use strict';

  // ---------------------------------------------------------
  // Constants & Enums
  // ---------------------------------------------------------
  const STORAGE_KEY = 'taskflow_tasks_v1';
  const NEXT_ID_KEY = 'taskflow_next_id_v1';

  const Priority = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3
  };

  // ---------------------------------------------------------
  // Initial Sample Data (College Mini Project Themed)
  // ---------------------------------------------------------
  const SAMPLE_TASKS = [
    {
      id: 1,
      title: "Compile C++ Mini Project",
      description: "Install MinGW / GCC via winget and compile todo.cpp into todo.exe",
      priority: Priority.HIGH,
      dueDate: getRelativeDate(0), // Today
      completed: false
    },
    {
      id: 2,
      title: "Write Project Documentation & PPT",
      description: "Prepare class presentation slides and system architecture diagram for evaluation",
      priority: Priority.MEDIUM,
      dueDate: getRelativeDate(3),
      completed: false
    },
    {
      id: 3,
      title: "Submit Data Structures Lab Report",
      description: "Graph traversal algorithms and runtime complexity analysis worksheet",
      priority: Priority.HIGH,
      dueDate: getRelativeDate(-2), // Overdue for demo
      completed: false
    },
    {
      id: 4,
      title: "Review Web Edition Features",
      description: "Test task sorting, live search, stats calculation, and tasks.txt import/export",
      priority: Priority.LOW,
      dueDate: getRelativeDate(5),
      completed: true
    }
  ];

  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  let tasks = [];
  let nextId = 1;
  let activeTab = 'all'; // 'all' | 'pending' | 'completed' | 'overdue'
  let searchQuery = '';
  let priorityFilter = 'ALL'; // 'ALL' | '1' | '2' | '3'
  let sortBy = 'priority-desc';
  let taskPendingDelete = null;
  let viewingTaskId = null;

  // ---------------------------------------------------------
  // DOM Elements
  // ---------------------------------------------------------
  const headerTodayDate = document.getElementById('headerTodayDate');
  const tasksList = document.getElementById('tasksList');
  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptySubtitle = document.getElementById('emptySubtitle');
  const listSummaryText = document.getElementById('listSummaryText');

  // Stats DOM
  const statTotal = document.getElementById('statTotal');
  const statPending = document.getElementById('statPending');
  const statCompleted = document.getElementById('statCompleted');
  const statOverdue = document.getElementById('statOverdue');
  const statHigh = document.getElementById('statHigh');
  const statPercent = document.getElementById('statPercent');
  const progressBarFill = document.getElementById('progressBarFill');

  // Badges DOM
  const badgeAll = document.getElementById('badgeAll');
  const badgePending = document.getElementById('badgePending');
  const badgeCompleted = document.getElementById('badgeCompleted');
  const badgeOverdue = document.getElementById('badgeOverdue');

  // Inputs & Filters DOM
  const searchInput = document.getElementById('searchInput');
  const btnSearchClear = document.getElementById('btnSearchClear');
  const priorityFilterSelect = document.getElementById('priorityFilterSelect');
  const sortBySelect = document.getElementById('sortBySelect');
  const tabButtons = document.querySelectorAll('.tab-btn');

  // Modals DOM
  const taskModal = document.getElementById('taskModal');
  const modalTitle = document.getElementById('modalTitle');
  const taskForm = document.getElementById('taskForm');
  const editTaskId = document.getElementById('editTaskId');
  const taskTitleInput = document.getElementById('taskTitleInput');
  const taskDescInput = document.getElementById('taskDescInput');
  const taskDueDateInput = document.getElementById('taskDueDateInput');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnOpenAddModal = document.getElementById('btnOpenAddModal');
  const btnEmptyAddTask = document.getElementById('btnEmptyAddTask');

  // Task Details Modal
  const detailsModal = document.getElementById('detailsModal');
  const detailsModalContent = document.getElementById('detailsModalContent');
  const btnCloseDetailsModal = document.getElementById('btnCloseDetailsModal');
  const btnCloseDetailsBtn = document.getElementById('btnCloseDetailsBtn');
  const btnEditFromDetails = document.getElementById('btnEditFromDetails');

  // Delete Modal
  const deleteModal = document.getElementById('deleteModal');
  const deleteTaskTitleDisplay = document.getElementById('deleteTaskTitleDisplay');
  const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');
  const btnCancelDelete = document.getElementById('btnCancelDelete');
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');

  // Sync Modal
  const syncModal = document.getElementById('syncModal');
  const btnSyncCpp = document.getElementById('btnSyncCpp');
  const btnCloseSyncModal = document.getElementById('btnCloseSyncModal');
  const btnExportTxt = document.getElementById('btnExportTxt');
  const fileImportInput = document.getElementById('fileImportInput');
  const btnResetSamples = document.getElementById('btnResetSamples');

  const toastContainer = document.getElementById('toastContainer');

  // ---------------------------------------------------------
  // Helper Functions
  // ---------------------------------------------------------

  /** Format today's date as YYYY-MM-DD */
  function todayDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Helper to generate dates relative to today */
  function getRelativeDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function priorityToString(p) {
    const num = Number(p);
    switch (num) {
      case Priority.HIGH: return 'High';
      case Priority.MEDIUM: return 'Medium';
      default: return 'Low';
    }
  }

  function sanitize(str) {
    if (!str) return '';
    return str.replace(/\|/g, '/').trim();
  }

  function isOverdue(task) {
    return !task.completed && Boolean(task.dueDate) && task.dueDate < todayDate();
  }

  function isDueToday(task) {
    return !task.completed && Boolean(task.dueDate) && task.dueDate === todayDate();
  }

  function escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  // ---------------------------------------------------------
  // Storage & State Persistence
  // ---------------------------------------------------------
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedNextId = localStorage.getItem(NEXT_ID_KEY);

      if (stored) {
        tasks = JSON.parse(stored);
        nextId = storedNextId ? parseInt(storedNextId, 10) : calculateNextId(tasks);
      } else {
        // Load default sample tasks
        tasks = JSON.parse(JSON.stringify(SAMPLE_TASKS));
        nextId = 5;
        saveTasks();
      }
    } catch (e) {
      console.error('Error loading tasks from localStorage', e);
      tasks = JSON.parse(JSON.stringify(SAMPLE_TASKS));
      nextId = 5;
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      localStorage.setItem(NEXT_ID_KEY, nextId.toString());
    } catch (e) {
      console.error('Error saving tasks to localStorage', e);
    }
  }

  function calculateNextId(taskList) {
    let max = 0;
    taskList.forEach(t => {
      if (t.id > max) max = t.id;
    });
    return max + 1;
  }

  // ---------------------------------------------------------
  // Statistics Calculations
  // ---------------------------------------------------------
  function updateStatistics() {
    const total = tasks.length;
    let completed = 0;
    let overdue = 0;
    let high = 0;

    tasks.forEach(t => {
      if (t.completed) completed++;
      if (isOverdue(t)) overdue++;
      if (!t.completed && Number(t.priority) === Priority.HIGH) high++;
    });

    const pending = total - completed;
    const pct = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

    // Update Top Counters
    statTotal.textContent = total;
    statPending.textContent = pending;
    statCompleted.textContent = completed;
    statOverdue.textContent = overdue;
    statHigh.textContent = high;
    statPercent.textContent = `${pct}%`;
    progressBarFill.style.width = `${pct}%`;

    // Update Filter Tab Badges
    badgeAll.textContent = total;
    badgePending.textContent = pending;
    badgeCompleted.textContent = completed;
    badgeOverdue.textContent = overdue;
  }

  // ---------------------------------------------------------
  // Rendering Tasks
  // ---------------------------------------------------------
  function render() {
    updateStatistics();

    // 1. Filter by Tab
    let filtered = tasks.filter(t => {
      if (activeTab === 'pending') return !t.completed;
      if (activeTab === 'completed') return t.completed;
      if (activeTab === 'overdue') return isOverdue(t);
      return true; // 'all'
    });

    // 2. Filter by Priority
    if (priorityFilter !== 'ALL') {
      const p = parseInt(priorityFilter, 10);
      filtered = filtered.filter(t => Number(t.priority) === p);
    }

    // 3. Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const titleMatch = t.title.toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        return titleMatch || descMatch;
      });
    }

    // 4. Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority-desc':
          return Number(b.priority) - Number(a.priority);
        case 'priority-asc':
          return Number(a.priority) - Number(b.priority);
        case 'date-asc': {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case 'date-desc': {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return b.dueDate.localeCompare(a.dueDate);
        }
        case 'id-desc':
          return b.id - a.id;
        case 'id-asc':
          return a.id - b.id;
        case 'title-asc':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    // Update Summary Label
    const totalCount = tasks.length;
    const shownCount = filtered.length;
    if (searchQuery.trim() !== '') {
      listSummaryText.textContent = `Found ${shownCount} matching "${searchQuery}" (of ${totalCount} total)`;
    } else {
      const tabName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      listSummaryText.textContent = `Showing ${shownCount} ${tabName} task${shownCount === 1 ? '' : 's'}`;
    }

    // Render list or empty state
    if (filtered.length === 0) {
      tasksList.innerHTML = '';
      emptyState.style.display = 'flex';

      if (searchQuery.trim() !== '') {
        emptyTitle.textContent = 'No matching tasks';
        emptySubtitle.textContent = `No tasks matched your search query "${searchQuery}".`;
      } else if (activeTab === 'overdue') {
        emptyTitle.textContent = 'Great news! No overdue tasks';
        emptySubtitle.textContent = 'All your tasks are either on schedule or already completed.';
      } else if (activeTab === 'completed') {
        emptyTitle.textContent = 'No completed tasks yet';
        emptySubtitle.textContent = 'Mark tasks as done to see them listed here.';
      } else if (activeTab === 'pending') {
        emptyTitle.textContent = 'No pending tasks';
        emptySubtitle.textContent = 'You have completed everything! Relax or create a new task.';
      } else {
        emptyTitle.textContent = 'Your to-do list is empty';
        emptySubtitle.textContent = 'Get started by clicking "+ Add Task" or load sample data.';
      }
    } else {
      emptyState.style.display = 'none';
      tasksList.innerHTML = filtered.map(task => renderTaskCard(task)).join('');
    }
  }

  function renderTaskCard(task) {
    const overdue = isOverdue(task);
    const dueToday = isDueToday(task);
    const pClass = Number(task.priority) === Priority.HIGH
      ? 'priority-high'
      : Number(task.priority) === Priority.MEDIUM
        ? 'priority-medium'
        : 'priority-low';

    const pBorderClass = `${pClass}-border`;
    const completedClass = task.completed ? 'completed' : '';

    let dueBadgeHtml = '';
    if (task.dueDate) {
      let extraClass = '';
      let label = task.dueDate;
      if (overdue) {
        extraClass = 'is-overdue';
        label = `${task.dueDate} (OVERDUE)`;
      } else if (dueToday) {
        extraClass = 'is-today';
        label = `${task.dueDate} (Due Today)`;
      }

      dueBadgeHtml = `
        <span class="badge-due ${extraClass}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          ${label}
        </span>
      `;
    }

    return `
      <div class="task-card ${completedClass} ${pBorderClass}" data-id="${task.id}">
        <div class="task-card-left">
          <div class="task-checkbox-container">
            <input type="checkbox" class="custom-checkbox btn-toggle-complete" 
              data-id="${task.id}" 
              ${task.completed ? 'checked' : ''} 
              aria-label="Toggle completed"
              title="${task.completed ? 'Mark as pending' : 'Mark as completed'}">
          </div>
          <div class="task-details-col">
            <div class="task-title-row">
              <span class="task-id-badge">#${task.id}</span>
              <span class="task-title">${escapeHtml(task.title)}</span>
            </div>
            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
            <div class="task-meta-row">
              <span class="badge-priority ${pClass}">
                <span class="p-dot"></span> ${priorityToString(task.priority)} Priority
              </span>
              ${dueBadgeHtml}
            </div>
          </div>
        </div>

        <div class="task-actions">
          <button class="action-icon-btn btn-view" data-id="${task.id}" title="View Details">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button class="action-icon-btn btn-edit" data-id="${task.id}" title="Edit Task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="action-icon-btn btn-delete" data-id="${task.id}" title="Delete Task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------
  // Task Operations
  // ---------------------------------------------------------
  function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    render();
    if (task.completed) {
      showToast(`Task #${task.id} marked as completed! 🎉`, 'success');
    } else {
      showToast(`Task #${task.id} moved back to pending.`, 'info');
    }
  }

  function openAddModal() {
    editTaskId.value = '';
    modalTitle.textContent = 'Add New Task';
    taskTitleInput.value = '';
    taskDescInput.value = '';
    taskDueDateInput.value = '';
    const lowRadio = document.querySelector('input[name="taskPriority"][value="1"]');
    if (lowRadio) lowRadio.checked = true;

    taskModal.classList.add('active');
    setTimeout(() => taskTitleInput.focus(), 100);
  }

  function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editTaskId.value = task.id;
    modalTitle.textContent = `Edit Task #${task.id}`;
    taskTitleInput.value = task.title;
    taskDescInput.value = task.description || '';
    taskDueDateInput.value = task.dueDate || '';

    const priorityVal = String(task.priority || 1);
    const radio = document.querySelector(`input[name="taskPriority"][value="${priorityVal}"]`);
    if (radio) radio.checked = true;

    taskModal.classList.add('active');
    setTimeout(() => taskTitleInput.focus(), 100);
  }

  function saveTaskFromModal(e) {
    e.preventDefault();
    const title = sanitize(taskTitleInput.value);
    if (!title) {
      alert('Task title cannot be empty.');
      return;
    }

    const desc = sanitize(taskDescInput.value);
    const dueDate = taskDueDateInput.value.trim();
    const selectedPriorityInput = document.querySelector('input[name="taskPriority"]:checked');
    const priority = selectedPriorityInput ? parseInt(selectedPriorityInput.value, 10) : Priority.LOW;

    const idVal = editTaskId.value;
    if (idVal) {
      // Edit existing
      const id = parseInt(idVal, 10);
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.title = title;
        task.description = desc;
        task.priority = priority;
        task.dueDate = dueDate;
        saveTasks();
        render();
        showToast(`Task #${task.id} updated successfully!`, 'success');
      }
    } else {
      // Add new
      const newTask = {
        id: nextId++,
        title: title,
        description: desc,
        priority: priority,
        dueDate: dueDate,
        completed: false
      };
      tasks.push(newTask);
      saveTasks();
      render();
      showToast(`Task #${newTask.id} added!`, 'success');
    }

    closeModal(taskModal);
  }

  function openDeleteModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    taskPendingDelete = task;
    deleteTaskTitleDisplay.textContent = `"${task.title}" (ID #${task.id})`;
    deleteModal.classList.add('active');
  }

  function confirmDelete() {
    if (!taskPendingDelete) return;
    const deletedId = taskPendingDelete.id;
    tasks = tasks.filter(t => t.id !== deletedId);
    saveTasks();
    render();
    closeModal(deleteModal);
    showToast(`Task #${deletedId} was deleted.`, 'danger');
    taskPendingDelete = null;
  }

  function openDetailsModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    viewingTaskId = id;

    const overdue = isOverdue(task);
    const statusText = task.completed ? 'Completed' : (overdue ? 'OVERDUE' : 'Pending');
    const statusColor = task.completed ? 'var(--success)' : (overdue ? 'var(--danger)' : 'var(--warning)');

    detailsModalContent.innerHTML = `
      <div class="detail-row">
        <span class="detail-label">Task ID</span>
        <span class="detail-val detail-val-mono">#${task.id}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Title</span>
        <span class="detail-val" style="font-weight: 700; font-size: 1.1rem;">${escapeHtml(task.title)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Status</span>
        <span class="detail-val" style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Priority</span>
        <span class="detail-val">${priorityToString(task.priority)} (${task.priority})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Due Date</span>
        <span class="detail-val">${task.dueDate ? task.dueDate : 'No due date'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Description</span>
        <div class="detail-desc-box">${task.description ? escapeHtml(task.description) : '<em>No description provided.</em>'}</div>
      </div>
    `;

    detailsModal.classList.add('active');
  }

  function closeModal(modalElem) {
    modalElem.classList.remove('active');
  }

  // ---------------------------------------------------------
  // C++ tasks.txt Compatibility: Export & Import
  // ---------------------------------------------------------

  /**
   * Generates a tasks.txt file matching C++ format:
   * out << t.id << '|' << t.title << '|' << t.description << '|'
   *     << static_cast<int>(t.priority) << '|' << t.dueDate << '|'
   *     << (t.completed ? 1 : 0) << '\n';
   */
  function exportTasksTxt() {
    let output = '';
    tasks.forEach(t => {
      const id = t.id;
      const title = sanitize(t.title);
      const desc = sanitize(t.description || '');
      const p = Number(t.priority) || 1;
      const due = t.dueDate || '';
      const comp = t.completed ? 1 : 0;
      output += `${id}|${title}|${desc}|${p}|${due}|${comp}\n`;
    });

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tasks.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('tasks.txt exported successfully for C++!', 'success');
  }

  /**
   * Parses tasks.txt from the C++ program
   */
  function importTasksTxt(content) {
    const lines = content.split(/\r?\n/);
    const importedTasks = [];
    let maxId = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split('|');
      if (parts.length < 6) continue;

      const id = parseInt(parts[0], 10);
      const title = parts[1];
      const desc = parts[2];
      let p = parseInt(parts[3], 10);
      if (isNaN(p) || p < 1 || p > 3) p = 1;
      const due = parts[4];
      const completed = parts[5] === '1';

      if (!isNaN(id) && title) {
        importedTasks.push({
          id: id,
          title: title,
          description: desc,
          priority: p,
          dueDate: due,
          completed: completed
        });
        if (id > maxId) maxId = id;
      }
    }

    if (importedTasks.length === 0) {
      alert('Could not find any valid tasks in the uploaded file.\nPlease check the format.');
      return;
    }

    tasks = importedTasks;
    nextId = maxId + 1;
    saveTasks();
    render();
    closeModal(syncModal);
    showToast(`Imported ${importedTasks.length} tasks from C++ file!`, 'success');
  }

  // ---------------------------------------------------------
  // Toast Notifications
  // ---------------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'danger') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3200);
  }

  // ---------------------------------------------------------
  // Event Listeners
  // ---------------------------------------------------------
  function setupEventListeners() {
    // Current Date Display
    headerTodayDate.textContent = `Today: ${todayDate()}`;

    // Add Task Buttons
    btnOpenAddModal.addEventListener('click', openAddModal);
    btnEmptyAddTask.addEventListener('click', openAddModal);

    // Modal Close
    btnCloseModal.addEventListener('click', () => closeModal(taskModal));
    btnCancelModal.addEventListener('click', () => closeModal(taskModal));
    taskModal.addEventListener('click', e => {
      if (e.target === taskModal) closeModal(taskModal);
    });

    // Form Submit
    taskForm.addEventListener('submit', saveTaskFromModal);

    // Details Modal
    btnCloseDetailsModal.addEventListener('click', () => closeModal(detailsModal));
    btnCloseDetailsBtn.addEventListener('click', () => closeModal(detailsModal));
    detailsModal.addEventListener('click', e => {
      if (e.target === detailsModal) closeModal(detailsModal);
    });
    btnEditFromDetails.addEventListener('click', () => {
      closeModal(detailsModal);
      if (viewingTaskId) openEditModal(viewingTaskId);
    });

    // Delete Modal
    btnCloseDeleteModal.addEventListener('click', () => closeModal(deleteModal));
    btnCancelDelete.addEventListener('click', () => closeModal(deleteModal));
    btnConfirmDelete.addEventListener('click', confirmDelete);
    deleteModal.addEventListener('click', e => {
      if (e.target === deleteModal) closeModal(deleteModal);
    });

    // Sync Modal
    btnSyncCpp.addEventListener('click', () => syncModal.classList.add('active'));
    btnCloseSyncModal.addEventListener('click', () => closeModal(syncModal));
    syncModal.addEventListener('click', e => {
      if (e.target === syncModal) closeModal(syncModal);
    });
    btnExportTxt.addEventListener('click', exportTasksTxt);

    fileImportInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        importTasksTxt(event.target.result);
        fileImportInput.value = '';
      };
      reader.readAsText(file);
    });

    // Reset Samples
    btnResetSamples.addEventListener('click', () => {
      if (confirm('Reset tasks to sample demo data? Your custom tasks will be replaced.')) {
        tasks = JSON.parse(JSON.stringify(SAMPLE_TASKS));
        nextId = 5;
        saveTasks();
        render();
        showToast('Sample tasks reloaded!', 'info');
      }
    });

    // Filter Tabs
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.getAttribute('data-tab');
        render();
      });
    });

    // Search Input
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value;
      btnSearchClear.style.display = searchQuery ? 'block' : 'none';
      render();
    });

    btnSearchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      btnSearchClear.style.display = 'none';
      searchInput.focus();
      render();
    });

    // Priority Filter Select
    priorityFilterSelect.addEventListener('change', e => {
      priorityFilter = e.target.value;
      render();
    });

    // Sort By Select
    sortBySelect.addEventListener('change', e => {
      sortBy = e.target.value;
      render();
    });

    // Delegated Clicks on Task List
    tasksList.addEventListener('click', e => {
      const toggleBtn = e.target.closest('.btn-toggle-complete');
      if (toggleBtn) {
        const id = parseInt(toggleBtn.getAttribute('data-id'), 10);
        toggleComplete(id);
        return;
      }

      const viewBtn = e.target.closest('.btn-view');
      if (viewBtn) {
        const id = parseInt(viewBtn.getAttribute('data-id'), 10);
        openDetailsModal(id);
        return;
      }

      const editBtn = e.target.closest('.btn-edit');
      if (editBtn) {
        const id = parseInt(editBtn.getAttribute('data-id'), 10);
        openEditModal(id);
        return;
      }

      const deleteBtn = e.target.closest('.btn-delete');
      if (deleteBtn) {
        const id = parseInt(deleteBtn.getAttribute('data-id'), 10);
        openDeleteModal(id);
        return;
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeModal(taskModal);
        closeModal(detailsModal);
        closeModal(deleteModal);
        closeModal(syncModal);
      }
    });
  }

  // ---------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------
  function init() {
    loadTasks();
    setupEventListeners();
    render();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
