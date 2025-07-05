// Decentralized sync manager using GUN.js
class SyncManager {
  static gun = null;
  static user = null;
  static isOnline = false;
  static peers = [];
  static syncEnabled = true;

  static async init() {
    try {
      // Initialize GUN with relay peers
      this.gun = GUN([
        'https://gun-manhattan.herokuapp.com/gun',
        'https://gun-us.herokuapp.com/gun',
        'https://gun-eu.herokuapp.com/gun'
      ]);

      // Setup connection monitoring
      this.setupConnectionMonitoring();
      
      // Setup sync handlers
      this.setupSyncHandlers();
      
      console.log('Sync manager initialized');
    } catch (error) {
      console.error('Failed to initialize sync manager:', error);
    }
  }

  static setupConnectionMonitoring() {
    if (!this.gun) return;

    // Monitor connection status
    this.gun.on('hi', (peer) => {
      this.peers.push(peer);
      this.updateConnectionStatus();
    });

    this.gun.on('bye', (peer) => {
      this.peers = this.peers.filter(p => p !== peer);
      this.updateConnectionStatus();
    });

    // Periodic connection check
    setInterval(() => {
      this.checkConnection();
    }, 30000); // Check every 30 seconds
  }

  static setupSyncHandlers() {
    if (!this.gun) return;

    // Listen for note updates
    this.gun.get('notes').on((data, key) => {
      if (data && key && this.syncEnabled) {
        this.handleIncomingNote(data, key);
      }
    });

    // Listen for todo updates
    this.gun.get('todos').on((data, key) => {
      if (data && key && this.syncEnabled) {
        this.handleIncomingTodo(data, key);
      }
    });
  }

  static async startSync() {
    if (!this.gun) return;

    try {
      // Generate or load user identity
      const userKey = StorageManager.load('user_key');
      if (userKey) {
        this.user = this.gun.user();
        this.user.auth(userKey);
      } else {
        this.user = this.gun.user();
        this.user.create('user', 'password', (ack) => {
          if (ack.err) {
            console.error('Failed to create user:', ack.err);
          } else {
            StorageManager.save('user_key', 'user');
            this.syncAllData();
          }
        });
      }

      this.syncEnabled = true;
      this.updateConnectionStatus();
      
    } catch (error) {
      console.error('Failed to start sync:', error);
    }
  }

  static stopSync() {
    this.syncEnabled = false;
    this.updateConnectionStatus();
  }

  static async syncNote(note) {
    if (!this.gun || !this.syncEnabled || !note) return;

    try {
      // Encrypt note data
      const encryptedNote = {
        id: note.id,
        data: CryptoManager.encrypt(note),
        timestamp: Date.now(),
        hash: CryptoManager.hashData(note)
      };

      // Save to GUN
      this.gun.get('notes').get(note.id).put(encryptedNote);
      
    } catch (error) {
      console.error('Failed to sync note:', error);
    }
  }

  static async syncTodo(todo) {
    if (!this.gun || !this.syncEnabled || !todo) return;

    try {
      // Encrypt todo data
      const encryptedTodo = {
        id: todo.id,
        data: CryptoManager.encrypt(todo),
        timestamp: Date.now(),
        hash: CryptoManager.hashData(todo)
      };

      // Save to GUN
      this.gun.get('todos').get(todo.id).put(encryptedTodo);
      
    } catch (error) {
      console.error('Failed to sync todo:', error);
    }
  }

  static async deleteNote(noteId) {
    if (!this.gun || !this.syncEnabled || !noteId) return;

    try {
      // Mark as deleted
      const deletionRecord = {
        id: noteId,
        deleted: true,
        timestamp: Date.now()
      };

      this.gun.get('notes').get(noteId).put(deletionRecord);
      
    } catch (error) {
      console.error('Failed to sync note deletion:', error);
    }
  }

  static async deleteTodo(todoId) {
    if (!this.gun || !this.syncEnabled || !todoId) return;

    try {
      // Mark as deleted
      const deletionRecord = {
        id: todoId,
        deleted: true,
        timestamp: Date.now()
      };

      this.gun.get('todos').get(todoId).put(deletionRecord);
      
    } catch (error) {
      console.error('Failed to sync todo deletion:', error);
    }
  }

  static async syncAllData() {
    if (!this.gun || !this.syncEnabled) return;

    try {
      // Sync all notes
      const notes = NotesManager.getAllNotes();
      notes.forEach(note => this.syncNote(note));

      // Sync all todos
      const todos = TodosManager.getAllTodos();
      todos.forEach(todo => this.syncTodo(todo));

      UIManager.showNotification(LanguageManager.get('sync_started'), 'info');
      
    } catch (error) {
      console.error('Failed to sync all data:', error);
    }
  }

