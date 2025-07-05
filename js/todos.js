// Todo management system
class TodosManager {
  static todos = [];
  static currentTodo = null;
  static reminders = new Map();

  static init() {
    this.loadTodos();
    this.setupEventListeners();
    this.setupReminders();
  }

  static setupEventListeners() {
    // Todo editor events
    document.getElementById('save-todo-btn').addEventListener('click', () => this.saveCurrentTodo());
    document.getElementById('delete-todo-btn').addEventListener('click', () => this.deleteCurrentTodo());
    
    // Auto-save on content change
    document.getElementById('todo-title').addEventListener('input', () => this.autoSave());
    document.getElementById('todo-description').addEventListener('input', () => this.autoSave());
    document.getElementById('todo-due-date').addEventListener('change', () => this.autoSave());
    document.getElementById('todo-priority').addEventListener('change', () => this.autoSave());
  }

  static loadTodos() {
    try {
      const savedTodos = StorageManager.loadEncrypted('todos');
      this.todos = savedTodos || [];
    } catch (error) {
      console.error('Failed to load todos:', error);
      this.todos = [];
    }
  }

  static saveTodos() {
    try {
      StorageManager.saveEncrypted('todos', this.todos);
      return true;
    } catch (error) {
      console.error('Failed to save todos:', error);
      return false;
    }
  }

  static createTodo(title = '', description = '', dueDate = null, priority = 'medium') {
    const todo = {
      id: CryptoManager.generateId(),
      title: title || 'New Task',
      description: description,
      dueDate: dueDate,
      priority: priority,
      completed: false,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      completedAt: null,
      encrypted: true
    };
    
    this.todos.unshift(todo);
    this.saveTodos();
    
    // Setup reminder if due date is set
    if (dueDate) {
      this.scheduleReminder(todo);
    }
    
    // Sync with peers
    SyncManager.syncTodo(todo);
    
    return todo;
  }

  static updateTodo(id, updates) {
    const todoIndex = this.todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) return null;
    
    const todo = this.todos[todoIndex];
    const oldDueDate = todo.dueDate;
    
    Object.assign(todo, updates);
    todo.modified = new Date().toISOString();
    
    // Update completion status
    if (updates.hasOwnProperty('completed')) {
      todo.completedAt = updates.completed ? new Date().toISOString() : null;
    }
    
    this.saveTodos();
    
    // Update reminder if due date changed
    if (oldDueDate !== todo.dueDate) {
      this.cancelReminder(id);
      if (todo.dueDate && !todo.completed) {
        this.scheduleReminder(todo);
      }
    }
    
    // Sync with peers
    SyncManager.syncTodo(todo);
    
