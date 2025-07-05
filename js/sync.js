// Decentralized sync manager using GUN.js
class SyncManager {
  static gun = null;
  static isOnline = false;
  static syncQueue = [];
  static autoSaveInterval = null;
  static peers = [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://gunjs.herokuapp.com/gun',
    'https://gun-us.herokuapp.com/gun'
  ];

  static async init() {
    try {
      // Initialize GUN with relay peers
      this.gun = GUN({
        peers: this.peers,
        localStorage: false, // We handle encryption ourselves
        radisk: false
      });

      // Setup connection monitoring
      this.setupConnectionMonitoring();

      // Start auto-save interval
      this.startAutoSave();

      console.log('Sync manager initialized');
      UIManager.updateSyncStatus('offline');
    } catch (error) {
      console.error('Failed to initialize sync manager:', error);
      UIManager.updateSyncStatus('offline');
    }
  }

  static setupConnectionMonitoring() {
    // Monitor connection status
    this.gun.on('hi', (peer) => {
      this.isOnline = true;
      UIManager.updateSyncStatus('online', Object.keys(this.gun._.opt.peers).length);
    });

    this.gun.on('bye', (peer) => {
      const peerCount = Object.keys(this.gun._.opt.peers).length;
      if (peerCount === 0) {
        this.isOnline = false;
        UIManager.updateSyncStatus('offline');
      } else {
        UIManager.updateSyncStatus('online', peerCount);
      }
    });
  }

  static startAutoSave() {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.syncLocalData();
    }, 30000);
  }

  static stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  static async saveNote(note) {
    try {
      // Save locally first
      StorageManager.saveEncrypted(`note_${note.id}`, note);

      // Add to sync queue
      this.syncQueue.push({
        type: 'note',
        action: 'save',
        data: note,
        timestamp: Date.now()
      });

      // Try to sync immediately if online
      if (this.isOnline) {
        await this.syncItem('note', note);
      }

      return true;
    } catch (error) {
      console.error('Failed to save note:', error);
      return false;
    }
  }

  static async saveTodo(todo) {
    try {
      // Save locally first
      StorageManager.saveEncrypted(`todo_${todo.id}`, todo);

      // Add to sync queue
      this.syncQueue.push({
        type: 'todo',
        action: 'save',
        data: todo,
        timestamp: Date.now()
      });

      // Try to sync immediately if online
      if (this.isOnline) {
        await this.syncItem('todo', todo);
      }

      return true;
    } catch (error) {
      console.error('Failed to save todo:', error);
      return false;
    }
  }

  static async syncItem(type, item) {
    if (!this.gun || !this.isOnline) return false;

    try {
      UIManager.updateSyncStatus('syncing');

      // Create a unique key for this user's data
      const userKey = CryptoManager.getUserKey();
      const itemKey = `${type}_${item.id}`;

      // Encrypt the item before syncing
      const encryptedItem = CryptoManager.encrypt(JSON.stringify(item));

      // Store in GUN
      await new Promise((resolve, reject) => {
        this.gun.get(userKey).get(itemKey).put(encryptedItem, (ack) => {
          if (ack.err) {
            reject(new Error(ack.err));
          } else {
            resolve();
          }
        });
      });

      UIManager.updateSyncStatus('online');
      return true;
    } catch (error) {
      console.error(`Failed to sync ${type}:`, error);
      UIManager.updateSyncStatus('offline');
      return false;
    }
  }

  static async syncLocalData() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const itemsToSync = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item.type, item.data);
      } catch (error) {
        // Re-add to queue if sync fails
        this.syncQueue.push(item);
      }
    }
  }

  static async loadUserData() {
    if (!this.gun || !this.isOnline) return null;

    try {
      const userKey = CryptoManager.getUserKey();
      const userData = {};

      // Get all user data from GUN
      await new Promise((resolve) => {
        this.gun.get(userKey).map().on((data, key) => {
          if (data && key) {
            try {
              const decrypted = CryptoManager.decrypt(data);
              const item = JSON.parse(decrypted);

              if (key.startsWith('note_')) {
                if (!userData.notes) userData.notes = [];
                userData.notes.push(item);
              } else if (key.startsWith('todo_')) {
                if (!userData.todos) userData.todos = [];
                userData.todos.push(item);
              }
            } catch (error) {
              console.error('Failed to decrypt synced data:', error);
            }
          }
        });

        // Wait a bit for data to load
        setTimeout(resolve, 2000);
      });

      return userData;
    } catch (error) {
      console.error('Failed to load user data:', error);
      return null;
    }
  }

  static async deleteItem(type, id) {
    try {
      // Delete locally
      StorageManager.deleteEncrypted(`${type}_${id}`);

      // Delete from GUN if online
      if (this.isOnline) {
        const userKey = CryptoManager.getUserKey();
        const itemKey = `${type}_${id}`;

        this.gun.get(userKey).get(itemKey).put(null);
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
      return false;
    }
  }

  static startSync() {
    // Start background sync
    this.syncLocalData();
  }

  static stopSync() {
    this.stopAutoSave();
  }

  static getSyncStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      peerCount: this.gun ? Object.keys(this.gun._.opt.peers).length : 0
    };
  }
}