  static handleIncomingNote(data, key) {
    if (!data || !data.id || data.deleted) {
      // Handle deletion
      if (data.deleted) {
        NotesManager.deleteNote(data.id);
        if (window.app) {
          window.app.loadItems();
        }
      }
      return;
    }

    try {
      // Decrypt note
      const note = CryptoManager.decrypt(data.data);
      
      // Check if we already have this note
      const existingNote = NotesManager.getNoteById(note.id);
      
      if (!existingNote) {
        // New note
        NotesManager.notes.push(note);
        NotesManager.saveNotes();
        
        if (window.app && window.app.currentMode === 'notes') {
          window.app.loadItems();
        }
        
        UIManager.showNotification(LanguageManager.get('note_synced'), 'success');
        
      } else if (new Date(note.modified) > new Date(existingNote.modified)) {
        // Update existing note if remote is newer
        NotesManager.updateNote(note.id, note);
        
        if (window.app && window.app.currentMode === 'notes') {
          window.app.loadItems();
        }
        
        UIManager.showNotification(LanguageManager.get('note_updated'), 'info');
      }
      
    } catch (error) {
      console.error('Failed to handle incoming note:', error);
    }
  }

  static handleIncomingTodo(data, key) {
    if (!data || !data.id || data.deleted) {
      // Handle deletion
      if (data.deleted) {
        TodosManager.deleteTodo(data.id);
        if (window.app) {
          window.app.loadItems();
        }
      }
      return;
    }

    try {
      // Decrypt todo
      const todo = CryptoManager.decrypt(data.data);
      
      // Check if we already have this todo
      const existingTodo = TodosManager.getTodoById(todo.id);
      
      if (!existingTodo) {
        // New todo
        TodosManager.todos.push(todo);
        TodosManager.saveTodos();
        
        // Schedule reminder if needed
        if (todo.dueDate && !todo.completed) {
          TodosManager.scheduleReminder(todo);
        }
        
        if (window.app && window.app.currentMode === 'todos') {
          window.app.loadItems();
        }
        
        UIManager.showNotification(LanguageManager.get('todo_synced'), 'success');
        
      } else if (new Date(todo.modified) > new Date(existingTodo.modified)) {
        // Update existing todo if remote is newer
        TodosManager.updateTodo(todo.id, todo);
        
        if (window.app && window.app.currentMode === 'todos') {
          window.app.loadItems();
        }
        
        UIManager.showNotification(LanguageManager.get('todo_updated'), 'info');
      }
      
    } catch (error) {
      console.error('Failed to handle incoming todo:', error);
    }
  }

  static updateConnectionStatus() {
    const isOnline = this.peers.length > 0 && this.syncEnabled;
    
    if (isOnline !== this.isOnline) {
      this.isOnline = isOnline;
      
      if (isOnline) {
        UIManager.updateSyncStatus('online', this.peers.length);
        this.syncAllData();
      } else {
        UIManager.updateSyncStatus('offline', 0);
      }
    }
  }

  static checkConnection() {
    if (!this.gun) return;

    // Send a test message to check connectivity
    this.gun.get('heartbeat').put({ timestamp: Date.now() });
  }

  static getConnectionInfo() {
    return {
      isOnline: this.isOnline,
      peerCount: this.peers.length,
      syncEnabled: this.syncEnabled,
      gunInstance: !!this.gun
    };
  }

  static async resolveSyncConflict(localData, remoteData) {
    // Simple conflict resolution: use the most recent timestamp
    const localTime = new Date(localData.modified);
    const remoteTime = new Date(remoteData.modified);
    
    if (remoteTime > localTime) {
      return remoteData;
    } else if (localTime > remoteTime) {
      return localData;
    } else {
      // Same timestamp, merge data
      return {
        ...localData,
        ...remoteData,
        modified: new Date().toISOString()
      };
    }
  }

  static async forceSyncAll() {
    if (!this.gun || !this.syncEnabled) return;

    try {
      UIManager.updateSyncStatus('syncing');
      
      // Clear existing data and re-sync
      await this.syncAllData();
      
      UIManager.showNotification(LanguageManager.get('sync_complete'), 'success');
      
    } catch (error) {
      console.error('Failed to force sync:', error);
      UIManager.showNotification(LanguageManager.get('sync_failed'), 'error');
    }
  }

  static exportSyncData() {
    if (!this.gun) return null;

    try {
      const syncData = {
        notes: {},
        todos: {},
        exported: new Date().toISOString()
      };

      // Get all synced notes
      this.gun.get('notes').once((notes) => {
        if (notes) {
          Object.keys(notes).forEach(key => {
            if (notes[key] && typeof notes[key] === 'object') {
              syncData.notes[key] = notes[key];
            }
          });
        }
      });

      // Get all synced todos
      this.gun.get('todos').once((todos) => {
        if (todos) {
          Object.keys(todos).forEach(key => {
            if (todos[key] && typeof todos[key] === 'object') {
              syncData.todos[key] = todos[key];
            }
          });
        }
      });

      return syncData;
      
    } catch (error) {
      console.error('Failed to export sync data:', error);
      return null;
    }
  }

  static clearSyncData() {
    if (!this.gun) return;

    try {
      // Clear all synced data
      this.gun.get('notes').put(null);
      this.gun.get('todos').put(null);
      
      UIManager.showNotification(LanguageManager.get('sync_data_cleared'), 'success');
      
    } catch (error) {
      console.error('Failed to clear sync data:', error);
    }
  }
}
