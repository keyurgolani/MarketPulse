import { Database, createDatabase } from '../../config/database';
import { UserRepository } from '../../repositories/UserRepository';
import { MigrationRunner } from '../../migrations/MigrationRunner';
import { InitialSchemaMigration } from '../../migrations/001_initial_schema';
import { UserPreferences } from '../../types/database';
import fs from 'fs';

describe('UserRepository', () => {
  let db: Database;
  let userRepository: UserRepository;
  const testDbPath = './test-user-repo.sqlite';

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    db = createDatabase({ filename: testDbPath });
    await db.connect();

    // Run migrations
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.addMigration(new InitialSchemaMigration());
    await migrationRunner.runMigrations();

    userRepository = new UserRepository(db);
  });

  afterAll(async () => {
    await db.disconnect();

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(async () => {
    // Clean up users table before each test
    await db.run('DELETE FROM users');
  });

  describe('create', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const user = await userRepository.create(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.first_name).toBe(userData.first_name);
      expect(user.last_name).toBe(userData.last_name);
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(userData.password);
      expect(user.created_at).toBeDefined();
    });

    it('should create user with preferences', async () => {
      const preferences: UserPreferences = {
        theme: 'dark',
        refreshInterval: 30000,
        notifications: {
          priceAlerts: true,
          newsUpdates: false,
          systemStatus: true,
        },
        accessibility: {
          reduceMotion: false,
          highContrast: false,
          screenReader: false,
        },
      };

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        preferences,
      };

      const user = await userRepository.create(userData);
      expect(user.preferences).toBeDefined();

      const parsedPreferences = JSON.parse(user.preferences ?? '{}');
      expect(parsedPreferences.theme).toBe('dark');
      expect(parsedPreferences.refreshInterval).toBe(30000);
    });

    it('should throw error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
      };

      await expect(userRepository.create(userData)).rejects.toThrow();
    });

    it('should throw error for short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
      };

      await expect(userRepository.create(userData)).rejects.toThrow();
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      await userRepository.create(userData);
      await expect(userRepository.create(userData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent id', async () => {
      const user = await userRepository.findById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      await userRepository.create(userData);
      const foundUser = await userRepository.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent email', async () => {
      const user = await userRepository.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
      };

      const createdUser = await userRepository.create(userData);

      const updateData = {
        first_name: 'Jane',
        last_name: 'Smith',
      };

      const updatedUser = await userRepository.update(
        createdUser.id,
        updateData
      );

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.first_name).toBe('Jane');
      expect(updatedUser?.last_name).toBe('Smith');
      expect(updatedUser?.email).toBe(userData.email); // Should remain unchanged
    });

    it('should return null for non-existent user', async () => {
      const result = await userRepository.update('non-existent-id', {
        first_name: 'Test',
      });
      expect(result).toBeNull();
    });
  });

  describe('password operations', () => {
    let userId: string;

    beforeEach(async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };
      const user = await userRepository.create(userData);
      userId = user.id;
    });

    it('should verify correct password', async () => {
      const isValid = await userRepository.verifyPassword(
        userId,
        'password123'
      );
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await userRepository.verifyPassword(
        userId,
        'wrongpassword'
      );
      expect(isValid).toBe(false);
    });

    it('should verify password by email', async () => {
      const user = await userRepository.verifyPasswordByEmail(
        'test@example.com',
        'password123'
      );
      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
    });

    it('should return null for incorrect email/password combination', async () => {
      const user = await userRepository.verifyPasswordByEmail(
        'test@example.com',
        'wrongpassword'
      );
      expect(user).toBeNull();
    });

    it('should update password', async () => {
      const newPassword = 'newpassword456';
      const updatedUser = await userRepository.updatePassword(
        userId,
        newPassword
      );

      expect(updatedUser).toBeDefined();

      // Verify old password no longer works
      const oldPasswordValid = await userRepository.verifyPassword(
        userId,
        'password123'
      );
      expect(oldPasswordValid).toBe(false);

      // Verify new password works
      const newPasswordValid = await userRepository.verifyPassword(
        userId,
        newPassword
      );
      expect(newPasswordValid).toBe(true);
    });
  });

  describe('preferences', () => {
    let userId: string;

    beforeEach(async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };
      const user = await userRepository.create(userData);
      userId = user.id;
    });

    it('should get user preferences', async () => {
      const preferences: UserPreferences = {
        theme: 'dark',
        refreshInterval: 60000,
        notifications: {
          priceAlerts: true,
          newsUpdates: true,
          systemStatus: false,
        },
        accessibility: {
          reduceMotion: true,
          highContrast: false,
          screenReader: false,
        },
      };

      await userRepository.updatePreferences(userId, preferences);
      const retrievedPreferences =
        await userRepository.getUserPreferences(userId);

      expect(retrievedPreferences).toEqual(preferences);
    });

    it('should return null for user with no preferences', async () => {
      const preferences = await userRepository.getUserPreferences(userId);
      expect(preferences).toBeNull();
    });

    it('should update user preferences', async () => {
      const preferences: UserPreferences = {
        theme: 'light',
        refreshInterval: 30000,
        notifications: {
          priceAlerts: false,
          newsUpdates: true,
          systemStatus: true,
        },
        accessibility: {
          reduceMotion: false,
          highContrast: true,
          screenReader: false,
        },
      };

      const updatedUser = await userRepository.updatePreferences(
        userId,
        preferences
      );
      expect(updatedUser).toBeDefined();

      const retrievedPreferences =
        await userRepository.getUserPreferences(userId);
      expect(retrievedPreferences).toEqual(preferences);
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      // Create test users
      await userRepository.create({
        email: 'john@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      });

      await userRepository.create({
        email: 'jane@example.com',
        password: 'password123',
        first_name: 'Jane',
        last_name: 'Smith',
      });
    });

    it('should check if email exists', async () => {
      const exists = await userRepository.emailExists('john@example.com');
      expect(exists).toBe(true);

      const notExists = await userRepository.emailExists(
        'nonexistent@example.com'
      );
      expect(notExists).toBe(false);
    });

    it('should search users', async () => {
      const results = await userRepository.searchUsers('john');
      expect(results).toHaveLength(1);
      expect(results[0]?.first_name).toBe('John');

      const emailResults = await userRepository.searchUsers('jane@example.com');
      expect(emailResults).toHaveLength(1);
      expect(emailResults[0]?.email).toBe('jane@example.com');
    });

    it('should get user count', async () => {
      const count = await userRepository.getUserCount();
      expect(count).toBe(2);
    });

    it('should find all users', async () => {
      const users = await userRepository.findAll();
      expect(users).toHaveLength(2);
    });

    it('should find users with pagination', async () => {
      const result = await userRepository.findAllPaginated({
        page: 1,
        limit: 1,
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = await userRepository.create(userData);
      const deleted = await userRepository.delete(user.id);

      expect(deleted).toBe(true);

      const foundUser = await userRepository.findById(user.id);
      expect(foundUser).toBeNull();
    });

    it('should return false for non-existent user', async () => {
      const deleted = await userRepository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });
});
