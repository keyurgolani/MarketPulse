import { Response } from 'express';

// Standard API response interface
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: number;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

// Pagination metadata interface
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
}

// Success response helper
export const successResponse = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  metadata?: Partial<PaginationMetadata>
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: Date.now(),
  };

  if (metadata) {
    response.metadata = metadata;
  }

  return res.status(statusCode).json(response);
};

// Error response helper
export const errorResponse = (
  res: Response,
  error: string,
  statusCode: number = 500,
  code?: string
): Response => {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: Date.now(),
    ...(code && { code }),
  };

  return res.status(statusCode).json(response);
};

// Paginated response helper
export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  statusCode: number = 200
): Response => {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);

  const metadata: PaginationMetadata = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return successResponse(res, data, statusCode, metadata);
};

// Created response helper (201)
export const createdResponse = <T>(
  res: Response,
  data: T,
  _message?: string
): Response => {
  return successResponse(res, data, 201);
};

// No content response helper (204)
export const noContentResponse = (res: Response): Response => {
  return res.status(204).send();
};

// Not found response helper (404)
export const notFoundResponse = (
  res: Response,
  resource: string = 'Resource'
): Response => {
  return errorResponse(res, `${resource} not found`, 404, 'NOT_FOUND');
};

// Bad request response helper (400)
export const badRequestResponse = (
  res: Response,
  message: string = 'Bad request'
): Response => {
  return errorResponse(res, message, 400, 'BAD_REQUEST');
};

// Unauthorized response helper (401)
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return errorResponse(res, message, 401, 'UNAUTHORIZED');
};

// Forbidden response helper (403)
export const forbiddenResponse = (
  res: Response,
  message: string = 'Forbidden'
): Response => {
  return errorResponse(res, message, 403, 'FORBIDDEN');
};

// Conflict response helper (409)
export const conflictResponse = (
  res: Response,
  message: string = 'Conflict'
): Response => {
  return errorResponse(res, message, 409, 'CONFLICT');
};

// Unprocessable entity response helper (422)
export const unprocessableEntityResponse = (
  res: Response,
  message: string = 'Unprocessable entity'
): Response => {
  return errorResponse(res, message, 422, 'UNPROCESSABLE_ENTITY');
};

// Too many requests response helper (429)
export const tooManyRequestsResponse = (
  res: Response,
  message: string = 'Too many requests'
): Response => {
  return errorResponse(res, message, 429, 'TOO_MANY_REQUESTS');
};

// Internal server error response helper (500)
export const internalServerErrorResponse = (
  res: Response,
  message: string = 'Internal server error'
): Response => {
  return errorResponse(res, message, 500, 'INTERNAL_SERVER_ERROR');
};

// Service unavailable response helper (503)
export const serviceUnavailableResponse = (
  res: Response,
  message: string = 'Service unavailable'
): Response => {
  return errorResponse(res, message, 503, 'SERVICE_UNAVAILABLE');
};
