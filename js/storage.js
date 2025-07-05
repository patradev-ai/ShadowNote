// Storage manager for encrypted data persistence
class StorageManager {
  static prefix = 'dnp_';

  static hasUserData() {
    return localStorage.getItem('dnp_salt') && localStorage.getItem('dnp_key_hash');
  }

  static saveEncrypted(key, data) {
    try {
      const encrypted = CryptoManager.encrypt(data);
      localStorage.setItem(this.prefix + key, encrypted);
      return true;
    } catch (error) {
      console.error('Failed to save encrypted data:', error);
      return false;
    }
  }

  static loadEncrypted(key) {
    try {
      const encrypted = localStorage.getItem(this.prefix + key);
      if (!encrypted) return null;
      
      return CryptoManager.decrypt(encrypted);
    } catch (error) {
      console.error('Failed to load encrypted data:', error);
      return null;
    }
  }

  static deleteEncrypted(key) {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.error('Failed to delete encrypted data:', error);
      return false;
    }
  }

  static save(key, data) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  }

  static load(key) {
    try {
      const data = localStorage.getItem(this.prefix + key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load data:', error);
      return null;
    }
  }

  static delete(key) {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.error('Failed to delete data:', error);
      return false;
    }
  }

  static getAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  static getStorageInfo() {
    const keys = this.getAllKeys();
    const info = {
      totalKeys: keys.length,
      userKeys: keys.filter(key => !['salt', 'key_hash', 'theme', 'language'].includes(key)).length,
      systemKeys: keys.filter(key => ['salt', 'key_hash', 'theme', 'language'].includes(key)).length,
      storageUsed: 0
    };

    // Calculate storage usage
    keys.forEach(key => {
      const value = localStorage.getItem(this.prefix + key);
      if (value) {
        info.storageUsed += value.length;
      }
    });

    return info;
  }

  static clearUserData() {
    const keys = this.getAllKeys();
    keys.forEach(key => {
      if (!['theme', 'language'].includes(key)) {
        this.delete(key);
      }
    });
  }

  static exportData() {
    const data = {};
    const keys = this.getAllKeys();
    
    keys.forEach(key => {
      if (!['salt', 'key_hash'].includes(key)) {
        data[key] = localStorage.getItem(this.prefix + key);
      }
    });
    
    return data;
  }

  static importData(data) {
    Object.keys(data).forEach(key => {
      if (!['salt', 'key_hash'].includes(key)) {
        localStorage.setItem(this.prefix + key, data[key]);
      }
    });
  }

  // IndexedDB operations for larger data (future enhancement)
  static async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DecentralizedNotepad', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('title', 'title', { unique: false });
          notesStore.createIndex('created', 'created', { unique: false });
          notesStore.createIndex('modified', 'modified', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('todos')) {
          const todosStore = db.createObjectStore('todos', { keyPath: 'id' });
          todosStore.createIndex('title', 'title', { unique: false });
          todosStore.createIndex('dueDate', 'dueDate', { unique: false });
          todosStore.createIndex('priority', 'priority', { unique: false });
          todosStore.createIndex('completed', 'completed', { unique: false });
        }
      };
    });
  }

  static async saveToIndexedDB(storeName, data) {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Encrypt data before storing
      const encryptedData = {
        ...data,
        encryptedContent: CryptoManager.encrypt(data)
      };
      
      await store.put(encryptedData);
      return true;
    } catch (error) {
      console.error('Failed to save to IndexedDB:', error);
      return false;
    }
  }

  static async loadFromIndexedDB(storeName, id) {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(id);
      const result = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (result && result.encryptedContent) {
        return CryptoManager.decrypt(result.encryptedContent);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
      return null;
    }
  }
}
