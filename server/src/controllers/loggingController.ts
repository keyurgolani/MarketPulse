import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { loggingService } from '@/services/LoggingService';
import { logger } from '@/utils/logger';

export const getLogFiles = asyncHandler(async (req: Request, res: Response) => {
  const logFiles = await loggingService.getLogFiles();

  logger.info('Log files accessed', {
    requestId: (req as Request & { id?: string }).id,
    fileCount: logFiles.length,
  });

  res.json({
    success: true,
    data: {
      files: logFiles,
      count: logFiles.length,
    },
    timestamp: new Date().toISOString(),
  });
});

export const getLogFile = asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  const { level, category, startDate, endDate, search, limit, offset } =
    req.query;

  if (!filename) {
    res.status(400).json({
      success: false,
      error: 'Filename is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const query: Record<string, unknown> = {};
  if (level) query.level = level as string;
  if (category) query.category = category as string;
  if (startDate) query.startDate = new Date(startDate as string);
  if (endDate) query.endDate = new Date(endDate as string);
  if (search) query.search = search as string;

  // Validate and set limit
  if (limit) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 1000',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    query.limit = limitNum;
  }

  // Validate and set offset
  if (offset) {
    const offsetNum = parseInt(offset as string, 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      res.status(400).json({
        success: false,
        error: 'Offset must be a non-negative integer',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    query.offset = offsetNum;
  }

  try {
    const result = await loggingService.readLogFile(filename, query);

    logger.info('Log file accessed', {
      requestId: (req as Request & { id?: string }).id,
      filename,
      query,
      resultCount: result.entries.length,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error reading log file ${filename}:`, error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: `Log file ${filename} not found`,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    throw error;
  }
});

export const searchLogs = asyncHandler(async (req: Request, res: Response) => {
  const { level, category, startDate, endDate, search, limit, offset } =
    req.query;

  const query: Record<string, unknown> = {};
  if (level) query.level = level as string;
  if (category) query.category = category as string;
  if (startDate) query.startDate = new Date(startDate as string);
  if (endDate) query.endDate = new Date(endDate as string);
  if (search) query.search = search as string;

  // Validate and set limit
  if (limit) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 1000',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    query.limit = limitNum;
  }

  // Validate and set offset
  if (offset) {
    const offsetNum = parseInt(offset as string, 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      res.status(400).json({
        success: false,
        error: 'Offset must be a non-negative integer',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    query.offset = offsetNum;
  }

  const result = await loggingService.searchLogs(query);

  logger.info('Logs searched', {
    requestId: (req as Request & { id?: string }).id,
    query,
    resultCount: result.entries.length,
  });

  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  });
});

export const getLogStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await loggingService.getLogStats();

  logger.info('Log stats accessed', {
    requestId: (req as Request & { id?: string }).id,
  });

  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

export const cleanupLogs = asyncHandler(async (req: Request, res: Response) => {
  const { maxAge, maxSize, maxFiles } = req.body;

  const options: Record<string, unknown> = {};

  // Validate and set maxAge
  if (maxAge) {
    const maxAgeNum = parseInt(maxAge, 10);
    if (isNaN(maxAgeNum) || maxAgeNum < 1) {
      res.status(400).json({
        success: false,
        error: 'maxAge must be a positive integer (days)',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    options.maxAge = maxAgeNum;
  }

  // Validate and set maxSize
  if (maxSize) {
    const maxSizeNum = parseInt(maxSize, 10);
    if (isNaN(maxSizeNum) || maxSizeNum < 1) {
      res.status(400).json({
        success: false,
        error: 'maxSize must be a positive integer (bytes)',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    options.maxSize = maxSizeNum;
  }

  // Validate and set maxFiles
  if (maxFiles) {
    const maxFilesNum = parseInt(maxFiles, 10);
    if (isNaN(maxFilesNum) || maxFilesNum < 1) {
      res.status(400).json({
        success: false,
        error: 'maxFiles must be a positive integer',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    options.maxFiles = maxFilesNum;
  }

  const result = await loggingService.cleanupLogs(options);

  logger.info('Log cleanup performed', {
    requestId: (req as Request & { id?: string }).id,
    options,
    deletedFiles: result.deletedFiles.length,
    freedSpace: result.freedSpace,
  });

  res.json({
    success: true,
    message: `Cleaned up ${result.deletedFiles.length} log files, freed ${Math.round((result.freedSpace / 1024 / 1024) * 100) / 100} MB`,
    data: result,
    timestamp: new Date().toISOString(),
  });
});

export const archiveLogs = asyncHandler(async (req: Request, res: Response) => {
  const { maxAge } = req.body;
  const maxAgeNum = maxAge ? parseInt(maxAge, 10) : 30;

  if (isNaN(maxAgeNum) || maxAgeNum < 1) {
    res.status(400).json({
      success: false,
      error: 'maxAge must be a positive integer (days)',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = await loggingService.archiveLogs(maxAgeNum);

  logger.info('Log archival performed', {
    requestId: (req as Request & { id?: string }).id,
    maxAge: maxAgeNum,
    archivedFiles: result.archivedFiles.length,
    archiveSize: result.archiveSize,
  });

  res.json({
    success: true,
    message: `Archived ${result.archivedFiles.length} log files, total size ${Math.round((result.archiveSize / 1024 / 1024) * 100) / 100} MB`,
    data: result,
    timestamp: new Date().toISOString(),
  });
});

export const downloadLogFile = asyncHandler(
  async (req: Request, res: Response) => {
    const { filename } = req.params;

    if (!filename) {
      res.status(400).json({
        success: false,
        error: 'Filename is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const logFiles = await loggingService.getLogFiles();
    const logFile = logFiles.find(f => f.name === filename);

    if (!logFile) {
      res.status(404).json({
        success: false,
        error: `Log file ${filename} not found`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info('Log file downloaded', {
      requestId: (req as Request & { id?: string }).id,
      filename,
      size: logFile.size,
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(logFile.path);
  }
);
