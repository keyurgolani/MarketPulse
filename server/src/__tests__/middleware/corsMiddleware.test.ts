import { Request, Response, NextFunction } from 'express';
import {
  corsMiddleware,
  preflightHandler,
  corsErrorHandler,
} from '../../middleware/corsMiddleware';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CORS Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/api/test',
      get: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('preflightHandler', () => {
    it('should handle OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        switch (header) {
          case 'Origin':
            return 'http://localhost:5173';
          case 'Access-Control-Request-Method':
            return 'POST';
          case 'Access-Control-Request-Headers':
            return 'Content-Type';
          default:
            return undefined;
        }
      });

      preflightHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle non-OPTIONS requests', () => {
      mockReq.method = 'GET';

      preflightHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('corsErrorHandler', () => {
    it('should handle CORS errors', () => {
      const corsError = new Error(
        'Origin http://evil.com not allowed by CORS policy'
      );
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        switch (header) {
          case 'Origin':
            return 'http://evil.com';
          default:
            return undefined;
        }
      });

      corsErrorHandler(
        corsError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'CORS policy violation',
        code: 'CORS_ERROR',
        timestamp: expect.any(Number),
      });
    });

    it('should pass non-CORS errors to next handler', () => {
      const nonCorsError = new Error('Some other error');

      corsErrorHandler(
        nonCorsError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(nonCorsError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('corsMiddleware', () => {
    it('should be defined', () => {
      expect(corsMiddleware).toBeDefined();
      expect(typeof corsMiddleware).toBe('function');
    });
  });
});
