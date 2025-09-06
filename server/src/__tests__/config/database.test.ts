import { Database, createDatabase } from '../../config/database';
import fs from 'fs';
import path from 'path';

describe('Database', () => {
  let testDb: Database;
  const testDbPath = './test-db.sqlite';

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    testDb = createDatabase({ filename: testDbPath });
    await testDb.connect();
  });

  afterEach(async () => {
    await testDb.disconnect();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('connection', () => {
    it('should connect to database successfully', async () => {
      const db = createDatabase({ filename: testDbPath });
      await expect(db.connect()).resolves.not.toThrow();
      await db.disconnect();
    });

    it('should create database file if it does not exist', async () => {
      const newDbPath = './new-test-db.sqlite';
      
      // Ensure file doesn't exist
      if (fs.existsSync(newDbPath)) {
        fs.unlinkSync(newDbPath);
      }

      const db = createDatabase({ filename: newDbPath });
      await db.connect();
      
      expect(fs.existsSync(newDbPath)).toBe(true);
      
      await db.disconnect();
      fs.unlinkSync(newDbPath);
    });

    it('should create data directory if it does not exist', async () => {
      const dirPath = './test-data';
      const dbPath = path.join(dirPath, 'test.db');
      
      // Ensure directory doesn't exist
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true });
      }

      const db = createDatabase({ filename: dbPath });
      await db.connect();
      
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.existsSync(dbPath)).toBe(true);
      
      await db.disconnect();
      fs.rmSync(dirPath, { recursive: true });
    });
  });

  describe('basic operations', () => {
    beforeEach(async () => {
      // Create a test table
      await testDb.exec(`
        CREATE TABLE test_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER
        )
      `);
    });

    it('should execute SQL statements', async () => {
      await expect(testDb.exec('CREATE TABLE temp_table (id INTEGER)')).resolves.not.toThrow();
    });

    it('should run INSERT statements and return result', async () => {
      const result = await testDb.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test', 42]);
      
      expect(result.lastID).toBeDefined();
      expect(result.changes).toBe(1);
    });

    it('should get single row', async () => {
      await testDb.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test', 42]);
      
      const row = await testDb.get('SELECT * FROM test_table WHERE name = ?', ['test']);
      
      expect(row).toBeDefined();
      expect(row.name).toBe('test');
      expect(row.value).toBe(42);
    });

    it('should get all rows', async () => {
      await testDb.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test1', 1]);
      await testDb.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test2', 2]);
      
      const rows = await testDb.all('SELECT * FROM test_table ORDER BY name');
      
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('test1');
      expect(rows[1].name).toBe('test2');
    });

    it('should return undefined for non-existent row', async () => {
      const row = await testDb.get('SELECT * FROM test_table WHERE name = ?', ['nonexistent']);
      expect(row).toBeUndefined();
    });

    it('should return empty array for no matching rows', async () => {
      const rows = await testDb.all('SELECT * FROM test_table WHERE name = ?', ['nonexistent']);
      expect(rows).toEqual([]);
    });
  });

  describe('transactions', () => {
    beforeEach(async () => {
      await testDb.exec(`
        CREATE TABLE test_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )
      `);
    });

    it('should commit successful transaction', async () => {
      const result = await testDb.transaction(async (db) => {
        await db.run('INSERT INTO test_table (name) VALUES (?)', ['test1']);
        await db.run('INSERT INTO test_table (name) VALUES (?)', ['test2']);
        return 'success';
      });

      expect(result).toBe('success');
      
      const rows = await testDb.all('SELECT * FROM test_table');
      expect(rows).toHaveLength(2);
    });

    it('should rollback failed transaction', async () => {
      await expect(testDb.transaction(async (db) => {
        await db.run('INSERT INTO test_table (name) VALUES (?)', ['test1']);
        throw new Error('Transaction failed');
      })).rejects.toThrow('Transaction failed');

      const rows = await testDb.all('SELECT * FROM test_table');
      expect(rows).toHaveLength(0);
    });
  });

  describe('health check', () => {
    it('should return healthy status for working database', async () => {
      const health = await testDb.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.error).toBeUndefined();
    });

    it('should return unhealthy status for disconnected database', async () => {
      await testDb.disconnect();
      
      const health = await testDb.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid SQL', async () => {
      await expect(testDb.exec('INVALID SQL')).rejects.toThrow();
    });

    it('should throw error when database not connected', async () => {
      const db = createDatabase({ filename: './disconnected-test.db' });
      
      await expect(db.run('SELECT 1')).rejects.toThrow('Database not connected');
      await expect(db.get('SELECT 1')).rejects.toThrow('Database not connected');
      await expect(db.all('SELECT 1')).rejects.toThrow('Database not connected');
      await expect(db.exec('SELECT 1')).rejects.toThrow('Database not connected');
    });
  });
});