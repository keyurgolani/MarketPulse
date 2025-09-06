import { Request, Response, NextFunction } from 'express';
import { 
  createRateLimiter, 
  rateLimiter, 
  strictRateLimiter, 
  lenientRateLimiter,
  cleanupRateLimiter 
} from '../../middleware/rateLimiter';
import { RateLimitError } from '../../middleware/errorHandler';

describe('Rate Limiter Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let setHeaderSpy: jest.Mock;

  beforeEach(() => {
    setHeaderSpy = jest.fn();
    
    mockRequest = {
      ip: '127.0.0.1',
      url: '/test',
      method: 'GET',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };
    
    mockResponse = {
      setHeader: setHeaderSpy,
      end: jest.fn(),
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupRateLimiter();
  });

  describe('createRateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });
      
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });
      
      // First two requests should pass
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
      
      // Third request should throw RateLimitError
      expect(() => {
        limiter(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(RateLimitError);
    });

    it('should use custom key generator', () => {
      const customKeyGenerator = jest.fn().mockReturnValue('custom-key');
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: customKeyGenerator,
      });
      
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(customKeyGenerator).toHaveBeenCalledWith(mockRequest);
    });

    it('should use user ID when available', () => {
      (mockRequest as any).user = { id: 'user123' };
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });
      
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reset count after window expires', (done) => {
      const limiter = createRateLimiter({
        windowMs: 100, // Very short window for testing
        maxRequests: 1,
      });
      
      // First request should pass
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Second request should fail
      expect(() => {
        limiter(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(RateLimitError);
      
      // After window expires, request should pass again
      setTimeout(() => {
        jest.clearAllMocks();
        limiter(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });
  });

  describe('skipSuccessfulRequests option', () => {
    it('should not count successful requests when skipSuccessfulRequests is true', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        skipSuccessfulRequests: true,
      });
      
      // Mock successful response
      const mockEnd = jest.fn();
      mockResponse.end = mockEnd;
      mockResponse.statusCode = 200;
      
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Simulate response end
      const originalEnd = mockResponse.end as jest.Mock;
      originalEnd.call(mockResponse);
      
      // Second request should still pass because first was successful
      jest.clearAllMocks();
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('skipFailedRequests option', () => {
    it('should not count failed requests when skipFailedRequests is true', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        skipFailedRequests: true,
      });
      
      // Mock failed response
      const mockEnd = jest.fn();
      mockResponse.end = mockEnd;
      mockResponse.statusCode = 400;
      
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Simulate response end
      const originalEnd = mockResponse.end as jest.Mock;
      originalEnd.call(mockResponse);
      
      // Second request should still pass because first failed
      jest.clearAllMocks();
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('predefined rate limiters', () => {
    it('should have correct configuration for default rate limiter', () => {
      rateLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should have correct configuration for strict rate limiter', () => {
      strictRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should have correct configuration for lenient rate limiter', () => {
      lenientRateLimiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', 1000);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('rate limit headers', () => {
    it('should set correct rate limit headers', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
      });
      
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });

    it('should update remaining count correctly', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      });
      
      // First request
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', 2);
      
      // Second request
      jest.clearAllMocks();
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);
      
      // Third request
      jest.clearAllMocks();
      limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
    });
  });
});