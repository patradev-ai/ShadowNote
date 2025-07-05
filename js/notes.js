// Notes management system
class NotesManager {
  static notes = [];
  static currentNote = null;

  static init() {
    this.loadNotes();
    this.setupEventListeners();
  }

  static setupEventListeners() {
    // Note editor events
    document.getElementById('save-note-btn').addEventListener('click', () => this.saveCurrentNote());
    document.getElementById('delete-note-btn').addEventListener('click', () => this.deleteCurrentNote());

    // Auto-save on content change
    document.getElementById('note-title').addEventListener('input', () => this.autoSave());
    document.getElementById('note-content').addEventListener('input', () => this.autoSave());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            this.saveCurrentNote();
            break;
          case 'd':
            e.preventDefault();
            this.deleteCurrentNote();
            break;
        }
      }
    });
  }

  static loadNotes() {
    try {
      const savedNotes = StorageManager.loadEncrypted('notes');
      this.notes = savedNotes || [];
    } catch (error) {
      console.error('Failed to load notes:', error);
      this.notes = [];
    }
  }

  static saveNotes() {
    try {
      StorageManager.saveEncrypted('notes', this.notes);
      return true;
    } catch (error) {
      console.error('Failed to save notes:', error);
      return false;
    }
  }

  static createNote(title = '', content = '') {
    const note = {
      id: CryptoManager.generateId(),
      title: title || 'Untitled Note',
      content: content,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: [],
      encrypted: true
    };

    this.notes.unshift(note);
    this.saveNotes();

    // Sync with peers
    SyncManager.syncNote(note);

    return note;
  }

  static async updateNote(id, updates) {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return null;

    const note = this.notes[noteIndex];
    Object.assign(note, updates);
    note.modified = new Date().toISOString();

    const success = await SyncManager.saveNote(note); // Updated to use SyncManager and GUN.js
    if (!success) return null;

    this.saveNotes();
    // Sync with peers
    SyncManager.syncNote(note);

    return note;
  }

  static deleteNote(id) {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return false;

    const note = this.notes[noteIndex];
    this.notes.splice(noteIndex, 1);
    this.saveNotes();

    // Sync deletion with peers
    SyncManager.deleteNote(id);

    return true;
  }

  static getNoteById(id) {
    return this.notes.find(note => note.id === id);
  }

  static getAllNotes() {
    return [...this.notes].sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  static searchNotes(query) {
    if (!query.trim()) return this.getAllNotes();

    const lowercaseQuery = query.toLowerCase();
    return this.notes.filter(note => 
      note.title.toLowerCase().includes(lowercaseQuery) ||
      note.content.toLowerCase().includes(lowercaseQuery) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    ).sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  static showNoteEditor(note) {
    this.currentNote = note;

    // Hide welcome content
    document.getElementById('welcome-content').classList.add('hidden');
    document.getElementById('todo-editor').classList.add('hidden');

    // Show note editor
    document.getElementById('note-editor').classList.remove('hidden');

    // Populate editor
    document.getElementById('note-title').value = note.title || '';
    document.getElementById('note-content').value = note.content || '';
    document.getElementById('note-modified').textContent = UIManager.formatDate(note.modified, 'relative');

    // Focus on title if empty, otherwise content
    if (!note.title) {
      document.getElementById('note-title').focus();
    } else {
      document.getElementById('note-content').focus();
    }
  }

  static async saveCurrentNote() {
    if (!this.currentNote) return;

    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();

    if (!title && !content) {
      UIManager.showNotification(LanguageManager.get('note_empty'), 'warning');
      return;
    }

    await this.updateNote(this.currentNote.id, {
      title: title || 'Untitled Note',
      content: content
    });

    // Update UI
    document.getElementById('note-modified').textContent = UIManager.formatDate(new Date(), 'relative');

    // Refresh notes list
    if (window.app) {
      window.app.loadItems();
    }

    UIManager.showNotification(LanguageManager.get('note_saved'), 'success');
  }

  static deleteCurrentNote() {
    if (!this.currentNote) return;

    UIManager.showConfirmDialog(
      LanguageManager.get('delete_note'),
      LanguageManager.get('delete_note_confirm'),
      () => {
        this.deleteNote(this.currentNote.id);
        this.currentNote = null;

        // Hide editor and show welcome
        document.getElementById('note-editor').classList.add('hidden');
        document.getElementById('welcome-content').classList.remove('hidden');

        // Refresh notes list
        if (window.app) {
          window.app.loadItems();
        }

        UIManager.showNotification(LanguageManager.get('note_deleted'), 'success');
      }
    );
  }

  static autoSave() {
    if (!this.currentNote) return;

    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Set new timeout
    this.autoSaveTimeout = setTimeout(async () => {
      const title = document.getElementById('note-title').value.trim();
      const content = document.getElementById('note-content').value.trim();

      if (title || content) {
        await this.updateNote(this.currentNote.id, {
          title: title || 'Untitled Note',
          content: content
        });

        // Update UI
        document.getElementById('note-modified').textContent = UIManager.formatDate(new Date(), 'relative');

        // Refresh notes list
        if (window.app) {
          window.app.loadItems();
        }

        // Show subtle auto-save indicator
        const autoSaveIndicator = document.createElement('div');
        autoSaveIndicator.className = 'fixed top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm opacity-75 z-50';
        autoSaveIndicator.textContent = 'Auto-saved';
        document.body.appendChild(autoSaveIndicator);

        setTimeout(() => {
          if (autoSaveIndicator.parentNode) {
            autoSaveIndicator.remove();
          }
        }, 2000);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity
  }

  static importNote(noteData) {
    try {
      // Validate note data
      if (!noteData.id || !noteData.title) {
        throw new Error('Invalid note data');
      }

      // Check if note already exists
      const existingNote = this.getNoteById(noteData.id);
      if (existingNote) {
        // Update if imported note is newer
        if (new Date(noteData.modified) > new Date(existingNote.modified)) {
          this.updateNote(noteData.id, noteData);
          return 'updated';
        }
        return 'skipped';
      }

      // Add new note
      this.notes.push(noteData);
      this.saveNotes();

      return 'added';
    } catch (error) {
      console.error('Failed to import note:', error);
      return 'error';
    }
  }

  static exportNote(id) {
    const note = this.getNoteById(id);
    if (!note) return null;

    const blob = new Blob([JSON.stringify(note, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note-${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return note;
  }

  static addTag(noteId, tag) {
    const note = this.getNoteById(noteId);
    if (!note) return false;

    const tagName = tag.trim().toLowerCase();
    if (!tagName || note.tags.includes(tagName)) return false;

    note.tags.push(tagName);
    this.updateNote(noteId, { tags: note.tags });

    return true;
  }

  static removeTag(noteId, tag) {
    const note = this.getNoteById(noteId);
    if (!note) return false;

    const tagIndex = note.tags.indexOf(tag);
    if (tagIndex === -1) return false;

    note.tags.splice(tagIndex, 1);
    this.updateNote(noteId, { tags: note.tags });

    return true;
  }

  static getAllTags() {
    const tags = new Set();
    this.notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  static getNotesByTag(tag) {
    return this.notes.filter(note => note.tags.includes(tag));
  }

  static getNotesStats() {
    const stats = {
      total: this.notes.length,
      totalWords: 0,
      totalCharacters: 0,
      averageLength: 0,
      tagsCount: this.getAllTags().length,
      oldestNote: null,
      newestNote: null
    };

    if (this.notes.length === 0) return stats;

    let oldestDate = new Date();
    let newestDate = new Date(0);

    this.notes.forEach(note => {
      const content = note.content || '';
      const words = content.split(/\s+/).filter(word => word.length > 0).length;

      stats.totalWords += words;
      stats.totalCharacters += content.length;

      const noteDate = new Date(note.created);
      if (noteDate < oldestDate) {
        oldestDate = noteDate;
        stats.oldestNote = note;
      }
      if (noteDate > newestDate) {
        newestDate = noteDate;
        stats.newestNote = note;
      }
    });

    stats.averageLength = Math.round(stats.totalCharacters / this.notes.length);

    return stats;
  }

  static duplicateNote(id) {
    const note = this.getNoteById(id);
    if (!note) return null;

    const duplicatedNote = this.createNote(
      `${note.title} (Copy)`,
      note.content
    );

    // Copy tags
    duplicatedNote.tags = [...note.tags];
    this.updateNote(duplicatedNote.id, { tags: duplicatedNote.tags });

    return duplicatedNote;
  }

  static archiveNote(id) {
    const note = this.getNoteById(id);
    if (!note) return false;

    note.archived = true;
    this.updateNote(id, { archived: true });

    return true;
  }

  static unarchiveNote(id) {
    const note = this.getNoteById(id);
    if (!note) return false;

    note.archived = false;
    this.updateNote(id, { archived: false });

    return true;
  }

  static getArchivedNotes() {
    return this.notes.filter(note => note.archived);
  }

  static getActiveNotes() {
    return this.notes.filter(note => !note.archived);
  }
}
```

```
The code updates the `updateNote` function within the `NotesManager` class to utilize `SyncManager.saveNote` for persistence, integrating GUN.js functionality.
```

```replit_final_file
// Notes management system
class NotesManager {
  static notes = [];
  static currentNote = null;

  static init() {
    this.loadNotes();
    this.setupEventListeners();
  }

  static setupEventListeners() {
    // Note editor events
    document.getElementById('save-note-btn').addEventListener('click', () => this.saveCurrentNote());
    document.getElementById('delete-note-btn').addEventListener('click', () => this.deleteCurrentNote());

    // Auto-save on content change
    document.getElementById('note-title').addEventListener('input', () => this.autoSave());
    document.getElementById('note-content').addEventListener('input', () => this.autoSave());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            this.saveCurrentNote();
            break;
          case 'd':
            e.preventDefault();
            this.deleteCurrentNote();
            break;
        }
      }
    });
  }

  static loadNotes() {
    try {
      const savedNotes = StorageManager.loadEncrypted('notes');
      this.notes = savedNotes || [];
    } catch (error) {
      console.error('Failed to load notes:', error);
      this.notes = [];
    }
  }

  static saveNotes() {
    try {
      StorageManager.saveEncrypted('notes', this.notes);
      return true;
    } catch (error) {
      console.error('Failed to save notes:', error);
      return false;
    }
  }

  static createNote(title = '', content = '') {
    const note = {
      id: CryptoManager.generateId(),
      title: title || 'Untitled Note',
      content: content,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: [],
      encrypted: true
    };

    this.notes.unshift(note);
    this.saveNotes();

    // Sync with peers
    SyncManager.syncNote(note);

    return note;
  }

  static async updateNote(id, updates) {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return null;

    const note = this.notes[noteIndex];
    Object.assign(note, updates);
    note.modified = new Date().toISOString();

    const success = await SyncManager.saveNote(note);
    if (!success) return null;

    this.saveNotes();
    // Sync with peers
    SyncManager.syncNote(note);

    return note;
  }

  static deleteNote(id) {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return false;

    const note = this.notes[noteIndex];
    this.notes.splice(noteIndex, 1);
    this.saveNotes();

    // Sync deletion with peers
    SyncManager.deleteNote(id);

    return true;
  }

  static getNoteById(id) {
    return this.notes.find(note => note.id === id);
  }

  static getAllNotes() {
    return [...this.notes].sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  static searchNotes(query) {
    if (!query.trim()) return this.getAllNotes();

    const lowercaseQuery = query.toLowerCase();
    return this.notes.filter(note => 
      note.title.toLowerCase().includes(lowercaseQuery) ||
      note.content.toLowerCase().includes(lowercaseQuery) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    ).sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  static showNoteEditor(note) {
    this.currentNote = note;

    // Hide welcome content
    document.getElementById('welcome-content').classList.add('hidden');
    document.getElementById('todo-editor').classList.add('hidden');

    // Show note editor
    document.getElementById('note-editor').classList.remove('hidden');

    // Populate editor
    document.getElementById('note-title').value = note.title || '';
    document.getElementById('note-content').value = note.content || '';
    document.getElementById('note-modified').textContent = UIManager.formatDate(note.modified, 'relative');

    // Focus on title if empty, otherwise content
    if (!note.title) {
      document.getElementById('note-title').focus();
    } else {
      document.getElementById('note-content').focus();
    }
  }

  static async saveCurrentNote() {
    if (!this.currentNote) return;

    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();

    if (!title && !content) {
      UIManager.showNotification(LanguageManager.get('note_empty'), 'warning');
      return;
    }

    await this.updateNote(this.currentNote.id, {
      title: title || 'Untitled Note',
      content: content
    });

    // Update UI
    document.getElementById('note-modified').textContent = UIManager.formatDate(new Date(), 'relative');

    // Refresh notes list
    if (window.app) {
      window.app.loadItems();
    }

    UIManager.showNotification(LanguageManager.get('note_saved'), 'success');
  }

  static deleteCurrentNote() {
    if (!this.currentNote) return;

    UIManager.showConfirmDialog(
      LanguageManager.get('delete_note'),
      LanguageManager.get('delete_note_confirm'),
      () => {
        this.deleteNote(this.currentNote.id);
        this.currentNote = null;

        // Hide editor and show welcome
        document.getElementById('note-editor').classList.add('hidden');
        document.getElementById('welcome-content').classList.remove('hidden');

        // Refresh notes list
        if (window.app) {
          window.app.loadItems();
        }

        UIManager.showNotification(LanguageManager.get('note_deleted'), 'success');
      }
    );
  }

  static autoSave() {
    if (!this.currentNote) return;

    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Set new timeout
    this.autoSaveTimeout = setTimeout(async () => {
      const title = document.getElementById('note-title').value.trim();
      const content = document.getElementById('note-content').value.trim();

      if (title || content) {
        await this.updateNote(this.currentNote.id, {
          title: title || 'Untitled Note',
          content: content
        });

        // Update UI
        document.getElementById('note-modified').textContent = UIManager.formatDate(new Date(), 'relative');

        // Refresh notes list
        if (window.app) {
          window.app.loadItems();
        }

        // Show subtle auto-save indicator
        const autoSaveIndicator = document.createElement('div');
        autoSaveIndicator.className = 'fixed top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm opacity-75 z-50';
        autoSaveIndicator.textContent = 'Auto-saved';
        document.body.appendChild(autoSaveIndicator);

        setTimeout(() => {
          if (autoSaveIndicator.parentNode) {
            autoSaveIndicator.remove();
          }
        }, 2000);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity
  }

  static importNote(noteData) {
    try {
      // Validate note data
      if (!noteData.id || !noteData.title) {
        throw new Error('Invalid note data');
      }

      // Check if note already exists
      const existingNote = this.getNoteById(noteData.id);
      if (existingNote) {
        // Update if imported note is newer
        if (new Date(noteData.modified) > new Date(existingNote.modified)) {
          this.updateNote(noteData.id, noteData);
          return 'updated';
        }
        return 'skipped';
      }

      // Add new note
      this.notes.push(noteData);
      this.saveNotes();

      return 'added';
    } catch (error) {
      console.error('Failed to import note:', error);
      return 'error';
    }
  }

  static exportNote(id) {
    const note = this.getNoteById(id);
    if (!note) return null;

    const blob = new Blob([JSON.stringify(note, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note-${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return note;
  }

  static addTag(noteId, tag) {
    const note = this.getNoteById(noteId);
    if (!note) return false;

    const tagName = tag.trim().toLowerCase();
    if (!tagName || note.tags.includes(tagName)) return false;

    note.tags.push(tagName);
    this.updateNote(noteId, { tags: note.tags });

    return true;
  }

  static removeTag(noteId, tag) {
    const note = this.getNoteById(noteId);
    if (!note) return false;

    const tagIndex = note.tags.indexOf(tag);
    if (tagIndex === -1) return false;

    note.tags.splice(tagIndex, 1);
    this.updateNote(noteId, { tags: note.tags });

    return true;
  }

  static getAllTags() {
    const tags = new Set();
    this.notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  static getNotesByTag(tag) {
    return this.notes.filter(note => note.tags.includes(tag));
  }

  static getNotesStats() {
    const stats = {
      total: this.notes.length,
      totalWords: 0,
      totalCharacters: 0,
      averageLength: 0,
      tagsCount: this.getAllTags().length,
      oldestNote: null,
      newestNote: null
    };

    if (this.notes.length === 0) return stats;

    let oldestDate = new Date();
    let newestDate = new Date(0);

    this.notes.forEach(note => {
      const content = note.content || '';
      const words = content.split(/\s+/).filter(word => word.length > 0).length;

      stats.totalWords += words;
      stats.totalCharacters += content.length;

      const noteDate = new Date(note.created);
      if (noteDate < oldestDate) {
        oldestDate = noteDate;
        stats.oldestNote = note;
      }
      if (noteDate > newestDate) {
        newestDate = noteDate;
        stats.newestNote = note;
      }
    });

    stats.averageLength = Math.round(stats.totalCharacters / this.notes.length);

    return stats;
  }

  static duplicateNote(id) {
    const note = this.getNoteById(id);
    if (!note) return null;

    const duplicatedNote = this.createNote(
      `${note.title} (Copy)`,
      note.content
    );

    // Copy tags
    duplicatedNote.tags = [...note.tags];
    this.updateNote(duplicatedNote.id, { tags: duplicatedNote.tags });

    return duplicatedNote;
  }

  static archiveNote(id) {
    const note = this.getNoteById(id);
    if (!note) return false;

    note.archived = true;
    this.updateNote(id, { archived: true });

    return true;
  }

  static unarchiveNote(id) {
    const note = this.getNoteById(id);
    if (!note) return false;

    note.archived = false;
    this.updateNote(id, { archived: false });

    return true;
  }

  static getArchivedNotes() {
    return this.notes.filter(note => note.archived);
  }

  static getActiveNotes() {
    return this.notes.filter(note => !note.archived);
  }
}
```static async saveNote(note) {
    const success = await SyncManager.saveNote(note);
    if (success) {
      UIManager.showNotification(LanguageManager.get('note_saved'), 'success');
    } else {
      UIManager.showNotification(LanguageManager.get('save_error'), 'error');
    }
    return success;
  }
}
```

```
This code updates the `saveNote` function within the `NotesManager` class to utilize `SyncManager.saveNote` for persistence, integrating GUN.js functionality.
```

```replit_final_file
// Notes management system
class NotesManager {
  static notes = [];
  static currentNote = null;

  static init() {
    this.loadNotes();
    this.setupEventListeners();
  }

  static setupEventListeners() {
    // Note editor events
    document.getElementById('save-note-btn').addEventListener('click', () => this.saveCurrentNote());
    document.getElementById('delete-note-btn').addEventListener('click', () => this.deleteCurrentNote());

    // Auto-save on content change
    document.getElementById('note-title').addEventListener('input', () => this.autoSave());
    document.getElementById('note-content').addEventListener('input', () => this.autoSave());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            this.saveCurrentNote();
            break;
          case 'd':
            e.preventDefault();
            this.deleteCurrentNote();
            break;
        }
      }
    });
  }

  static loadNotes() {
    try {
      const savedNotes = StorageManager.loadEncrypted('notes');
      this.notes = savedNotes || [];
    } catch (error) {
      console.error('Failed to load notes:', error);
      this.notes = [];
    }
  }

  static saveNotes() {
    try {
      StorageManager.saveEncrypted('notes', this.notes);
      return true;
    } catch (error) {
      console.error('Failed to save notes:', error);
      return false;
    }
  }

  static createNote(title = '', content = '') {
    const note = {
      id: CryptoManager.generateId(),
      title: title || 'Untitled Note',
      content: content,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: [],
      encrypted: true
    };

    this.notes.unshift(note);
    this.saveNotes();

    // Sync with peers
    SyncManager.syncNote(note);

    return note;
  }

  static async updateNote(id, updates) {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return null;

    const note = this.notes[noteIndex];
    Object.assign(note, updates);
    note.modified = new Date().toISOString();

    const success = await SyncManager.saveNote(note);
    if (!success) return null;

    this.saveNotes();
    // Sync with peers
    SyncManager.syncNote(note);

    return note;
  }

  static deleteNote(id) {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return false;

    const note = this.notes[noteIndex];
    this.notes.splice(noteIndex, 1);
    this.saveNotes();

    // Sync deletion with peers
    SyncManager.deleteNote(id);

    return true;
  }

  static getNoteById(id) {
    return this.notes.find(note => note.id === id);
  }

  static getAllNotes() {
    return [...this.notes].sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  static searchNotes(query) {
    if (!query.trim()) return this.getAllNotes();

    const lowercaseQuery = query.toLowerCase();
    return this.notes.filter(note => 
      note.title.toLowerCase().includes(lowercaseQuery) ||
      note.content.toLowerCase().includes(lowercaseQuery) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    ).sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  static showNoteEditor(note) {
    this.currentNote = note;

    // Hide welcome content
    document.getElementById('welcome-content').classList.add('hidden');
    document.getElementById('todo-editor').classList.add('hidden');

    // Show note editor
    document.getElementById('note-editor').classList.remove('hidden');

    // Populate editor
    document.getElementById('note-title').value = note.title || '';
    document.getElementById('note-content').value = note.content || '';
    document.getElementById('note-modified').textContent = UIManager.formatDate(note.modified, 'relative');

    // Focus on title if empty, otherwise content
    if (!note.title) {
      document.getElementById('note-title').focus();
    } else {
      document.getElementById('note-content').focus();
    }
  }

  static async saveCurrentNote() {
    if (!this.currentNote) return;

    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();

    if (!title && !content) {
      UIManager.showNotification(LanguageManager.get('note_empty'), 'warning');
      return;
    }

    await this.updateNote(this.currentNote.id, {
      title: title || 'Untitled Note',
      content: content
    });

    // Update UI
    document.getElementById('note-modified').textContent = UIManager.formatDate(new Date(), 'relative');

    // Refresh notes list
    if (window.app) {
      window.app.loadItems();
    }

    UIManager.showNotification(LanguageManager.get('note_saved'), 'success');
  }

  static deleteCurrentNote() {
    if (!this.currentNote) return;

    UIManager.showConfirmDialog(
      LanguageManager.get('delete_note'),
      LanguageManager.get('delete_note_confirm'),
      () => {
        this.deleteNote(this.currentNote.id);
        this.currentNote = null;

        // Hide editor and show welcome
        document.getElementById('note-editor').classList.add('hidden');
        document.getElementById('welcome-content').classList.remove('hidden');

        // Refresh notes list
        if (window.app) {
          window.app.loadItems();
        }

        UIManager.showNotification(LanguageManager.get('note_deleted'), 'success');
      }
    );
  }

  static autoSave() {
    if (!this.currentNote) return;

    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Set new timeout
    this.autoSaveTimeout = setTimeout(async () => {
      const title = document.getElementById('note-title').value.trim();
      const content = document.getElementById('note-content').value.trim();

      if (title || content) {
        await this.updateNote(this.currentNote.id, {
          title: title || 'Untitled Note',
          content: content
        });

        // Update UI
        document.getElementById('note-modified').textContent = UIManager.formatDate(new Date(), 'relative');

        // Refresh notes list
        if (window.app) {
          window.app.loadItems();
        }

        // Show subtle auto-save indicator
        const autoSaveIndicator = document.createElement('div');
        autoSaveIndicator.className = 'fixed top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm opacity-75 z-50';
        autoSaveIndicator.textContent = 'Auto-saved';
        document.body.appendChild(autoSaveIndicator);

        setTimeout(() => {
          if (autoSaveIndicator.parentNode) {
            autoSaveIndicator.remove();
          }
        }, 2000);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity
  }

  static importNote(noteData) {
    try {
      // Validate note data
      if (!noteData.id || !noteData.title) {
        throw new Error('Invalid note data');
      }

      // Check if note already exists
      const existingNote = this.getNoteById(noteData.id);
      if (existingNote) {
        // Update if imported note is newer
        if (new Date(noteData.modified) > new Date(existingNote.modified)) {
          this.updateNote(noteData.id, noteData);
          return 'updated';
        }
        return 'skipped';
      }

      // Add new note
      this.notes.push(noteData);
      this.saveNotes();

      return 'added';
    } catch (error) {
      console.error('Failed to import note:', error);
      return 'error';
    }
  }

  static exportNote(id) {
    const note = this.getNoteById(id);
    if (!note) return null;

    const blob = new Blob([JSON.stringify(note, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note-${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return note;
  }

  static addTag(noteId, tag) {
    const note = this.getNoteById(noteId);
    if (!note) return false;

    const tagName = tag.trim().toLowerCase();
    if (!tagName || note.tags.includes(tagName)) return false;

    note.tags.push(tagName);
    this.updateNote(noteId, { tags: note.tags });

    return true;
  }

  static removeTag(noteId, tag) {
    const note = this.getNoteById(noteId);
    if (!note) return false;

    const tagIndex = note.tags.indexOf(tag);
    if (tagIndex === -1) return false;

    note.tags.splice(tagIndex, 1);
    this.updateNote(noteId, { tags: note.tags });

    return true;
  }

  static getAllTags() {
    const tags = new Set();
    this.notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  static getNotesByTag(tag) {
    return this.notes.filter(note => note.tags.includes(tag));
  }

  static getNotesStats() {
    const stats = {
      total: this.notes.length,
      totalWords: 0,
      totalCharacters: 0,
      averageLength: 0,
      tagsCount: this.getAllTags().length,
      oldestNote: null,
      newestNote: null
    };

    if (this.notes.length === 0) return stats;

    let oldestDate = new Date();
    let newestDate = new Date(0);

    this.notes.forEach(note => {
      const content = note.content || '';
      const words = content.split(/\s+/).filter(word => word.length > 0).length;

      stats.totalWords += words;
      stats.totalCharacters += content.length;

      const noteDate = new Date(note.created);
      if (noteDate < oldestDate) {
        oldestDate = noteDate;
        stats.oldestNote = note;
      }
      if (noteDate > newestDate) {
        newestDate = noteDate;
        stats.newestNote = note;
      }
    });

    stats.averageLength = Math.round(stats.totalCharacters / this.notes.length);

    return stats;
  }

  static duplicateNote(id) {
    const note = this.getNoteById(id);
    if (!note) return null;

    const duplicatedNote = this.createNote(
      `${note.title} (Copy)`,
      note.content
    );

    // Copy tags
    duplicatedNote.tags = [...note.tags];
    this.updateNote(duplicatedNote.id, { tags: duplicatedNote.tags });

    return duplicatedNote;
  }

  static archiveNote(id) {
    const note = this.getNoteById(id);
    if (!note) return false;

    note.archived = true;
    this.updateNote(id, { archived: true });

    return true;
  }

  static unarchiveNote(id) {
    const note = this.getNoteById(id);
    if (!note) return false;

    note.archived = false;
    this.updateNote(id, { archived: false });

    return true;
  }

  static getArchivedNotes() {
    return this.notes.filter(note => note.archived);
  }

  static getActiveNotes() {
    return this.notes.filter(note => !note.archived);
  }
   static async saveNote(note) {
    const success = await SyncManager.saveNote(note);
    if (success) {
      UIManager.showNotification(LanguageManager.get('note_saved'), 'success');
    } else {
      UIManager.showNotification(LanguageManager.get('save_error'), 'error');
    }
    return success;
  }
}