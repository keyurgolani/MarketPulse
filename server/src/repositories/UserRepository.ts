import {
  BaseRepository,
  PaginationOptions,
  PaginatedResult,
} from './BaseRepository';
import { Database } from '../config/database';
import { User, UserPreferences } from '../types/database';
import { CreateUserSchema, UpdateUserSchema } from '../schemas/validation';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;

export class UserRepository extends BaseRepository<User, any, any> {
  constructor(db: Database) {
    super(db, 'users');
  }

  override async findById(id: string): Promise<User | null> {
    return super.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return super.findOneWhere('email = ?', [email]);
  }

  override async findAll(options?: PaginationOptions): Promise<User[]> {
    return super.findAll(options);
  }

  override async findAllPaginated(
    options: PaginationOptions
  ): Promise<PaginatedResult<User>> {
    return super.findAllPaginated(options);
  }

  override async create(data: CreateUserData): Promise<User> {
    try {
      // Validate input data
      const validatedData = CreateUserSchema.parse(data);

      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(
        validatedData.password,
        saltRounds
      );

      // Prepare user data
      const userData = {
        id: uuidv4(),
        email: validatedData.email,
        password_hash,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        preferences: validatedData.preferences
          ? JSON.stringify(validatedData.preferences)
          : undefined,
      };

      return await super.create(userData as any);
    } catch (error) {
      logger.error('Error creating user', { email: data.email, error });
      throw error;
    }
  }

  override async update(
    id: string,
    data: UpdateUserData
  ): Promise<User | null> {
    try {
      // Validate input data
      const validatedData = UpdateUserSchema.parse(data);

      // Prepare update data
      const updateData: any = {};

      if (validatedData.first_name !== undefined) {
        updateData.first_name = validatedData.first_name;
      }
      if (validatedData.last_name !== undefined) {
        updateData.last_name = validatedData.last_name;
      }
      if (validatedData.preferences !== undefined) {
        updateData.preferences = JSON.stringify(validatedData.preferences);
      }

      return await super.update(id, updateData);
    } catch (error) {
      logger.error('Error updating user', { id, error });
      throw error;
    }
  }

  async updatePassword(id: string, newPassword: string): Promise<User | null> {
    try {
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);

      return await super.update(id, { password_hash } as any);
    } catch (error) {
      logger.error('Error updating user password', { id, error });
      throw error;
    }
  }

  async verifyPassword(id: string, password: string): Promise<boolean> {
    try {
      const user = await this.findById(id);
      if (!user) {
        return false;
      }

      return await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      logger.error('Error verifying user password', { id, error });
      return false;
    }
  }

  async verifyPasswordByEmail(
    email: string,
    password: string
  ): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      return isValid ? user : null;
    } catch (error) {
      logger.error('Error verifying user password by email', { email, error });
      return null;
    }
  }

  async getUserPreferences(id: string): Promise<UserPreferences | null> {
    try {
      const user = await this.findById(id);
      if (!user?.preferences) {
        return null;
      }

      return JSON.parse(user.preferences) as UserPreferences;
    } catch (error) {
      logger.error('Error getting user preferences', { id, error });
      return null;
    }
  }

  async updatePreferences(
    id: string,
    preferences: UserPreferences
  ): Promise<User | null> {
    try {
      return await super.update(id, {
        preferences: JSON.stringify(preferences),
      } as any);
    } catch (error) {
      logger.error('Error updating user preferences', { id, error });
      throw error;
    }
  }

  override async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }

  override async exists(id: string): Promise<boolean> {
    return super.exists(id);
  }

  async emailExists(email: string): Promise<boolean> {
    try {
      const user = await this.findByEmail(email);
      return user !== null;
    } catch (error) {
      logger.error('Error checking if email exists', { email, error });
      throw error;
    }
  }

  async searchUsers(
    query: string,
    options?: PaginationOptions
  ): Promise<User[]> {
    try {
      const searchTerm = `%${query}%`;
      return await super.findWhere(
        'email LIKE ? OR first_name LIKE ? OR last_name LIKE ?',
        [searchTerm, searchTerm, searchTerm],
        options
      );
    } catch (error) {
      logger.error('Error searching users', { query, error });
      throw error;
    }
  }

  async getUserCount(): Promise<number> {
    return super.count();
  }
}
