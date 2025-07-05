// Main application controller
class DecentralizedNotepadApp {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.currentItem = null;
    this.currentMode = 'notes'; // 'notes' or 'todos'
    this.inactivityTimer = null;
    this.inactivityTimeout = 5 * 60 * 1000; // 5 minutes
    
    this.initializeApp();
  }

  async initializeApp() {
    try {
      // Initialize PWA
      PWAManager.init();
      
      // Initialize language
      await LanguageManager.init();
      
      // Initialize UI
      UIManager.init();
      
      // Initialize sync
      await SyncManager.init();
      
      // Check if user is already authenticated
      if (StorageManager.hasUserData()) {
        this.showAuthScreen();
      } else {
        this.showSetupScreen();
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Hide loading screen
      this.hideLoadingScreen();
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      UIManager.showNotification('Failed to initialize app', 'error');
    }
  }

  setupEventListeners() {
    // Authentication
    document.getElementById('unlock-btn').addEventListener('click', () => this.handleUnlock());
    document.getElementById('setup-new-btn').addEventListener('click', () => this.showSetupForm());
    document.getElementById('create-account-btn').addEventListener('click', () => this.handleCreateAccount());
    document.getElementById('back-to-login-btn').addEventListener('click', () => this.showLoginForm());
    document.getElementById('wallet-connect-btn').addEventListener('click', () => this.handleWalletConnect());
    
    // Recovery phrase
    document.getElementById('recovery-phrase-btn').addEventListener('click', () => this.showRecoveryImportForm());
    document.getElementById('back-to-setup-btn').addEventListener('click', () => this.showSetupForm());
    document.getElementById('back-to-setup-2-btn').addEventListener('click', () => this.showSetupForm());
    document.getElementById('confirm-phrase-btn').addEventListener('click', () => this.handleConfirmPhrase());
    document.getElementById('recover-account-btn').addEventListener('click', () => this.handleRecoverAccount());
    document.getElementById('phrase-saved-checkbox').addEventListener('change', (e) => this.handlePhraseSavedChange(e));
    document.getElementById('backup-phrase-btn').addEventListener('click', () => this.showBackupPhrase());
    
    // Main navigation
    document.getElementById('notes-tab').addEventListener('click', () => this.switchMode('notes'));
    document.getElementById('todos-tab').addEventListener('click', () => this.switchMode('todos'));
    
    // Actions
    document.getElementById('add-btn').addEventListener('click', () => this.addNewItem());
    document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));
    document.getElementById('create-first-note').addEventListener('click', () => this.createFirstNote());
    
    // Settings
    document.getElementById('export-btn').addEventListener('click', () => this.exportData());
    document.getElementById('import-btn').addEventListener('click', () => this.importData());
    document.getElementById('about-btn').addEventListener('click', () => this.showAbout());
    
    // UI controls
    document.getElementById('theme-toggle').addEventListener('click', () => UIManager.toggleTheme());
    document.getElementById('language-toggle').addEventListener('click', () => LanguageManager.toggleLanguage());
    document.getElementById('lock-btn').addEventListener('click', () => this.lockApp());
    document.getElementById('sidebar-toggle').addEventListener('click', () => UIManager.toggleSidebar());
    document.getElementById('sidebar-overlay').addEventListener('click', () => UIManager.closeSidebar());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    
    // Inactivity detection
    this.setupInactivityDetection();
    
    // Passphrase inputs
    document.getElementById('passphrase-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleUnlock();
    });
    
    document.getElementById('new-passphrase-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') document.getElementById('confirm-passphrase-input').focus();
    });
    
    document.getElementById('confirm-passphrase-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleCreateAccount();
    });
    
    // Generate passphrase button
    document.getElementById('generate-passphrase-btn').addEventListener('click', () => this.generatePassphrase());
    
    // About modal
    document.getElementById('about-btn').addEventListener('click', () => this.showAbout());
    document.getElementById('close-about-btn').addEventListener('click', () => this.closeAbout());
    
    // Docs modal  
    document.getElementById('docs-btn').addEventListener('click', () => this.showDocs());
    document.getElementById('close-docs-btn').addEventListener('click', () => this.closeDocs());
  }

  setupInactivityDetection() {
    const resetTimer = () => {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }
      
      if (this.isAuthenticated) {
        this.inactivityTimer = setTimeout(() => {
          this.lockApp();
        }, this.inactivityTimeout);
      }
    };

    // Reset timer on user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });
  }

  hideLoadingScreen() {
    document.getElementById('loading-screen').classList.add('hidden');
  }

  showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('passphrase-input').focus();
  }

  showSetupScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    this.showSetupForm();
  }

  showLoginForm() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('setup-form').classList.add('hidden');
    document.getElementById('passphrase-input').focus();
  }

  showSetupForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('setup-form').classList.remove('hidden');
    document.getElementById('new-passphrase-input').focus();
  }

  async handleUnlock() {
    const passphrase = document.getElementById('passphrase-input').value;
    
    if (!passphrase) {
      UIManager.showNotification(LanguageManager.get('enter_passphrase'), 'warning');
      return;
    }

    try {
      // Verify passphrase
      const isValid = await CryptoManager.verifyPassphrase(passphrase);
      
      if (isValid) {
        CryptoManager.setPassphrase(passphrase);
        this.isAuthenticated = true;
        this.showMainApp();
        UIManager.showNotification(LanguageManager.get('welcome_back'), 'success');
      } else {
        UIManager.showNotification(LanguageManager.get('invalid_passphrase'), 'error');
      }
    } catch (error) {
      console.error('Unlock error:', error);
      UIManager.showNotification(LanguageManager.get('unlock_error'), 'error');
    }
    
    // Clear passphrase input
    document.getElementById('passphrase-input').value = '';
  }

  async handleCreateAccount() {
    const passphrase = document.getElementById('new-passphrase-input').value;
    const confirmPassphrase = document.getElementById('confirm-passphrase-input').value;
    
    if (!passphrase || !confirmPassphrase) {
      UIManager.showNotification(LanguageManager.get('fill_all_fields'), 'warning');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      UIManager.showNotification(LanguageManager.get('passphrase_mismatch'), 'error');
      return;
    }

    if (passphrase.length < 8) {
      UIManager.showNotification(LanguageManager.get('passphrase_too_short'), 'error');
      return;
    }

    try {
      const result = await CryptoManager.createUser(passphrase);
      if (result.success) {
        this.currentRecoveryPhrase = result.recoveryPhrase;
        this.showRecoverySetupForm();
      } else {
        UIManager.showNotification(LanguageManager.get('create_account_error'), 'error');
      }
    } catch (error) {
      console.error('Create account error:', error);
      UIManager.showNotification(LanguageManager.get('create_account_error'), 'error');
    }
    
    // Clear inputs
    document.getElementById('new-passphrase-input').value = '';
    document.getElementById('confirm-passphrase-input').value = '';
  }

  showRecoverySetupForm() {
    this.hideAllForms();
    document.getElementById('recovery-setup-form').classList.remove('hidden');
    
    // Display recovery phrase
    const phraseDisplay = document.getElementById('recovery-phrase-display');
    const words = this.currentRecoveryPhrase.split(' ');
    phraseDisplay.innerHTML = '';
    
    words.forEach((word, index) => {
      const wordElement = document.createElement('div');
      wordElement.className = 'phrase-card-inner text-center text-sm floating';
      wordElement.innerHTML = `<span class="text-xs text-gray-500 dark:text-gray-400">${index + 1}</span><br><strong>${word}</strong>`;
      phraseDisplay.appendChild(wordElement);
    });
    
    // Add copy and download buttons
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'flex gap-2 mt-4';
    buttonsDiv.innerHTML = `
      <button id="copy-phrase-btn" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm">
        <i class="fas fa-copy mr-2"></i>
        ${LanguageManager.get('copy_phrase')}
      </button>
      <button id="download-phrase-btn" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg text-sm">
        <i class="fas fa-download mr-2"></i>
        ${LanguageManager.get('download_phrase')}
      </button>
    `;
    
    // Insert buttons after the phrase display
    const phraseContainer = document.getElementById('recovery-phrase-display').parentNode;
    phraseContainer.insertBefore(buttonsDiv, document.getElementById('recovery-phrase-display').nextSibling);
    
    // Add event listeners for copy and download
    document.getElementById('copy-phrase-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(this.currentRecoveryPhrase);
      UIManager.showNotification(LanguageManager.get('recovery_phrase_copied'), 'success');
    });
    
    document.getElementById('download-phrase-btn').addEventListener('click', () => {
      const blob = new Blob([this.currentRecoveryPhrase], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recovery-phrase.txt';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  showRecoveryImportForm() {
    this.hideAllForms();
    document.getElementById('recovery-import-form').classList.remove('hidden');
  }

  handlePhraseSavedChange(e) {
    const confirmBtn = document.getElementById('confirm-phrase-btn');
    if (e.target.checked) {
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      confirmBtn.disabled = true;
      confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }

  async handleConfirmPhrase() {
    try {
      CryptoManager.setPassphrase(document.getElementById('new-passphrase-input').value);
      this.isAuthenticated = true;
      UIManager.showNotification(LanguageManager.get('account_created'), 'success');
      this.showMainApp();
    } catch (error) {
      console.error('Confirm phrase error:', error);
      UIManager.showNotification(LanguageManager.get('create_account_error'), 'error');
    }
  }

  async handleRecoverAccount() {
    const recoveryPhrase = document.getElementById('recovery-phrase-input').value.trim();
    const newPassphrase = document.getElementById('recovery-new-passphrase').value;
    const confirmPassphrase = document.getElementById('recovery-confirm-passphrase').value;
    
    if (!recoveryPhrase || !newPassphrase || !confirmPassphrase) {
      UIManager.showNotification(LanguageManager.get('fill_all_fields'), 'error');
      return;
    }
    
    if (newPassphrase !== confirmPassphrase) {
      UIManager.showNotification(LanguageManager.get('phrase_mismatch'), 'error');
      return;
    }
    
    if (newPassphrase.length < 8) {
      UIManager.showNotification(LanguageManager.get('passphrase_too_short'), 'error');
      return;
    }
    
    try {
      const result = await CryptoManager.recoverFromPhrase(recoveryPhrase, newPassphrase);
      if (result.success) {
        UIManager.showNotification(LanguageManager.get('account_recovered'), 'success');
        CryptoManager.setPassphrase(newPassphrase);
        this.isAuthenticated = true;
        this.showMainApp();
      } else {
        UIManager.showNotification(result.error || LanguageManager.get('phrase_invalid'), 'error');
      }
    } catch (error) {
      console.error('Recovery error:', error);
      UIManager.showNotification(LanguageManager.get('phrase_invalid'), 'error');
    }
  }

  generatePassphrase() {
    const generatedPassphrase = CryptoManager.generatePassphrase();
    const passphraseInput = document.getElementById('new-passphrase-input');
    const confirmInput = document.getElementById('confirm-passphrase-input');
    
    passphraseInput.type = 'text';
    passphraseInput.value = generatedPassphrase;
    confirmInput.value = generatedPassphrase;
    
    UIManager.showNotification(LanguageManager.get('passphrase_generated'), 'success');
    
    // Hide passphrase after 5 seconds
    setTimeout(() => {
      passphraseInput.type = 'password';
    }, 5000);
  }

  async handleWalletConnect() {
    try {
      const result = await CryptoManager.connectWallet();
      if (result.success) {
        UIManager.showNotification(LanguageManager.get('wallet_connected') + `: ${result.address.slice(0, 6)}...${result.address.slice(-4)}`, 'success');
        
        // Sign a message for authentication
        const message = `Authenticate with Decentralized Notepad - ${result.address}`;
        const signResult = await CryptoManager.signMessage(message);
        
        if (signResult.success) {
          // Use wallet address as passphrase for simplicity
          const walletPassphrase = result.address;
          
          // Store wallet address for future reference
          localStorage.setItem('dnp_wallet_address', result.address);
          
          // Check if wallet account exists
          const walletAccountKey = `dnp_wallet_${result.address}`;
          const existingAccount = localStorage.getItem(walletAccountKey);
          
          if (existingAccount) {
            // Load existing wallet account
            const accountData = JSON.parse(existingAccount);
            CryptoManager.setPassphrase(walletPassphrase);
            CryptoManager.salt = accountData.salt;
            CryptoManager.userKeyHash = accountData.keyHash;
            this.isAuthenticated = true;
            this.showMainApp();
          } else {
            // Create new wallet account
            const createResult = await CryptoManager.createUser(walletPassphrase);
            if (createResult.success) {
              // Store wallet-specific account data
              const accountData = {
                salt: CryptoManager.salt,
                keyHash: CryptoManager.userKeyHash,
                createdAt: new Date().toISOString(),
                address: result.address
              };
              localStorage.setItem(walletAccountKey, JSON.stringify(accountData));
              
              this.isAuthenticated = true;
              this.showMainApp();
              UIManager.showNotification(LanguageManager.get('wallet_account_created'), 'success');
            }
          }
        }
      } else {
        UIManager.showNotification(result.error || LanguageManager.get('wallet_error'), 'error');
      }
    } catch (error) {
      console.error('Wallet connect error:', error);
      UIManager.showNotification(LanguageManager.get('wallet_error'), 'error');
    }
  }

  async showBackupPhrase() {
    try {
      const result = await CryptoManager.backupRecoveryPhrase();
      if (result.success) {
        const modal = UIManager.showModal(
          LanguageManager.get('recovery_phrase_backup'),
          `
            <div class="mb-4">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${LanguageManager.get('recovery_phrase_warning')}</p>
              <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
                <div class="grid grid-cols-3 gap-2" id="backup-phrase-display">
                  ${result.recoveryPhrase.split(' ').map((word, index) => 
                    `<div class="bg-white dark:bg-gray-600 p-2 rounded border text-center text-sm">
                      <span class="text-xs text-gray-500 dark:text-gray-400">${index + 1}</span><br>
                      <strong>${word}</strong>
                    </div>`
                  ).join('')}
                </div>
              </div>
            </div>
          `,
          [
            {
              text: LanguageManager.get('copy_phrase'),
              class: 'bg-blue-500 hover:bg-blue-600 text-white',
              action: () => {
                navigator.clipboard.writeText(result.recoveryPhrase);
                UIManager.showNotification(LanguageManager.get('recovery_phrase_copied'), 'success');
              }
            },
            {
              text: LanguageManager.get('download_phrase'),
              class: 'bg-green-500 hover:bg-green-600 text-white',
              action: () => {
                const blob = new Blob([result.recoveryPhrase], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'recovery-phrase.txt';
                a.click();
                URL.revokeObjectURL(url);
              }
            },
            {
              text: LanguageManager.get('cancel'),
              class: 'bg-gray-500 hover:bg-gray-600 text-white',
              action: () => UIManager.closeModal()
            }
          ]
        );
      } else {
        UIManager.showNotification(result.error || 'Failed to backup phrase', 'error');
      }
    } catch (error) {
      console.error('Backup phrase error:', error);
      UIManager.showNotification('Failed to backup phrase', 'error');
    }
  }

  hideAllForms() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('setup-form').classList.add('hidden');
    document.getElementById('recovery-setup-form').classList.add('hidden');
    document.getElementById('recovery-import-form').classList.add('hidden');
  }

  showMainApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    // Initialize content
    this.loadItems();
    this.showWelcomeContent();
    
    // Start sync
    SyncManager.startSync();
  }

  switchMode(mode) {
    this.currentMode = mode;
    
    // Update tab appearance
    document.getElementById('notes-tab').classList.toggle('bg-white', mode === 'notes');
    document.getElementById('notes-tab').classList.toggle('dark:bg-gray-600', mode === 'notes');
    document.getElementById('notes-tab').classList.toggle('text-gray-700', mode === 'notes');
    document.getElementById('notes-tab').classList.toggle('dark:text-white', mode === 'notes');
    document.getElementById('notes-tab').classList.toggle('shadow-sm', mode === 'notes');
    
    document.getElementById('todos-tab').classList.toggle('bg-white', mode === 'todos');
    document.getElementById('todos-tab').classList.toggle('dark:bg-gray-600', mode === 'todos');
    document.getElementById('todos-tab').classList.toggle('text-gray-700', mode === 'todos');
    document.getElementById('todos-tab').classList.toggle('dark:text-white', mode === 'todos');
    document.getElementById('todos-tab').classList.toggle('shadow-sm', mode === 'todos');
    
    // Load items for current mode
    this.loadItems();
    this.showWelcomeContent();
  }

  loadItems() {
    const items = this.currentMode === 'notes' ? NotesManager.getAllNotes() : TodosManager.getAllTodos();
    this.renderItemsList(items);
  }

  renderItemsList(items) {
    const container = document.getElementById('items-list');
    container.innerHTML = '';
    
    if (items.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <i class="fas fa-${this.currentMode === 'notes' ? 'sticky-note' : 'tasks'} text-4xl mb-4"></i>
          <p>${LanguageManager.get(this.currentMode === 'notes' ? 'no_notes' : 'no_todos')}</p>
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const element = this.createItemElement(item);
      container.appendChild(element);
    });
  }

  createItemElement(item) {
    const div = document.createElement('div');
    div.className = `${this.currentMode === 'notes' ? 'note-card' : 'todo-card'} bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm cursor-pointer`;
    div.dataset.id = item.id;
    
    if (this.currentMode === 'notes') {
      div.innerHTML = `
        <h3 class="font-semibold text-gray-800 dark:text-white truncate">${item.title || 'Untitled'}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">${item.content || ''}</p>
        <div class="flex justify-between items-center mt-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">${new Date(item.modified).toLocaleDateString()}</span>
        </div>
      `;
    } else {
      div.className += item.completed ? ' completed' : '';
      div.className += ` priority-${item.priority}`;
      
      div.innerHTML = `
        <div class="flex items-center">
          <input type="checkbox" ${item.completed ? 'checked' : ''} class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" onchange="app.toggleTodo('${item.id}')">
          <div class="flex-1">
            <h3 class="font-semibold text-gray-800 dark:text-white truncate ${item.completed ? 'line-through' : ''}">${item.title || 'Untitled'}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">${item.description || ''}</p>
            <div class="flex justify-between items-center mt-2">
              <span class="text-xs text-gray-500 dark:text-gray-400">${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : ''}</span>
              <span class="text-xs px-2 py-1 rounded priority-${item.priority} text-white">${LanguageManager.get(`priority_${item.priority}`)}</span>
            </div>
          </div>
        </div>
      `;
    }
    
    div.addEventListener('click', () => this.selectItem(item));
    
    return div;
  }

  selectItem(item) {
    this.currentItem = item;
    
    // Update UI
    document.querySelectorAll('.note-card, .todo-card').forEach(el => {
      el.classList.remove('active');
    });
    
    document.querySelector(`[data-id="${item.id}"]`).classList.add('active');
    
    // Show editor
    if (this.currentMode === 'notes') {
      NotesManager.showNoteEditor(item);
    } else {
      TodosManager.showTodoEditor(item);
    }
  }

  addNewItem() {
    const newItem = this.currentMode === 'notes' ? NotesManager.createNote() : TodosManager.createTodo();
    this.loadItems();
    this.selectItem(newItem);
  }

  createFirstNote() {
    this.switchMode('notes');
    this.addNewItem();
  }

  showWelcomeContent() {
    document.getElementById('welcome-content').classList.remove('hidden');
    document.getElementById('note-editor').classList.add('hidden');
    document.getElementById('todo-editor').classList.add('hidden');
  }

  handleSearch(query) {
    const items = this.currentMode === 'notes' ? NotesManager.searchNotes(query) : TodosManager.searchTodos(query);
    this.renderItemsList(items);
  }

  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + N - New item
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      this.addNewItem();
    }
    
    // Ctrl/Cmd + S - Save current item
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (this.currentItem) {
        if (this.currentMode === 'notes') {
          NotesManager.saveCurrentNote();
        } else {
          TodosManager.saveCurrentTodo();
        }
      }
    }
    
    // Ctrl/Cmd + F - Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    }
    
    // Ctrl/Cmd + L - Lock app
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      this.lockApp();
    }
  }

  toggleTodo(id) {
    TodosManager.toggleTodo(id);
    this.loadItems();
  }

  lockApp() {
    this.isAuthenticated = false;
    this.currentItem = null;
    CryptoManager.clearPassphrase();
    
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    
    // Clear sensitive data from UI
    document.getElementById('passphrase-input').value = '';
    
    UIManager.showNotification(LanguageManager.get('app_locked'), 'info');
  }

  exportData() {
    try {
      const data = {
        notes: NotesManager.getAllNotes(),
        todos: TodosManager.getAllTodos(),
        settings: {
          theme: UIManager.getCurrentTheme(),
          language: LanguageManager.getCurrentLanguage()
        },
        exported: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decentralized-notepad-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      UIManager.showNotification(LanguageManager.get('export_success'), 'success');
    } catch (error) {
      console.error('Export error:', error);
      UIManager.showNotification(LanguageManager.get('export_error'), 'error');
    }
  }

  importData() {
    document.getElementById('import-file-input').click();
    
    document.getElementById('import-file-input').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          if (data.notes) {
            data.notes.forEach(note => NotesManager.importNote(note));
          }
          
          if (data.todos) {
            data.todos.forEach(todo => TodosManager.importTodo(todo));
          }
          
          this.loadItems();
          UIManager.showNotification(LanguageManager.get('import_success'), 'success');
        } catch (error) {
          console.error('Import error:', error);
          UIManager.showNotification(LanguageManager.get('import_error'), 'error');
        }
      };
      
      reader.readAsText(file);
    };
  }

  showAbout() {
    const aboutText = `
      ${LanguageManager.get('app_title')} v1.0.0
      
      ${LanguageManager.get('about_description')}
      
      ${LanguageManager.get('features')}:
      • ${LanguageManager.get('client_side_encryption')}
      • ${LanguageManager.get('offline_capable')}
      • ${LanguageManager.get('decentralized_sync')}
      • ${LanguageManager.get('privacy_focused')}
      
      ${LanguageManager.get('keyboard_shortcuts')}:
      • Ctrl/Cmd + N: ${LanguageManager.get('new_item')}
      • Ctrl/Cmd + S: ${LanguageManager.get('save_item')}
      • Ctrl/Cmd + F: ${LanguageManager.get('focus_search')}
      • Ctrl/Cmd + L: ${LanguageManager.get('lock_app')}
    `;
    
    alert(aboutText);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new DecentralizedNotepadApp();
});
