import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate a unique request ID
  const requestId = randomUUID();

  // Add to request object
  (req as Request & { id: string }).id = requestId;

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  next();
};