    return todo;
  }

  static deleteTodo(id) {
    const todoIndex = this.todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) return false;
    
    this.todos.splice(todoIndex, 1);
    this.saveTodos();
    
    // Cancel reminder
    this.cancelReminder(id);
    
    // Sync deletion with peers
    SyncManager.deleteTodo(id);
    
    return true;
  }

  static toggleTodo(id) {
    const todo = this.getTodoById(id);
    if (!todo) return false;
    
    const completed = !todo.completed;
    this.updateTodo(id, { completed });
    
    if (completed) {
      UIManager.showNotification(LanguageManager.get('task_completed'), 'success');
      this.cancelReminder(id);
    } else {
      // Re-schedule reminder if due date is set
      if (todo.dueDate) {
        this.scheduleReminder(todo);
      }
    }
    
    return true;
  }

  static getTodoById(id) {
    return this.todos.find(todo => todo.id === id);
  }

  static getAllTodos() {
    return [...this.todos].sort((a, b) => {
      // Sort by completion status first, then by priority, then by due date
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      
      return new Date(b.modified) - new Date(a.modified);
    });
  }

  static searchTodos(query) {
    if (!query.trim()) return this.getAllTodos();
    
    const lowercaseQuery = query.toLowerCase();
    return this.todos.filter(todo => 
      todo.title.toLowerCase().includes(lowercaseQuery) ||
      todo.description.toLowerCase().includes(lowercaseQuery)
    ).sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  static showTodoEditor(todo) {
    this.currentTodo = todo;
    
    // Hide welcome content
    document.getElementById('welcome-content').classList.add('hidden');
    document.getElementById('note-editor').classList.add('hidden');
    
    // Show todo editor
    document.getElementById('todo-editor').classList.remove('hidden');
    
    // Populate editor
    document.getElementById('todo-title').value = todo.title || '';
    document.getElementById('todo-description').value = todo.description || '';
    document.getElementById('todo-due-date').value = todo.dueDate ? todo.dueDate.split('T')[0] : '';
    document.getElementById('todo-priority').value = todo.priority || 'medium';
    document.getElementById('todo-created').textContent = UIManager.formatDate(todo.created, 'relative');
    
    // Focus on title if empty, otherwise description
    if (!todo.title) {
      document.getElementById('todo-title').focus();
    } else {
      document.getElementById('todo-description').focus();
    }
  }

  static saveCurrentTodo() {
    if (!this.currentTodo) return;
    
    const title = document.getElementById('todo-title').value.trim();
    const description = document.getElementById('todo-description').value.trim();
    const dueDate = document.getElementById('todo-due-date').value;
    const priority = document.getElementById('todo-priority').value;
    
    if (!title) {
      UIManager.showNotification(LanguageManager.get('todo_title_required'), 'warning');
      return;
    }
    
    this.updateTodo(this.currentTodo.id, {
      title: title,
      description: description,
      dueDate: dueDate || null,
      priority: priority
    });
    
    // Refresh todos list
    if (window.app) {
      window.app.loadItems();
    }
    
    UIManager.showNotification(LanguageManager.get('todo_saved'), 'success');
  }

  static deleteCurrentTodo() {
    if (!this.currentTodo) return;
    
    UIManager.showConfirmDialog(
      LanguageManager.get('delete_todo'),
      LanguageManager.get('delete_todo_confirm'),
      () => {
        this.deleteTodo(this.currentTodo.id);
        this.currentTodo = null;
        
        // Hide editor and show welcome
        document.getElementById('todo-editor').classList.add('hidden');
        document.getElementById('welcome-content').classList.remove('hidden');
        
        // Refresh todos list
        if (window.app) {
          window.app.loadItems();
        }
        
        UIManager.showNotification(LanguageManager.get('todo_deleted'), 'success');
      }
    );
  }

  static autoSave() {
    if (!this.currentTodo) return;
    
    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    // Set new timeout
    this.autoSaveTimeout = setTimeout(() => {
      this.saveCurrentTodo();
    }, 2000); // Auto-save after 2 seconds of inactivity
  }

  static scheduleReminder(todo) {
    if (!todo.dueDate || todo.completed) return;
    
    const dueDate = new Date(todo.dueDate);
    const now = new Date();
    
    // Schedule reminder 1 day before due date
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    
    if (reminderDate > now) {
      const timeout = reminderDate.getTime() - now.getTime();
      const timeoutId = setTimeout(() => {
        this.showReminder(todo);
      }, timeout);
      
      this.reminders.set(todo.id, timeoutId);
    }
    
    // Schedule reminder on due date
    if (dueDate > now) {
      const timeout = dueDate.getTime() - now.getTime();
      const timeoutId = setTimeout(() => {
        this.showReminder(todo, true);
      }, timeout);
      
      this.reminders.set(todo.id + '_due', timeoutId);
    }
  }

  static cancelReminder(todoId) {
    const timeoutId = this.reminders.get(todoId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.reminders.delete(todoId);
    }
    
    const dueTimeoutId = this.reminders.get(todoId + '_due');
    if (dueTimeoutId) {
      clearTimeout(dueTimeoutId);
      this.reminders.delete(todoId + '_due');
    }
  }

  static showReminder(todo, isDue = false) {
    const message = isDue 
      ? `${LanguageManager.get('task_due_now')}: ${todo.title}`
      : `${LanguageManager.get('task_due_tomorrow')}: ${todo.title}`;
    
    UIManager.showNotification(message, 'warning', 10000);
    
    // Show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(LanguageManager.get('task_reminder'), {
        body: message,
        icon: '/icons/icon-192.png'
      });
    }
  }

  static setupReminders() {
    // Schedule reminders for all existing todos
    this.todos.forEach(todo => {
      if (!todo.completed && todo.dueDate) {
        this.scheduleReminder(todo);
      }
    });
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  static importTodo(todoData) {
    try {
      // Validate todo data
      if (!todoData.id || !todoData.title) {
        throw new Error('Invalid todo data');
      }
      
      // Check if todo already exists
      const existingTodo = this.getTodoById(todoData.id);
      if (existingTodo) {
        // Update if imported todo is newer
        if (new Date(todoData.modified) > new Date(existingTodo.modified)) {
          this.updateTodo(todoData.id, todoData);
          return 'updated';
        }
        return 'skipped';
      }
      
      // Add new todo
      this.todos.push(todoData);
      this.saveTodos();
      
      // Schedule reminder if needed
      if (todoData.dueDate && !todoData.completed) {
        this.scheduleReminder(todoData);
      }
      
      return 'added';
    } catch (error) {
      console.error('Failed to import todo:', error);
      return 'error';
    }
  }

  static getCompletedTodos() {
    return this.todos.filter(todo => todo.completed);
  }

  static getPendingTodos() {
    return this.todos.filter(todo => !todo.completed);
  }

  static getOverdueTodos() {
    const now = new Date();
    return this.todos.filter(todo => 
      !todo.completed && 
      todo.dueDate && 
      new Date(todo.dueDate) < now
    );
  }

  static getTodosByPriority(priority) {
    return this.todos.filter(todo => todo.priority === priority);
  }

  static getTodosStats() {
    const stats = {
      total: this.todos.length,
      completed: this.getCompletedTodos().length,
      pending: this.getPendingTodos().length,
      overdue: this.getOverdueTodos().length,
      high: this.getTodosByPriority('high').length,
      medium: this.getTodosByPriority('medium').length,
      low: this.getTodosByPriority('low').length,
      completionRate: 0
    };
    
    if (stats.total > 0) {
      stats.completionRate = Math.round((stats.completed / stats.total) * 100);
    }
    
    return stats;
  }

  static duplicateTodo(id) {
    const todo = this.getTodoById(id);
    if (!todo) return null;
    
    const duplicatedTodo = this.createTodo(
      `${todo.title} (Copy)`,
      todo.description,
      todo.dueDate,
      todo.priority
    );
    
    return duplicatedTodo;
  }

  static clearCompletedTodos() {
    const completedTodos = this.getCompletedTodos();
    
    UIManager.showConfirmDialog(
      LanguageManager.get('clear_completed'),
      `${LanguageManager.get('clear_completed_confirm')} ${completedTodos.length} ${LanguageManager.get('tasks')}?`,
      () => {
        completedTodos.forEach(todo => this.deleteTodo(todo.id));
        
        // Refresh todos list
        if (window.app) {
          window.app.loadItems();
        }
        
        UIManager.showNotification(LanguageManager.get('completed_todos_cleared'), 'success');
      }
    );
  }

  static getTodosDueToday() {
    const today = new Date().toISOString().split('T')[0];
    return this.todos.filter(todo => 
      !todo.completed && 
      todo.dueDate && 
      todo.dueDate.split('T')[0] === today
    );
  }

  static getTodosDueThisWeek() {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return this.todos.filter(todo => 
      !todo.completed && 
      todo.dueDate && 
      new Date(todo.dueDate) >= now &&
      new Date(todo.dueDate) <= weekFromNow
    );
  }
}
