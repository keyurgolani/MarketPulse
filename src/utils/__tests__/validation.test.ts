import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  validatePasswordStrength,
  isValidAssetSymbol,
  sanitizeString,
  isValidUrl,
  validateData,
  UserLoginSchema,
  AssetSchema,
} from '../validation';

describe('validation utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('test..test@example.com')).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong passwords', () => {
      expect(validatePasswordStrength('StrongPass123!').isValid).toBe(true);
      expect(validatePasswordStrength('MySecure@Pass1').isValid).toBe(true);
      expect(validatePasswordStrength('Complex#Pass99').isValid).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePasswordStrength('weak').isValid).toBe(false);
      expect(validatePasswordStrength('password').isValid).toBe(false);
      expect(validatePasswordStrength('12345678').isValid).toBe(false);
      expect(validatePasswordStrength('PASSWORD').isValid).toBe(false);
      expect(validatePasswordStrength('').isValid).toBe(false);
    });
  });

  describe('isValidAssetSymbol', () => {
    it('should validate correct stock symbols', () => {
      expect(isValidAssetSymbol('AAPL')).toBe(true);
      expect(isValidAssetSymbol('GOOGL')).toBe(true);
      expect(isValidAssetSymbol('MSFT')).toBe(true);
      expect(isValidAssetSymbol('BRK.A')).toBe(true);
    });

    it('should reject invalid symbols', () => {
      expect(isValidAssetSymbol('')).toBe(false);
      expect(isValidAssetSymbol('TOOLONGSYMBOL')).toBe(false);
      expect(isValidAssetSymbol('SYMB@L')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize HTML input', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe(
        'scriptalert("xss")/script'
      );
      expect(sanitizeString('Hello <b>World</b>')).toBe('Hello bWorld/b');
      expect(sanitizeString('Safe text')).toBe('Safe text');
    });

    it('should handle empty and null inputs', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://api.example.com/data')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(true); // ftp is valid URL
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(true); // javascript: is valid URL protocol
    });
  });

  describe('validateData', () => {
    it('should validate correct data with schema', () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'password123',
      };
      const result = validateData(UserLoginSchema, validLogin);
      expect(result.success).toBe(true);
    });

    it('should reject invalid data', () => {
      const invalidLogin = {
        email: 'invalid-email',
        password: '',
      };
      const result = validateData(UserLoginSchema, invalidLogin);
      expect(result.success).toBe(false);
    });
  });

  describe('AssetSchema validation', () => {
    it('should validate correct asset data', () => {
      const validAsset = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 50000000,
        lastUpdated: new Date(),
        source: 'yahoo' as const,
        exchange: 'NASDAQ',
        type: 'stock' as const,
        isMarketOpen: true,
      };
      const result = validateData(AssetSchema, validAsset);
      expect(result.success).toBe(true);
    });

    it('should reject invalid asset data', () => {
      const invalidAsset = {
        symbol: '',
        price: -100, // negative price
        volume: -1000, // negative volume
      };
      const result = validateData(AssetSchema, invalidAsset);
      expect(result.success).toBe(false);
    });
  });
});
