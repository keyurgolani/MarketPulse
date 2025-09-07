import { Request, Response, NextFunction } from 'express';
import {
  requestTiming,
  requestId,
  detailedRequestLogger,
} from '../../middleware/requestLogger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
  },
  loggerStream: {
    write: jest.fn(),
  },
}));

describe('Request Logger Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn(),
    };
    mockRes = {
      setHeader: jest.fn(),
      get: jest.fn(),
      end: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('requestTiming', () => {
    it('should add start time to request', () => {
      const beforeTime = Date.now();

      requestTiming(mockReq as Request, mockRes as Response, mockNext);

      const afterTime = Date.now();
      const startTime = (mockReq as Request & { startTime: number }).startTime;

      expect(startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(startTime).toBeLessThanOrEqual(afterTime);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requestId', () => {
    it('should add request ID to request and response header', () => {
      requestId(mockReq as Request, mockRes as Response, mockNext);

      const reqId = (mockReq as Request & { requestId: string }).requestId;

      expect(reqId).toBeDefined();
      expect(typeof reqId).toBe('string');
      expect(reqId.length).toBeGreaterThan(0);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', reqId);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('detailedRequestLogger', () => {
    it('should log request details and override response end', () => {
      const originalEnd = jest.fn();
      mockRes.end = originalEnd;
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        switch (header) {
          case 'User-Agent':
            return 'test-agent';
          case 'Content-Type':
            return 'application/json';
          case 'Content-Length':
            return '100';
          default:
            return undefined;
        }
      });

      detailedRequestLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.end).not.toBe(originalEnd);
      expect(typeof mockRes.end).toBe('function');
    });
  });
});
