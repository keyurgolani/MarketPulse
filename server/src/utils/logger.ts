/**
 * Logging Utility
 * Centralized logging configuration using Winston
 */

import winston from 'winston';
import path from 'path';
import { config } from '../config/environment';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: logFormat,
  }),

  // File transport for errors
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  levels: logLevels,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const loggerStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

// Helper functions for different log levels
export const logError = (message: string, error?: Error | unknown): void => {
  if (error instanceof Error) {
    logger.error(`${message}: ${error.message}`, { stack: error.stack });
  } else {
    logger.error(message, { error });
  }
};

export const logWarn = (message: string, meta?: unknown): void => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: unknown): void => {
  logger.info(message, meta);
};

export const logHttp = (message: string, meta?: unknown): void => {
  logger.http(message, meta);
};

export const logDebug = (message: string, meta?: unknown): void => {
  logger.debug(message, meta);
};

export default logger;
