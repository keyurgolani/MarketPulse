/**
 * Base Widget Factory
 * Abstract base class for all widget factories
 */

import type {
  Widget,
  WidgetType,
  WidgetFactory,
  WidgetMetadata,
  WidgetConfig,
  WidgetPosition,
  WidgetSize,
} from '@/types/widget';

export abstract class BaseWidgetFactory implements WidgetFactory {
  abstract readonly type: WidgetType;

  /**
   * Create a new widget instance
   */
  create(config: Partial<WidgetConfig> = {}): Widget {
    const defaultConfig = this.getDefaultConfig();
    const mergedConfig = { ...defaultConfig, ...config };

    // Validate the merged configuration
    if (!this.validate(mergedConfig)) {
      throw new Error(`Invalid configuration for widget type: ${this.type}`);
    }

    const widget: Widget = {
      id: this.generateId(),
      type: this.type,
      title: this.getDefaultTitle(),
      config: mergedConfig,
      position: this.getDefaultPosition(),
      size: this.getDefaultSize(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isVisible: true,
      isLoading: false,
    };

    return widget;
  }

  /**
   * Validate widget configuration
   */
  validate(config: WidgetConfig): boolean {
    try {
      // Basic validation - subclasses can override for specific validation
      if (!config || typeof config !== 'object') {
        return false;
      }

      // Validate refresh interval if present
      if (
        config.refreshInterval !== undefined &&
        (typeof config.refreshInterval !== 'number' ||
          config.refreshInterval < 1000)
      ) {
        return false;
      }

      // Validate assets array if present
      if (config.assets !== undefined) {
        if (!Array.isArray(config.assets)) {
          return false;
        }
        // Check that all assets are strings
        if (!config.assets.every(asset => typeof asset === 'string')) {
          return false;
        }
      }

      return this.validateSpecific(config);
    } catch (error) {
      console.error(`Validation error for ${this.type}:`, error);
      return false;
    }
  }

  /**
   * Get default configuration
   */
  abstract getDefaultConfig(): WidgetConfig;

  /**
   * Get widget metadata
   */
  abstract getMetadata(): WidgetMetadata;

  /**
   * Widget-specific validation (override in subclasses)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected validateSpecific(_config: WidgetConfig): boolean {
    // Default implementation - always valid
    return true;
  }

  /**
   * Get default widget title
   */
  protected getDefaultTitle(): string {
    const metadata = this.getMetadata();
    return metadata.name;
  }

  /**
   * Get default widget position
   */
  protected getDefaultPosition(): WidgetPosition {
    return {
      x: 0,
      y: 0,
      w: 4,
      h: 3,
    };
  }

  /**
   * Get default widget size constraints
   */
  protected getDefaultSize(): WidgetSize {
    return {
      minW: 2,
      minH: 2,
      maxW: 12,
      maxH: 8,
      resizable: true,
    };
  }

  /**
   * Generate unique widget ID
   */
  protected generateId(): string {
    return `${this.type}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Merge configurations with deep merge for nested objects
   */
  protected mergeConfigs(
    defaultConfig: WidgetConfig,
    userConfig: Partial<WidgetConfig>
  ): WidgetConfig {
    const merged = { ...defaultConfig };

    for (const [key, value] of Object.entries(userConfig)) {
      if (value !== undefined) {
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          typeof merged[key as keyof WidgetConfig] === 'object' &&
          merged[key as keyof WidgetConfig] !== null &&
          !Array.isArray(merged[key as keyof WidgetConfig])
        ) {
          // Deep merge for nested objects
          (merged as Record<string, unknown>)[key] = {
            ...((merged as Record<string, unknown>)[key] as Record<
              string,
              unknown
            >),
            ...(value as Record<string, unknown>),
          };
        } else {
          // Direct assignment for primitives and arrays
          (merged as Record<string, unknown>)[key] = value;
        }
      }
    }

    return merged;
  }

  /**
   * Validate array of strings
   */
  protected validateStringArray(
    value: unknown,
    fieldName: string
  ): value is string[] {
    if (!Array.isArray(value)) {
      console.warn(`${fieldName} must be an array`);
      return false;
    }

    if (!value.every(item => typeof item === 'string')) {
      console.warn(`All items in ${fieldName} must be strings`);
      return false;
    }

    return true;
  }

  /**
   * Validate number within range
   */
  protected validateNumberRange(
    value: unknown,
    fieldName: string,
    min?: number,
    max?: number
  ): value is number {
    if (typeof value !== 'number') {
      console.warn(`${fieldName} must be a number`);
      return false;
    }

    if (min !== undefined && value < min) {
      console.warn(`${fieldName} must be at least ${min}`);
      return false;
    }

    if (max !== undefined && value > max) {
      console.warn(`${fieldName} must be at most ${max}`);
      return false;
    }

    return true;
  }

  /**
   * Validate enum value
   */
  protected validateEnum<T extends string>(
    value: unknown,
    fieldName: string,
    validValues: readonly T[]
  ): value is T {
    if (typeof value !== 'string') {
      console.warn(`${fieldName} must be a string`);
      return false;
    }

    if (!validValues.includes(value as T)) {
      console.warn(`${fieldName} must be one of: ${validValues.join(', ')}`);
      return false;
    }

    return true;
  }
}
