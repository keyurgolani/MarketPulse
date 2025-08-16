import { logger } from '@/utils/logger';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  stack?: string;
}

export interface LogFile {
  name: string;
  path: string;
  size: number;
  modified: Date;
  lines: number;
}

export interface LogQuery {
  level?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LogQueryResult {
  entries: LogEntry[];
  total: number;
  hasMore: boolean;
}

export class LoggingService {
  private static instance: LoggingService;
  private logsDir: string;

  private constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Get list of available log files
   */
  public async getLogFiles(): Promise<LogFile[]> {
    try {
      if (!fs.existsSync(this.logsDir)) {
        return [];
      }

      const files = await readdir(this.logsDir);
      const logFiles: LogFile[] = [];

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logsDir, file);
          const stats = await stat(filePath);
          
          // Count lines in file
          const content = await readFile(filePath, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim()).length;

          logFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
            lines,
          });
        }
      }

      // Sort by modification date (newest first)
      return logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      logger.error('Error getting log files:', error);
      return [];
    }
  }

  /**
   * Read and parse log entries from a file
   */
  public async readLogFile(filename: string, query?: LogQuery): Promise<LogQueryResult> {
    try {
      const filePath = path.join(this.logsDir, filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Log file ${filename} not found`);
      }

      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      const entries: LogEntry[] = [];

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          
          // Apply filters
          if (query) {
            if (query.level && entry.level !== query.level) continue;
            if (query.category && (!entry.meta || entry.meta.category !== query.category)) continue;
            if (query.startDate && new Date(entry.timestamp) < query.startDate) continue;
            if (query.endDate && new Date(entry.timestamp) > query.endDate) continue;
            if (query.search && !this.matchesSearch(entry, query.search)) continue;
          }

          entries.push(entry);
        } catch (parseError) {
          // Skip invalid JSON lines
          continue;
        }
      }

      // Sort by timestamp (newest first)
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const offset = query?.offset || 0;
      const limit = query?.limit || 100;
      const paginatedEntries = entries.slice(offset, offset + limit);

      return {
        entries: paginatedEntries,
        total: entries.length,
        hasMore: offset + limit < entries.length,
      };
    } catch (error) {
      logger.error(`Error reading log file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Search across all log files
   */
  public async searchLogs(query: LogQuery): Promise<LogQueryResult> {
    try {
      const logFiles = await this.getLogFiles();
      const allEntries: LogEntry[] = [];

      for (const file of logFiles) {
        try {
          const result = await this.readLogFile(file.name, query);
          allEntries.push(...result.entries);
        } catch (error) {
          logger.warn(`Error reading log file ${file.name}:`, error);
          continue;
        }
      }

      // Sort all entries by timestamp (newest first)
      allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      const paginatedEntries = allEntries.slice(offset, offset + limit);

      return {
        entries: paginatedEntries,
        total: allEntries.length,
        hasMore: offset + limit < allEntries.length,
      };
    } catch (error) {
      logger.error('Error searching logs:', error);
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  public async getLogStats(): Promise<{
    files: number;
    totalSize: number;
    totalLines: number;
    oldestEntry?: Date;
    newestEntry?: Date;
    levelCounts: Record<string, number>;
    categoryCounts: Record<string, number>;
  }> {
    try {
      const logFiles = await this.getLogFiles();
      let totalSize = 0;
      let totalLines = 0;
      let oldestEntry: Date | undefined;
      let newestEntry: Date | undefined;
      const levelCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};

      for (const file of logFiles) {
        totalSize += file.size;
        totalLines += file.lines;

        // Sample entries from each file for statistics
        try {
          const result = await this.readLogFile(file.name, { limit: 1000 });
          for (const entry of result.entries) {
            const entryDate = new Date(entry.timestamp);
            if (!oldestEntry || entryDate < oldestEntry) {
              oldestEntry = entryDate;
            }
            if (!newestEntry || entryDate > newestEntry) {
              newestEntry = entryDate;
            }

            // Count levels
            levelCounts[entry.level] = (levelCounts[entry.level] || 0) + 1;

            // Count categories
            if (entry.meta?.category) {
              categoryCounts[entry.meta.category] = (categoryCounts[entry.meta.category] || 0) + 1;
            }
          }
        } catch (error) {
          logger.warn(`Error processing stats for ${file.name}:`, error);
        }
      }

      const result: any = {
        files: logFiles.length,
        totalSize,
        totalLines,
        levelCounts,
        categoryCounts,
      };
      
      if (oldestEntry) result.oldestEntry = oldestEntry;
      if (newestEntry) result.newestEntry = newestEntry;
      
      return result;
    } catch (error) {
      logger.error('Error getting log stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old log files
   */
  public async cleanupLogs(options: {
    maxAge?: number; // days
    maxSize?: number; // bytes
    maxFiles?: number;
  }): Promise<{
    deletedFiles: string[];
    freedSpace: number;
  }> {
    try {
      const logFiles = await this.getLogFiles();
      const deletedFiles: string[] = [];
      let freedSpace = 0;

      // Sort by modification date (oldest first)
      const sortedFiles = [...logFiles].sort((a, b) => a.modified.getTime() - b.modified.getTime());

      for (const file of sortedFiles) {
        let shouldDelete = false;

        // Check age
        if (options.maxAge) {
          const ageInDays = (Date.now() - file.modified.getTime()) / (1000 * 60 * 60 * 24);
          if (ageInDays > options.maxAge) {
            shouldDelete = true;
          }
        }

        // Check total size
        if (options.maxSize) {
          const totalSize = logFiles.reduce((sum, f) => sum + f.size, 0);
          if (totalSize > options.maxSize) {
            shouldDelete = true;
          }
        }

        // Check file count
        if (options.maxFiles && logFiles.length > options.maxFiles) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          try {
            fs.unlinkSync(file.path);
            deletedFiles.push(file.name);
            freedSpace += file.size;
            logger.info(`Deleted old log file: ${file.name}`, {
              size: file.size,
              age: Math.round((Date.now() - file.modified.getTime()) / (1000 * 60 * 60 * 24)),
            });
          } catch (error) {
            logger.error(`Error deleting log file ${file.name}:`, error);
          }
        }
      }

      return { deletedFiles, freedSpace };
    } catch (error) {
      logger.error('Error cleaning up logs:', error);
      throw error;
    }
  }

  /**
   * Archive old logs
   */
  public async archiveLogs(maxAge: number = 30): Promise<{
    archivedFiles: string[];
    archiveSize: number;
  }> {
    try {
      const logFiles = await this.getLogFiles();
      const archivedFiles: string[] = [];
      let archiveSize = 0;

      const archiveDir = path.join(this.logsDir, 'archive');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      for (const file of logFiles) {
        const ageInDays = (Date.now() - file.modified.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays > maxAge) {
          const archivePath = path.join(archiveDir, `${Date.now()}_${file.name}`);
          try {
            fs.renameSync(file.path, archivePath);
            archivedFiles.push(file.name);
            archiveSize += file.size;
            logger.info(`Archived log file: ${file.name}`, {
              archivePath,
              size: file.size,
              age: Math.round(ageInDays),
            });
          } catch (error) {
            logger.error(`Error archiving log file ${file.name}:`, error);
          }
        }
      }

      return { archivedFiles, archiveSize };
    } catch (error) {
      logger.error('Error archiving logs:', error);
      throw error;
    }
  }

  /**
   * Check if entry matches search criteria
   */
  private matchesSearch(entry: LogEntry, search: string): boolean {
    const searchLower = search.toLowerCase();
    
    // Search in message
    if (entry.message.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search in meta data
    if (entry.meta) {
      const metaString = JSON.stringify(entry.meta).toLowerCase();
      if (metaString.includes(searchLower)) {
        return true;
      }
    }

    // Search in stack trace
    if (entry.stack && entry.stack.toLowerCase().includes(searchLower)) {
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const loggingService = LoggingService.getInstance();