// UI Manager for theme, notifications, and interface interactions
class UIManager {
  static currentTheme = 'light';
  static sidebarOpen = false;

  static init() {
    // Load saved theme
    const savedTheme = localStorage.getItem('dnp_theme') || 'light';
    this.setTheme(savedTheme);
    
    // Setup responsive behavior
    this.setupResponsive();
    
    // Setup notification system
    this.setupNotifications();
  }

  static setupResponsive() {
    // Close sidebar on window resize if mobile
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        this.closeSidebar();
      }
    });
  }

  static setupNotifications() {
    // Auto-hide notifications after 5 seconds
    document.addEventListener('DOMContentLoaded', () => {
      const notification = document.getElementById('notification');
      if (notification) {
        notification.addEventListener('transitionend', (e) => {
          if (e.target.classList.contains('translate-x-full')) {
            setTimeout(() => {
              notification.style.display = 'none';
            }, 100);
          }
        });
      }
    });
  }

  static setTheme(theme) {
    this.currentTheme = theme;
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Update theme toggle icon
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const moonIcon = themeToggle.querySelector('.fa-moon');
      const sunIcon = themeToggle.querySelector('.fa-sun');
      
      if (theme === 'dark') {
        moonIcon.classList.add('hidden');
        sunIcon.classList.remove('hidden');
      } else {
        moonIcon.classList.remove('hidden');
        sunIcon.classList.add('hidden');
      }
    }
    
    // Save theme preference
    localStorage.setItem('dnp_theme', theme);
    
    // Update PWA theme color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.content = theme === 'dark' ? '#1f2937' : '#ffffff';
    }
  }

  static toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  static getCurrentTheme() {
    return this.currentTheme;
  }

  static showNotification(message, type = 'info', duration = 5000) {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notification-message');
    
    if (!notification || !messageElement) return;
    
    // Set message
    messageElement.textContent = message;
    
    // Set type-specific styling
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 z-50 notification-${type}`;
    
    // Show notification
    notification.style.display = 'block';
    notification.classList.remove('translate-x-full');
    notification.classList.add('translate-x-0');
    
    // Auto-hide after duration
    setTimeout(() => {
      this.hideNotification();
    }, duration);
  }

  static hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.classList.remove('translate-x-0');
      notification.classList.add('translate-x-full');
    }
  }

  static toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (!sidebar || !overlay) return;
    
    this.sidebarOpen = !this.sidebarOpen;
    
    if (this.sidebarOpen) {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      overlay.classList.remove('hidden');
    } else {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
      overlay.classList.add('hidden');
    }
  }

  static closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (!sidebar || !overlay) return;
    
    this.sidebarOpen = false;
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    overlay.classList.add('hidden');
  }

  static showModal(title, content, buttons = []) {
    // Create modal dynamically
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'dynamic-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4';
    
    // Title
    const titleElement = document.createElement('h2');
    titleElement.className = 'text-xl font-bold mb-4 text-gray-800 dark:text-white';
    titleElement.textContent = title;
    
    // Content
    const contentElement = document.createElement('div');
    contentElement.className = 'mb-6 text-gray-600 dark:text-gray-400';
    contentElement.innerHTML = content;
    
    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex justify-end space-x-2';
    
    buttons.forEach(button => {
      const btn = document.createElement('button');
      btn.className = `px-4 py-2 rounded-md font-medium ${button.className || 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`;
      btn.textContent = button.text;
      btn.onclick = () => {
        if (button.action) button.action();
        this.closeModal();
      };
      buttonContainer.appendChild(btn);
    });
    
    modalContent.appendChild(titleElement);
    modalContent.appendChild(contentElement);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    
    // Add to DOM
    document.body.appendChild(modal);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  static closeModal() {
    const modal = document.getElementById('dynamic-modal');
    if (modal) {
      modal.remove();
    }
  }

  static showConfirmDialog(title, message, onConfirm, onCancel) {
    this.showModal(title, message, [
      {
        text: LanguageManager.get('cancel'),
        className: 'bg-gray-300 hover:bg-gray-400 text-gray-800',
        action: onCancel
      },
      {
        text: LanguageManager.get('confirm'),
        className: 'bg-red-500 hover:bg-red-600 text-white',
        action: onConfirm
      }
    ]);
  }

  static showProgress(message) {
    const progress = document.createElement('div');
    progress.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    progress.id = 'progress-modal';
    
    progress.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-8 rounded-lg text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p class="text-gray-800 dark:text-white">${message}</p>
      </div>
    `;
    
    document.body.appendChild(progress);
  }

  static hideProgress() {
    const progress = document.getElementById('progress-modal');
    if (progress) {
      progress.remove();
    }
  }

  static updateSyncStatus(status, peerCount = 0) {
    const syncStatus = document.getElementById('sync-status');
    if (!syncStatus) return;
    
    const dot = syncStatus.querySelector('div');
    const text = syncStatus.querySelector('span');
    
    switch (status) {
      case 'online':
        dot.className = 'w-2 h-2 bg-green-500 rounded-full mr-2';
        text.textContent = LanguageManager.get('online');
        text.setAttribute('data-lang', 'online');
        break;
      case 'syncing':
        dot.className = 'w-2 h-2 bg-yellow-500 rounded-full mr-2 pulse';
        text.textContent = LanguageManager.get('syncing');
        text.setAttribute('data-lang', 'syncing');
        break;
      case 'offline':
      default:
        dot.className = 'w-2 h-2 bg-red-500 rounded-full mr-2';
        text.textContent = LanguageManager.get('offline');
        text.setAttribute('data-lang', 'offline');
        break;
    }
    
    // Update title with peer count if online
    if (status === 'online' && peerCount > 0) {
      syncStatus.title = `${LanguageManager.get('connected_peers')}: ${peerCount}`;
    } else {
      syncStatus.title = '';
    }
  }

  static animateElement(element, animation = 'bounce') {
    element.classList.add(`animate-${animation}`);
    setTimeout(() => {
      element.classList.remove(`animate-${animation}`);
    }, 1000);
  }

  static highlightElement(element, duration = 2000) {
    element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
    setTimeout(() => {
      element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
    }, duration);
  }

  static showTooltip(element, message, position = 'top') {
    const tooltip = document.createElement('div');
    tooltip.className = `absolute z-50 px-2 py-1 text-sm text-white bg-gray-800 rounded shadow-lg ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`;
    tooltip.textContent = message;
    
    element.style.position = 'relative';
    element.appendChild(tooltip);
    
    setTimeout(() => {
      tooltip.remove();
    }, 3000);
  }

  static getScreenSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 768,
      isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
      isDesktop: window.innerWidth >= 1024
    };
  }

  static formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  static formatDate(date, format = 'short') {
    const d = new Date(date);
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString();
      case 'long':
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
      case 'relative':
        const now = new Date();
        const diff = now - d;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return LanguageManager.get('today');
        if (days === 1) return LanguageManager.get('yesterday');
        if (days < 7) return `${days} ${LanguageManager.get('days_ago')}`;
        return d.toLocaleDateString();
      default:
        return d.toString();
    }
  }
}
