// Cryptographic operations manager
class CryptoManager {
  static passphrase = null;
  static salt = null;
  static userKeyHash = null;

  static async createUser(passphrase) {
    try {
      // Generate salt
      this.salt = CryptoJS.lib.WordArray.random(128/8).toString();
      
      // Create key hash for verification
      this.userKeyHash = CryptoJS.PBKDF2(passphrase, this.salt, {
        keySize: 256/32,
        iterations: 10000
      }).toString();
      
      // Store salt and key hash
      localStorage.setItem('dnp_salt', this.salt);
      localStorage.setItem('dnp_key_hash', this.userKeyHash);
      
      return true;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  static async verifyPassphrase(passphrase) {
    try {
      const storedSalt = localStorage.getItem('dnp_salt');
      const storedKeyHash = localStorage.getItem('dnp_key_hash');
      
      if (!storedSalt || !storedKeyHash) {
        return false;
      }
      
      // Generate key hash from provided passphrase
      const keyHash = CryptoJS.PBKDF2(passphrase, storedSalt, {
        keySize: 256/32,
        iterations: 10000
      }).toString();
      
      return keyHash === storedKeyHash;
    } catch (error) {
      console.error('Failed to verify passphrase:', error);
      return false;
    }
  }

  static setPassphrase(passphrase) {
    this.passphrase = passphrase;
    this.salt = localStorage.getItem('dnp_salt');
  }

  static clearPassphrase() {
    this.passphrase = null;
    this.salt = null;
    this.userKeyHash = null;
  }

  static encrypt(data) {
    if (!this.passphrase || !this.salt) {
      throw new Error('Passphrase not set');
    }

    try {
      // Create encryption key
      const key = CryptoJS.PBKDF2(this.passphrase, this.salt, {
        keySize: 256/32,
        iterations: 10000
      });

      // Encrypt data
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return encrypted.toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  static decrypt(encryptedData) {
    if (!this.passphrase || !this.salt) {
      throw new Error('Passphrase not set');
    }

    try {
      // Create decryption key
      const key = CryptoJS.PBKDF2(this.passphrase, this.salt, {
        keySize: 256/32,
        iterations: 10000
      });

      // Decrypt data
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  static generateId() {
    return CryptoJS.lib.WordArray.random(128/8).toString();
  }

  static hashData(data) {
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
  }

  static async generateRecoveryKey() {
    if (!this.passphrase || !this.salt) {
      throw new Error('User not authenticated');
    }

    try {
      const recoveryData = {
        salt: this.salt,
        keyHash: this.userKeyHash,
        timestamp: Date.now()
      };

      // Encrypt recovery data with a different key derivation
      const recoveryKey = CryptoJS.PBKDF2(this.passphrase + 'recovery', this.salt, {
        keySize: 256/32,
        iterations: 15000
      });

      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(recoveryData), recoveryKey).toString();
      
      return {
        recoveryKey: encrypted,
        instructions: 'Store this recovery key safely. It can be used to recover your account if you forget your passphrase.'
      };
    } catch (error) {
      console.error('Failed to generate recovery key:', error);
      throw error;
    }
  }

  static async recoverFromKey(recoveryKey, newPassphrase) {
    try {
      // Try to decrypt recovery key with old passphrase
      const recoveryKeyData = CryptoJS.PBKDF2(newPassphrase + 'recovery', this.salt, {
        keySize: 256/32,
        iterations: 15000
      });

      const decrypted = CryptoJS.AES.decrypt(recoveryKey, recoveryKeyData);
      const recoveryData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

      // Restore user data
      this.salt = recoveryData.salt;
      this.userKeyHash = recoveryData.keyHash;
      
      // Update with new passphrase
      await this.createUser(newPassphrase);
      
      return true;
    } catch (error) {
      console.error('Recovery failed:', error);
      return false;
    }
  }
}
