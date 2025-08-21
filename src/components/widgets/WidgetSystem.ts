/**
 * Widget System
 * Initializes and manages the widget framework
 */

import { widgetRegistry } from './WidgetRegistry';
import {
  AssetListWidgetFactory,
  AssetGridWidgetFactory,
  PriceChartWidgetFactory,
  WatchlistWidgetFactory,
  NewsFeedWidgetFactory,
  MarketSummaryWidgetFactory,
} from './factories';

export class WidgetSystem {
  private static instance: WidgetSystem | null = null;
  private initialized = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WidgetSystem {
    if (!WidgetSystem.instance) {
      WidgetSystem.instance = new WidgetSystem();
    }
    return WidgetSystem.instance;
  }

  /**
   * Initialize the widget system
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('Widget system already initialized');
      return;
    }

    try {
      // Register all built-in widget factories
      this.registerBuiltInWidgets();

      this.initialized = true;
      console.log('Widget system initialized successfully');
      console.log(`Registered ${widgetRegistry.getWidgetCount()} widget types`);
    } catch (error) {
      console.error('Failed to initialize widget system:', error);
      throw error;
    }
  }

  /**
   * Register all built-in widget factories
   */
  private registerBuiltInWidgets(): void {
    const factories = [
      new AssetListWidgetFactory(),
      new AssetGridWidgetFactory(),
      new PriceChartWidgetFactory(),
      new WatchlistWidgetFactory(),
      new NewsFeedWidgetFactory(),
      new MarketSummaryWidgetFactory(),
    ];

    for (const factory of factories) {
      try {
        widgetRegistry.register(factory);
        console.log(`Registered widget factory: ${factory.type}`);
      } catch (error) {
        console.error(
          `Failed to register widget factory ${factory.type}:`,
          error
        );
      }
    }
  }

  /**
   * Check if system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get widget registry
   */
  getRegistry(): typeof widgetRegistry {
    return widgetRegistry;
  }

  /**
   * Destroy the widget system
   */
  destroy(): void {
    widgetRegistry.clear();
    this.initialized = false;
    WidgetSystem.instance = null;
    console.log('Widget system destroyed');
  }

  /**
   * Get system status
   */
  getStatus(): {
    initialized: boolean;
    registeredWidgets: number;
    availableTypes: string[];
  } {
    return {
      initialized: this.initialized,
      registeredWidgets: widgetRegistry.getWidgetCount(),
      availableTypes: widgetRegistry.getRegisteredTypes(),
    };
  }
}

/**
 * Initialize widget system on module load
 */
export function initializeWidgetSystem(): void {
  const widgetSystem = WidgetSystem.getInstance();
  if (!widgetSystem.isInitialized()) {
    widgetSystem.initialize();
  }
}

/**
 * Get widget system instance
 */
export function getWidgetSystem(): WidgetSystem {
  return WidgetSystem.getInstance();
}

/**
 * Auto-initialize on import (can be disabled if needed)
 */
if (typeof window !== 'undefined') {
  // Only initialize in browser environment
  initializeWidgetSystem();
}
