// Progressive Web App functionality manager
class PWAManager {
  static isInstalled = false;
  static installPrompt = null;
  static isUpdateAvailable = false;

  static init() {
    // Register service worker
    this.registerServiceWorker();
    
    // Setup install prompt
    this.setupInstallPrompt();
    
    // Setup update handling
    this.setupUpdateHandling();
    
    // Check if app is already installed
    this.checkInstallStatus();
    
    // Setup visibility change handling
    this.setupVisibilityHandling();
  }

  static async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        
        console.log('Service Worker registered successfully:', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          this.handleServiceWorkerUpdate(registration);
        });
        
        // Handle controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service Worker controller changed');
          // Reload page to use new service worker
          if (this.isUpdateAvailable) {
            window.location.reload();
          }
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    } else {
      console.log('Service Worker not supported');
    }
  }

  static setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('Install prompt available');
      
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Store the event for later use
      this.installPrompt = e;
      
      // Show custom install button or banner
      this.showInstallOption();
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', (e) => {
      console.log('App installed successfully');
      this.isInstalled = true;
      this.hideInstallOption();
      
      // Show success notification
      UIManager.showNotification(
        LanguageManager.get('app_installed', 'App installed successfully!'),
        'success'
      );
    });
  }

  static setupUpdateHandling() {
    // Handle app update notifications
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isUpdateAvailable) {
        this.promptForUpdate();
      }
    });
  }

  static handleServiceWorkerUpdate(registration) {
    const newWorker = registration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New content is available
          console.log('New content available');
          this.isUpdateAvailable = true;
          this.showUpdateNotification();
        } else {
          // Content is cached for the first time
          console.log('Content cached for the first time');
          this.showOfflineNotification();
        }
      }
    });
  }

  static checkInstallStatus() {
    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('App is running in standalone mode');
    }

    // Check if app is installed on iOS
    if (window.navigator.standalone) {
      this.isInstalled = true;
      console.log('App is running in standalone mode on iOS');
    }
  }

  static setupVisibilityHandling() {
    // Handle app visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('App became visible');
        this.checkForUpdates();
      } else {
        console.log('App became hidden');
      }
    });
  }

  static showInstallOption() {
    if (this.isInstalled) return;

    // Create install banner
    const installBanner = document.createElement('div');
    installBanner.id = 'install-banner';
    installBanner.className = 'fixed top-0 left-0 right-0 bg-blue-500 text-white p-4 text-center z-50';
    installBanner.innerHTML = `
      <div class="flex items-center justify-between max-w-md mx-auto">
        <div class="flex items-center">
          <i class="fas fa-download mr-2"></i>
          <span>${LanguageManager.get('install_app', 'Install App')}</span>
        </div>
        <div class="flex space-x-2">
          <button id="install-btn" class="bg-white text-blue-500 px-3 py-1 rounded text-sm font-medium">
            ${LanguageManager.get('install', 'Install')}
          </button>
          <button id="dismiss-install" class="text-white hover:text-blue-200 px-2">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(installBanner);

    // Handle install button click
    document.getElementById('install-btn').addEventListener('click', () => {
      this.installApp();
    });

    // Handle dismiss button click
    document.getElementById('dismiss-install').addEventListener('click', () => {
      this.hideInstallOption();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideInstallOption();
    }, 10000);
  }

  static hideInstallOption() {
    const installBanner = document.getElementById('install-banner');
    if (installBanner) {
      installBanner.remove();
    }
  }

  static async installApp() {
    if (!this.installPrompt) {
      console.log('Install prompt not available');
      return;
    }

    try {
      // Show the install prompt
      this.installPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await this.installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Clear the install prompt
      this.installPrompt = null;
      this.hideInstallOption();
      
    } catch (error) {
      console.error('Install failed:', error);
    }
  }

  static showUpdateNotification() {
    // Show update notification
    const updateNotification = document.createElement('div');
    updateNotification.id = 'update-notification';
    updateNotification.className = 'fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg max-w-sm z-50';
    updateNotification.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-medium">${LanguageManager.get('update_available', 'Update Available')}</h4>
          <p class="text-sm opacity-90">${LanguageManager.get('update_description', 'A new version of the app is available.')}</p>
        </div>
        <button id="update-btn" class="bg-white text-green-500 px-3 py-1 rounded text-sm font-medium ml-4">
          ${LanguageManager.get('update', 'Update')}
        </button>
      </div>
    `;

    document.body.appendChild(updateNotification);

    // Handle update button click
    document.getElementById('update-btn').addEventListener('click', () => {
      this.updateApp();
    });

    // Auto-hide after 30 seconds
    setTimeout(() => {
      const notification = document.getElementById('update-notification');
      if (notification) {
        notification.remove();
      }
    }, 30000);
  }

  static showOfflineNotification() {
    UIManager.showNotification(
      LanguageManager.get('offline_ready', 'App is ready for offline use'),
      'info'
    );
  }

  static updateApp() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.waiting) {
          // Tell the waiting service worker to become active
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }

    // Remove update notification
    const updateNotification = document.getElementById('update-notification');
    if (updateNotification) {
      updateNotification.remove();
    }
  }

  static async checkForUpdates() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      } catch (error) {
        console.error('Update check failed:', error);
      }
    }
  }

  static promptForUpdate() {
    UIManager.showModal(
      LanguageManager.get('update_available', 'Update Available'),
      LanguageManager.get('update_prompt', 'A new version of the app is available. Would you like to update now?'),
      [
        {
          text: LanguageManager.get('later', 'Later'),
          className: 'bg-gray-300 hover:bg-gray-400 text-gray-800'
        },
        {
          text: LanguageManager.get('update_now', 'Update Now'),
          className: 'bg-blue-500 hover:bg-blue-600 text-white',
          action: () => this.updateApp()
        }
      ]
    );
  }

  static getInstallationStatus() {
    return {
      isInstalled: this.isInstalled,
      isInstallPromptAvailable: !!this.installPrompt,
      isUpdateAvailable: this.isUpdateAvailable,
      isServiceWorkerSupported: 'serviceWorker' in navigator,
      displayMode: this.getDisplayMode()
    };
  }

  static getDisplayMode() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone';
    } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return 'minimal-ui';
    } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen';
    } else {
      return 'browser';
    }
  }

  static async getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          usagePercentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
        };
      } catch (error) {
        console.error('Storage estimate failed:', error);
        return null;
      }
    }
    return null;
  }

  static async clearAppData() {
    try {
      // Clear cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear storage
      if ('storage' in navigator && 'clear' in navigator.storage) {
        await navigator.storage.clear();
      }

      // Clear local storage (except user preferences)
      const keysToKeep = ['dnp_theme', 'dnp_language'];
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      UIManager.showNotification(
        LanguageManager.get('app_data_cleared', 'App data cleared successfully'),
        'success'
      );

    } catch (error) {
      console.error('Clear app data failed:', error);
      UIManager.showNotification(
        LanguageManager.get('clear_data_failed', 'Failed to clear app data'),
        'error'
      );
    }
  }

  static async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const granted = await navigator.storage.persist();
        if (granted) {
          console.log('Persistent storage granted');
          UIManager.showNotification(
            LanguageManager.get('persistent_storage_granted', 'Persistent storage enabled'),
            'success'
          );
        } else {
          console.log('Persistent storage denied');
        }
        return granted;
      } catch (error) {
        console.error('Persistent storage request failed:', error);
        return false;
      }
    }
    return false;
  }

  static setupPushNotifications() {
    if ('Notification' in window) {
      // Request notification permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        } else {
          console.log('Notification permission denied');
        }
      });
    }
  }

  static sendNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    }
    return null;
  }

  static async shareContent(data) {
    if ('share' in navigator) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.error('Share failed:', error);
        return false;
      }
    }
    return false;
  }

  static isStandalone() {
    return this.isInstalled || 
           window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone;
  }

  static addToHomeScreen() {
    // iOS Safari specific instructions
    if (this.isIOS() && !this.isStandalone()) {
      UIManager.showModal(
        LanguageManager.get('add_to_home_screen', 'Add to Home Screen'),
        `
          <div class="text-center">
            <div class="text-4xl mb-4">📱</div>
            <p class="mb-4">${LanguageManager.get('ios_install_instructions', 'To install this app on your iOS device, tap the share button and then "Add to Home Screen".')}</p>
            <div class="flex justify-center space-x-2 text-2xl">
              <i class="fas fa-share"></i>
              <span>→</span>
              <i class="fas fa-plus-square"></i>
            </div>
          </div>
        `,
        [
          {
            text: LanguageManager.get('got_it', 'Got it'),
            className: 'bg-blue-500 hover:bg-blue-600 text-white'
          }
        ]
      );
    }
  }

  static isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }
}
