// Language management system for multi-language support
class LanguageManager {
  static currentLanguage = 'en';
  static translations = {};
  static availableLanguages = ['en', 'id'];

  static async init() {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('dnp_language') || 'en';
    await this.setLanguage(savedLanguage);
  }

  static async setLanguage(language) {
    if (!this.availableLanguages.includes(language)) {
      console.warn(`Language ${language} not available, falling back to English`);
      language = 'en';
    }

    try {
      // Load language file
      const response = await fetch(`lang/${language}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load language file: ${response.status}`);
      }

      this.translations = await response.json();
      this.currentLanguage = language;

      // Save language preference
      localStorage.setItem('dnp_language', language);

      // Update UI
      this.updateUI();
      this.updateLanguageToggle();

    } catch (error) {
      console.error('Failed to load language:', error);
      
      // Fallback to English if loading fails
      if (language !== 'en') {
        await this.setLanguage('en');
      }
    }
  }

  static get(key, defaultValue = null) {
    const value = this.translations[key];
    
    if (value === undefined) {
      console.warn(`Translation key "${key}" not found for language "${this.currentLanguage}"`);
      return defaultValue || key;
    }

    return value;
  }

  static updateUI() {
    // Update all elements with data-lang attribute
    const elements = document.querySelectorAll('[data-lang]');
    
    elements.forEach(element => {
      const key = element.getAttribute('data-lang');
      const translation = this.get(key);
      
      if (translation) {
        // Update text content or placeholder
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          if (element.type === 'text' || element.type === 'password' || element.tagName === 'TEXTAREA') {
            element.placeholder = translation;
          } else {
            element.value = translation;
          }
        } else if (element.tagName === 'OPTION') {
          element.textContent = translation;
        } else {
          element.textContent = translation;
        }
      }
    });

    // Update document title
    document.title = this.get('app_title', 'Decentralized Notepad');

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.content = this.get('meta_description', 'Privacy-focused decentralized notepad and todo app');
    }
  }

  static updateLanguageToggle() {
    const languageToggle = document.getElementById('language-toggle');
    const currentLangSpan = document.getElementById('current-lang');
    
    if (languageToggle && currentLangSpan) {
      currentLangSpan.textContent = this.currentLanguage.toUpperCase();
      languageToggle.title = this.get('change_language', 'Change Language');
    }
  }

  static async toggleLanguage() {
    const currentIndex = this.availableLanguages.indexOf(this.currentLanguage);
    const nextIndex = (currentIndex + 1) % this.availableLanguages.length;
    const nextLanguage = this.availableLanguages[nextIndex];
    
    await this.setLanguage(nextLanguage);
    
    // Show notification
    UIManager.showNotification(
      `${this.get('language_changed')}: ${this.get('language_name')}`,
      'info'
    );
  }

  static getCurrentLanguage() {
    return this.currentLanguage;
  }

  static getAvailableLanguages() {
    return [...this.availableLanguages];
  }

  static formatPlural(count, singularKey, pluralKey) {
    const key = count === 1 ? singularKey : pluralKey;
    return this.get(key, key);
  }

  static formatWithParams(key, params = {}) {
    let translation = this.get(key);
    
    if (translation && typeof params === 'object') {
      Object.keys(params).forEach(paramKey => {
        const placeholder = `{${paramKey}}`;
        translation = translation.replace(new RegExp(placeholder, 'g'), params[paramKey]);
      });
    }
    
    return translation;
  }

  static getDateFormat() {
    // Return appropriate date format for current language
    switch (this.currentLanguage) {
      case 'id':
        return 'dd/mm/yyyy';
      case 'en':
      default:
        return 'mm/dd/yyyy';
    }
  }

  static getTimeFormat() {
    // Return appropriate time format for current language
    switch (this.currentLanguage) {
      case 'id':
        return '24';
      case 'en':
      default:
        return '12';
    }
  }

  static formatDate(date, format = 'short') {
    const d = new Date(date);
    const options = {};
    
    switch (format) {
      case 'short':
        options.dateStyle = 'short';
        break;
      case 'medium':
        options.dateStyle = 'medium';
        break;
      case 'long':
        options.dateStyle = 'long';
        options.timeStyle = 'short';
        break;
      case 'relative':
        return this.formatRelativeTime(d);
      default:
        options.dateStyle = 'short';
    }
    
    return d.toLocaleDateString(this.getLocale(), options);
  }

  static formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (days > 7) {
      return this.formatDate(date, 'short');
    } else if (days > 0) {
      return `${days} ${this.formatPlural(days, 'day', 'days')} ${this.get('ago')}`;
    } else if (hours > 0) {
      return `${hours} ${this.formatPlural(hours, 'hour', 'hours')} ${this.get('ago')}`;
    } else if (minutes > 0) {
      return `${minutes} ${this.formatPlural(minutes, 'minute', 'minutes')} ${this.get('ago')}`;
    } else {
      return this.get('just_now');
    }
  }

  static getLocale() {
    switch (this.currentLanguage) {
      case 'id':
        return 'id-ID';
      case 'en':
      default:
        return 'en-US';
    }
  }

  static isRTL() {
    // Add RTL language support if needed
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(this.currentLanguage);
  }

  static getDirection() {
    return this.isRTL() ? 'rtl' : 'ltr';
  }

  static async loadLanguageFile(language) {
    try {
      const response = await fetch(`lang/${language}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to load language file for ${language}:`, error);
      return null;
    }
  }

  static validateTranslations() {
    const requiredKeys = [
      'app_title', 'loading', 'welcome', 'passphrase', 'unlock',
      'notes', 'todos', 'save', 'delete', 'export', 'import',
      'about', 'settings', 'online', 'offline', 'syncing'
    ];

    const missingKeys = requiredKeys.filter(key => !this.translations[key]);
    
    if (missingKeys.length > 0) {
      console.warn(`Missing translation keys for ${this.currentLanguage}:`, missingKeys);
    }
    
    return missingKeys.length === 0;
  }

  static addTranslation(key, value) {
    this.translations[key] = value;
  }

  static addTranslations(translations) {
    Object.assign(this.translations, translations);
  }

  static removeTranslation(key) {
    delete this.translations[key];
  }

  static getAllTranslations() {
    return { ...this.translations };
  }

  static getTranslationStats() {
    return {
      language: this.currentLanguage,
      totalKeys: Object.keys(this.translations).length,
      isValid: this.validateTranslations()
    };
  }
}
