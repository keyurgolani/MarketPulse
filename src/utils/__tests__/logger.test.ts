import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info message'),
        undefined
      );
    });

    it('should log info messages with data', () => {
      const data = { key: 'value' };
      logger.info('Test message', data);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test message'),
        data
      );
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      logger.error('Test error message');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error message'),
        undefined,
        undefined
      );
    });

    it('should log error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', {}, error);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Error occurred'),
        {},
        error
      );
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warning message'),
        undefined
      );
    });

    it('should log warnings with data', () => {
      const data = { warning: 'deprecated' };
      logger.warn('Deprecated feature', data);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Deprecated feature'),
        data
      );
    });
  });

  describe('debug', () => {
    it('should log debug messages in development', () => {
      logger.debug('Test debug message');
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Test debug message'),
        undefined
      );
    });

    it('should not log debug messages in production', () => {
      // Set log level to warn to simulate production
      logger.setLevel('warn');
      logger.debug('Test debug message');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
      // Reset to debug level
      logger.setLevel('debug');
    });
  });

  describe('timestamp formatting', () => {
    it('should include timestamp in log messages', () => {
      logger.info('Test message');
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test message/
        ),
        undefined
      );
    });
  });

  describe('log levels', () => {
    it('should handle different log levels', () => {
      logger.info('Info message');
      logger.error('Error message');
      logger.warn('Warning message');

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('data serialization', () => {
    it('should handle complex data objects', () => {
      const complexData = {
        nested: { value: 123 },
        array: [1, 2, 3],
        date: new Date(),
        null: null,
        undefined: undefined,
      };

      logger.info('Complex data', complexData);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Complex data'),
        complexData
      );
    });

    it('should handle circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => {
        logger.info('Circular data', circular);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle logging errors gracefully', () => {
      // Mock console.error to throw
      consoleSpy.error.mockImplementation(() => {
        throw new Error('Console error');
      });

      expect(() => {
        logger.error('Test message');
      }).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should not impact performance significantly', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 1000 logs in reasonable time (less than 1000ms for 1000 logs)
      expect(duration).toBeLessThan(1000);
    });
  });
});
