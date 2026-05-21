import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

const KEY_STORAGE_KEY = 'mmca_session_secret';

export const CryptoService = {
  /**
   * Generates a 256-bit session key and stores it securely in the Android Keystore/iOS Keychain
   */
  generateSessionKey: async (): Promise<string> => {
    const newKey = CryptoJS.lib.WordArray.random(32).toString();
    await Keychain.setGenericPassword(KEY_STORAGE_KEY, newKey, {
      service: 'com.mmca.crypto',
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });
    return newKey;
  },

  /**
   * Retrieves the stored session key from secure storage
   */
  getStoredKey: async (): Promise<string | null> => {
    const credentials = await Keychain.getGenericPassword({ service: 'com.mmca.crypto' });
    if (credentials) {
      return credentials.password;
    }
    return null;
  },

  /**
   * Encrypts a payload using AES-256
   */
  encryptPayload: (data: string, key: string): string => {
    return CryptoJS.AES.encrypt(data, key).toString();
  },

  /**
   * Decrypts a payload using AES-256
   */
  decryptPayload: (data: string, key: string): string => {
    const bytes = CryptoJS.AES.decrypt(data, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  },
};
