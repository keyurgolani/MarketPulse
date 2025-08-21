/**
 * Widget Registry System
 * Manages widget types, factories, and metadata for dynamic widget creation
 */

import type {
  Widget,
  WidgetType,
  WidgetFactory,
  WidgetMetadata,
  WidgetConfig,
} from '@/types/widget';

export class WidgetRegistry {
  private factories = new Map<WidgetType, WidgetFactory>();
  private metadata = new Map<WidgetType, WidgetMetadata>();

  /**
   * Register a widget factory
   */
  register(factory: WidgetFactory): void {
    this.factories.set(factory.type, factory);
    this.metadata.set(factory.type, factory.getMetadata());
  }

  /**
   * Unregister a widget factory
   */
  unregister(type: WidgetType): void {
    this.factories.delete(type);
    this.metadata.delete(type);
  }

  /**
   * Get widget factory by type
   */
  getFactory(type: WidgetType): WidgetFactory | undefined {
    return this.factories.get(type);
  }

  /**
   * Get widget metadata by type
   */
  getMetadata(type: WidgetType): WidgetMetadata | undefined {
    return this.metadata.get(type);
  }

  /**
   * Get all registered widget types
   */
  getRegisteredTypes(): WidgetType[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get all widget metadata
   */
  getAllMetadata(): WidgetMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Create widget instance
   */
  createWidget(
    type: WidgetType,
    config: Partial<WidgetConfig> = {}
  ): Widget | null {
    const factory = this.getFactory(type);
    if (!factory) {
      console.error(`Widget factory not found for type: ${type}`);
      return null;
    }

    try {
      return factory.create(config);
    } catch (error) {
      console.error(`Failed to create widget of type ${type}:`, error);
      return null;
    }
  }

  /**
   * Validate widget configuration
   */
  validateConfig(type: WidgetType, config: WidgetConfig): boolean {
    const factory = this.getFactory(type);
    if (!factory) {
      return false;
    }

    try {
      return factory.validate(config);
    } catch (error) {
      console.error(`Failed to validate config for ${type}:`, error);
      return false;
    }
  }

  /**
   * Get default configuration for widget type
   */
  getDefaultConfig(type: WidgetType): WidgetConfig | null {
    const factory = this.getFactory(type);
    if (!factory) {
      return null;
    }

    try {
      return factory.getDefaultConfig();
    } catch (error) {
      console.error(`Failed to get default config for ${type}:`, error);
      return null;
    }
  }

  /**
   * Check if widget type is registered
   */
  isRegistered(type: WidgetType): boolean {
    return this.factories.has(type);
  }

  /**
   * Get widgets by category
   */
  getWidgetsByCategory(category: string): WidgetMetadata[] {
    return Array.from(this.metadata.values()).filter(
      meta => meta.category === category
    );
  }

  /**
   * Search widgets by tag
   */
  searchWidgetsByTag(tag: string): WidgetMetadata[] {
    return Array.from(this.metadata.values()).filter(meta =>
      meta.tags.includes(tag)
    );
  }

  /**
   * Get widget count
   */
  getWidgetCount(): number {
    return this.factories.size;
  }

  /**
   * Clear all registered widgets
   */
  clear(): void {
    this.factories.clear();
    this.metadata.clear();
  }
}

/**
 * Global widget registry instance
 */
export const widgetRegistry = new WidgetRegistry();
