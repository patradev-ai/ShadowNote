// Cryptographic operations manager
class CryptoManager {
  static passphrase = null;
  static salt = null;
  static userKeyHash = null;
  static recoveryPhrase = null;

  // BIP39 word list (simplified version for demo)
  static WORD_LIST = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
    'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
    'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
    'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'agent', 'agree',
    'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert', 'alien',
    'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter', 'always',
    'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle',
    'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety',
    'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'area', 'arena', 'argue',
    'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art',
    'article', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume', 'asthma',
    'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction', 'audit', 'august', 'aunt',
    'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake', 'aware', 'away', 'awesome',
    'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony',
    'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic',
    'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef', 'before', 'begin',
    'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit', 'best', 'betray', 'better',
    'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter',
    'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom',
    'blow', 'blue', 'blur', 'blush', 'board', 'boat', 'body', 'boil', 'bomb', 'bone',
    'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss', 'bottom', 'bounce', 'box',
    'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge',
    'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother', 'brown',
    'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk', 'bullet', 'bundle',
    'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy', 'butter', 'buyer', 'buzz',
    'cabin', 'cable', 'cactus', 'cage', 'cake', 'call', 'calm', 'camera', 'camp', 'can',
    'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas', 'canyon', 'capable', 'capital', 'captain',
    'car', 'carbon', 'card', 'care', 'career', 'careful', 'careless', 'cargo', 'carpet', 'carry',
    'cart', 'case', 'cash', 'casino', 'cast', 'casual', 'cat', 'catalog', 'catch', 'category',
    'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery', 'cement', 'census', 'century',
    'cereal', 'certain', 'chair', 'chalk', 'champion', 'change', 'chaos', 'chapter', 'charge', 'chase',
    'chat', 'cheap', 'check', 'cheese', 'chef', 'cherry', 'chest', 'chicken', 'chief', 'child',
    'chimney', 'choice', 'choose', 'chronic', 'chuckle', 'chunk', 'churn', 'cigar', 'cinnamon', 'circle',
    'citizen', 'city', 'civil', 'claim', 'clamp', 'clarify', 'clash', 'class', 'clause', 'clean',
    'clerk', 'clever', 'click', 'client', 'cliff', 'climb', 'clinic', 'clip', 'clock', 'clog',
    'close', 'cloth', 'cloud', 'clown', 'club', 'clump', 'cluster', 'clutch', 'coach', 'coast',
    'coconut', 'code', 'coffee', 'coil', 'coin', 'collect', 'color', 'column', 'combine', 'come',
    'comfort', 'comic', 'common', 'company', 'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider',
    'control', 'convince', 'cook', 'cool', 'copper', 'copy', 'coral', 'core', 'corn', 'correct',
    'cost', 'cotton', 'couch', 'country', 'couple', 'course', 'cousin', 'cover', 'coyote', 'crack',
    'cradle', 'craft', 'cram', 'crane', 'crash', 'crater', 'crawl', 'crazy', 'cream', 'credit',
    'creek', 'crew', 'cricket', 'crime', 'crisp', 'critic', 'crop', 'cross', 'crouch', 'crowd',
    'crucial', 'cruel', 'cruise', 'crumble', 'crunch', 'crush', 'cry', 'crystal', 'cube', 'culture',
    'cup', 'cupboard', 'curious', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cute', 'cycle'
  ];

  static generateRecoveryPhrase() {
    const words = [];
    // Use crypto.getRandomValues for better randomness
    const randomArray = new Uint32Array(12);
    crypto.getRandomValues(randomArray);

    for (let i = 0; i < 12; i++) {
      const randomIndex = randomArray[i] % this.WORD_LIST.length;
      words.push(this.WORD_LIST[randomIndex]);
    }
    return words.join(' ');
  }

  static generatePassphrase() {
    // Generate a strong random passphrase
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let passphrase = '';
    const randomArray = new Uint32Array(24);
    crypto.getRandomValues(randomArray);

    for (let i = 0; i < 24; i++) {
      passphrase += chars[randomArray[i] % chars.length];
    }
    return passphrase;
  }

  static validateRecoveryPhrase(phrase) {
    if (!phrase || typeof phrase !== 'string') return false;

    const words = phrase.trim().toLowerCase().split(/\s+/);
    if (words.length !== 12) return false;

    return words.every(word => this.WORD_LIST.includes(word));
  }

  static async createUser(passphrase, recoveryPhrase = null) {
    try {
      // Generate recovery phrase if not provided
      if (!recoveryPhrase) {
        recoveryPhrase = this.generateRecoveryPhrase();
      }

      // Generate salt
      this.salt = CryptoJS.lib.WordArray.random(128/8).toString();

      // Set passphrase first so encrypt function works
      this.passphrase = passphrase;

      // Create key hash for verification
      this.userKeyHash = CryptoJS.PBKDF2(passphrase, this.salt, {
        keySize: 256/32,
        iterations: 10000
      }).toString();

      // Encrypt recovery phrase with user's passphrase
      const encryptedRecoveryPhrase = this.encrypt(recoveryPhrase);

      // Store user data
      localStorage.setItem('dnp_salt', this.salt);
      localStorage.setItem('dnp_key_hash', this.userKeyHash);
      localStorage.setItem('dnp_recovery_phrase', encryptedRecoveryPhrase);

      this.recoveryPhrase = recoveryPhrase;

      return { success: true, recoveryPhrase };
    } catch (error) {
      console.error('Failed to create user:', error);
      return { success: false, error: error.message };
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

      // Compare with stored hash
      if (keyHash === storedKeyHash) {
        this.passphrase = passphrase;
        this.salt = storedSalt;
        this.userKeyHash = storedKeyHash;

        // Decrypt recovery phrase
        const encryptedRecoveryPhrase = localStorage.getItem('dnp_recovery_phrase');
        if (encryptedRecoveryPhrase) {
          try {
            this.recoveryPhrase = this.decrypt(encryptedRecoveryPhrase);
          } catch (e) {
            console.warn('Could not decrypt recovery phrase:', e);
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to verify passphrase:', error);
      return false;
    }
  }

  static async recoverFromPhrase(recoveryPhrase, newPassphrase) {
    try {
      if (!this.validateRecoveryPhrase(recoveryPhrase)) {
        throw new Error('Invalid recovery phrase format');
      }

      const storedSalt = localStorage.getItem('dnp_salt');
      const storedRecoveryPhrase = localStorage.getItem('dnp_recovery_phrase');

      if (!storedSalt || !storedRecoveryPhrase) {
        throw new Error('No existing account found');
      }

      // Try to decrypt existing recovery phrase to verify
      try {
        const tempPassphrase = this.passphrase || '';
        const tempKey = CryptoJS.PBKDF2(tempPassphrase, storedSalt, {
          keySize: 256/32,
          iterations: 10000
        });

        const decryptedPhrase = CryptoJS.AES.decrypt(storedRecoveryPhrase, tempKey.toString()).toString(CryptoJS.enc.Utf8);

        if (decryptedPhrase && decryptedPhrase !== recoveryPhrase) {
          throw new Error('Recovery phrase does not match');
        }
      } catch (e) {
        // If decryption fails, we'll proceed with recovery anyway
        console.warn('Could not verify existing recovery phrase:', e);
      }

      // Create new user with new passphrase and provided recovery phrase
      const result = await this.createUser(newPassphrase, recoveryPhrase);

      if (result.success) {
        return { success: true, message: 'Account recovered successfully' };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to recover from phrase:', error);
      return { success: false, error: error.message };
    }
  }

  static getRecoveryPhrase() {
    return this.recoveryPhrase;
  }

  static async backupRecoveryPhrase() {
    try {
      if (!this.recoveryPhrase) {
        const encryptedRecoveryPhrase = localStorage.getItem('dnp_recovery_phrase');
        if (encryptedRecoveryPhrase && this.passphrase) {
          this.recoveryPhrase = this.decrypt(encryptedRecoveryPhrase);
        }
      }

      if (!this.recoveryPhrase) {
        throw new Error('No recovery phrase available');
      }

      return { success: true, recoveryPhrase: this.recoveryPhrase };
    } catch (error) {
      console.error('Failed to backup recovery phrase:', error);
      return { success: false, error: error.message };
    }
  }

  static setPassphrase(passphrase) {
    this.passphrase = passphrase;
  }

  static clearPassphrase() {
    this.passphrase = null;
    this.salt = null;
    this.userKeyHash = null;
    this.recoveryPhrase = null;
  }

  static getUserKey() {
    // Generate a unique key for this user based on their key hash
    if (!this.userKeyHash) {
      throw new Error('User not authenticated');
    }
    return `user_${this.userKeyHash.substring(0, 16)}`;
  }

  static encrypt(data) {
    if (!this.passphrase) {
      throw new Error('No passphrase set');
    }

    const key = CryptoJS.PBKDF2(this.passphrase, this.salt, {
      keySize: 256/32,
      iterations: 10000
    });

    return CryptoJS.AES.encrypt(JSON.stringify(data), key.toString()).toString();
  }

  static decrypt(encryptedData) {
    if (!this.passphrase) {
      throw new Error('No passphrase set');
    }

    const key = CryptoJS.PBKDF2(this.passphrase, this.salt, {
      keySize: 256/32,
      iterations: 10000
    });

    const bytes = CryptoJS.AES.decrypt(encryptedData, key.toString());
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }

  static generateId() {
    return CryptoJS.lib.WordArray.random(128/8).toString();
  }

  static hashData(data) {
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
  }

  // Web3 Wallet Integration
  static async connectWallet() {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });

        if (accounts.length > 0) {
          return {
            success: true,
            address: accounts[0],
            provider: 'MetaMask'
          };
        }
      }

      throw new Error('No Web3 wallet found');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async signMessage(message) {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        });

        if (accounts.length > 0) {
          const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, accounts[0]]
          });

          return {
            success: true,
            signature,
            address: accounts[0]
          };
        }
      }

      throw new Error('No wallet connected');
    } catch (error) {
      console.error('Failed to sign message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async verifyWalletSignature(message, signature, address) {
    try {
      // This would typically use a library like ethers.js
      // For now, we'll return true as a placeholder
      return {
        success: true,
        verified: true
      };
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}