/**
 * Performance Monitoring Service
 * Tracks Core Web Vitals, user experience metrics, and performance optimization
 */

import { logger } from '@/utils/logger';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte

  // Custom metrics
  renderTime?: number;
  apiResponseTime?: number;
  cacheHitRate?: number;
  memoryUsage?: number;
  bundleSize?: number;

  // User experience
  pageLoadTime?: number;
  interactionTime?: number;
  errorRate?: number;

  // Timestamps
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface PerformanceThresholds {
  lcp: { good: number; poor: number };
  fid: { good: number; poor: number };
  cls: { good: number; poor: number };
  fcp: { good: number; poor: number };
  ttfb: { good: number; poor: number };
  renderTime: { good: number; poor: number };
  apiResponseTime: { good: number; poor: number };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  url: string;
  message: string;
}

export interface PerformanceReport {
  summary: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    totalMetrics: number;
    goodMetrics: number;
    poorMetrics: number;
  };
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  recommendations: string[];
  trends: {
    metric: string;
    trend: 'improving' | 'degrading' | 'stable';
    change: number;
  }[];
}

class PerformanceService {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private thresholds: PerformanceThresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
    renderTime: { good: 16, poor: 50 },
    apiResponseTime: { good: 200, poor: 1000 },
  };
  private isMonitoring = false;
  private reportInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupPerformanceObservers();
    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.collectInitialMetrics();
    this.startPeriodicReporting();

    logger.info('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }

    logger.info('Performance monitoring stopped');
  }

  /**
   * Record custom performance metric
   */
  recordMetric(name: string, value: number, url?: string): void {
    const metric: Partial<PerformanceMetrics> = {
      timestamp: Date.now(),
      url: url || window.location.href,
      userAgent: navigator.userAgent,
    };

    // Map custom metrics
    switch (name) {
      case 'renderTime':
        metric.renderTime = value;
        break;
      case 'apiResponseTime':
        metric.apiResponseTime = value;
        break;
      case 'cacheHitRate':
        metric.cacheHitRate = value;
        break;
      case 'memoryUsage':
        metric.memoryUsage = value;
        break;
      case 'bundleSize':
        metric.bundleSize = value;
        break;
      case 'pageLoadTime':
        metric.pageLoadTime = value;
        break;
      case 'interactionTime':
        metric.interactionTime = value;
        break;
      case 'errorRate':
        metric.errorRate = value;
        break;
      default:
        logger.warn('Unknown performance metric', { name, value });
        return;
    }

    this.addMetric(metric as PerformanceMetrics);
    this.checkThresholds(name, value);

    logger.debug('Performance metric recorded', { name, value });
  }

  /**
   * Record API response time
   */
  recordApiResponseTime(url: string, responseTime: number): void {
    this.recordMetric('apiResponseTime', responseTime, url);
  }

  /**
   * Record render time
   */
  recordRenderTime(componentName: string, renderTime: number): void {
    this.recordMetric('renderTime', renderTime);

    logger.debug('Component render time', { componentName, renderTime });
  }

  /**
   * Record cache performance
   */
  recordCachePerformance(hitRate: number, responseTime: number): void {
    this.recordMetric('cacheHitRate', hitRate);
    this.recordMetric('apiResponseTime', responseTime);
  }

  /**
   * Get current performance report
   */
  getPerformanceReport(): PerformanceReport {
    const latestMetrics = this.getLatestMetrics();
    const score = this.calculatePerformanceScore(latestMetrics);
    const grade = this.getPerformanceGrade(score);
    const recommendations = this.generateRecommendations(latestMetrics);
    const trends = this.calculateTrends();

    return {
      summary: {
        score,
        grade,
        totalMetrics: Object.keys(latestMetrics).length - 3, // Exclude timestamp, url, userAgent
        goodMetrics: this.countGoodMetrics(latestMetrics),
        poorMetrics: this.countPoorMetrics(latestMetrics),
      },
      metrics: latestMetrics,
      alerts: this.getRecentAlerts(),
      recommendations,
      trends,
    };
  }

  /**
   * Get performance metrics history
   */
  getMetricsHistory(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get performance alerts
   */
  getAlerts(limit: number = 50): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear performance data
   */
  clearData(): void {
    this.metrics = [];
    this.alerts = [];

    logger.info('Performance data cleared');
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };

    logger.info('Performance thresholds updated', { newThresholds });
  }

  /**
   * Setup performance observers for Core Web Vitals
   */
  private setupPerformanceObservers(): void {
    // Check if Performance Observer is supported
    if (!('PerformanceObserver' in window)) {
      logger.warn('PerformanceObserver not supported');
      return;
    }

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          startTime: number;
        };

        if (lastEntry) {
          this.recordWebVital('lcp', lastEntry.startTime);
        }
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    } catch (error) {
      logger.warn('Failed to setup LCP observer', { error });
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const fidEntry = entry as PerformanceEntry & {
            processingStart: number;
            startTime: number;
          };
          const fid = fidEntry.processingStart - fidEntry.startTime;
          this.recordWebVital('fid', fid);
        });
      });

      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);
    } catch (error) {
      logger.warn('Failed to setup FID observer', { error });
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const clsEntry = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!clsEntry.hadRecentInput) {
            clsValue += clsEntry.value;
          }
        });

        this.recordWebVital('cls', clsValue);
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);
    } catch (error) {
      logger.warn('Failed to setup CLS observer', { error });
    }

    // Navigation timing for TTFB and FCP
    try {
      const navigationObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const navEntry = entry as PerformanceNavigationTiming;

          // Time to First Byte
          const ttfb = navEntry.responseStart - navEntry.requestStart;
          this.recordWebVital('ttfb', ttfb);

          // First Contentful Paint (from paint timing)
          if ('getEntriesByType' in performance) {
            const paintEntries = performance.getEntriesByType('paint');
            const fcpEntry = paintEntries.find(
              entry => entry.name === 'first-contentful-paint'
            );
            if (fcpEntry) {
              this.recordWebVital('fcp', fcpEntry.startTime);
            }
          }
        });
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);
    } catch (error) {
      logger.warn('Failed to setup navigation observer', { error });
    }
  }

  /**
   * Record Web Vital metric
   */
  private recordWebVital(
    name: keyof PerformanceThresholds,
    value: number
  ): void {
    const metric: Partial<PerformanceMetrics> = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    metric[name] = value;
    this.addMetric(metric as PerformanceMetrics);
    this.checkThresholds(name, value);

    logger.debug('Web Vital recorded', { name, value });
  }

  /**
   * Collect initial performance metrics
   */
  private collectInitialMetrics(): void {
    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as { memory: { usedJSHeapSize: number } })
        .memory;
      this.recordMetric('memoryUsage', memory.usedJSHeapSize);
    }

    // Bundle size (estimated from loaded resources)
    if ('getEntriesByType' in performance) {
      const resources = performance.getEntriesByType(
        'resource'
      ) as PerformanceResourceTiming[];
      const totalSize = resources.reduce((sum, resource) => {
        return sum + (resource.transferSize || 0);
      }, 0);

      this.recordMetric('bundleSize', totalSize);
    }

    // Page load time
    if ('timing' in performance) {
      const timing = performance.timing;
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
      if (pageLoadTime > 0) {
        this.recordMetric('pageLoadTime', pageLoadTime);
      }
    }
  }

  /**
   * Add metric to history
   */
  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Check if metric exceeds thresholds
   */
  private checkThresholds(metricName: string, value: number): void {
    const threshold =
      this.thresholds[metricName as keyof PerformanceThresholds];
    if (!threshold) {
      return;
    }

    let alertType: 'warning' | 'critical' | null = null;
    let thresholdValue = 0;

    if (value > threshold.poor) {
      alertType = 'critical';
      thresholdValue = threshold.poor;
    } else if (value > threshold.good) {
      alertType = 'warning';
      thresholdValue = threshold.good;
    }

    if (alertType) {
      const alert: PerformanceAlert = {
        id: `${metricName}_${Date.now()}`,
        type: alertType,
        metric: metricName,
        value,
        threshold: thresholdValue,
        timestamp: Date.now(),
        url: window.location.href,
        message: `${metricName.toUpperCase()} is ${alertType}: ${value}ms (threshold: ${thresholdValue}ms)`,
      };

      this.alerts.push(alert);

      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }

      logger.warn('Performance threshold exceeded', {
        id: alert.id,
        type: alert.type,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
      });
    }
  }

  /**
   * Get latest metrics
   */
  private getLatestMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };
    }

    // Aggregate latest metrics by type
    const latest: Partial<PerformanceMetrics> = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Get most recent value for each metric type
    const recentMetrics = this.metrics.slice(-10);

    for (const metric of recentMetrics) {
      Object.keys(metric).forEach(key => {
        if (key !== 'timestamp' && key !== 'url' && key !== 'userAgent') {
          const value = metric[key as keyof PerformanceMetrics];
          if (value !== undefined) {
            (latest as Record<string, unknown>)[key] = value;
          }
        }
      });
    }

    return latest as PerformanceMetrics;
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    const scores: number[] = [];

    Object.keys(this.thresholds).forEach(key => {
      const value = metrics[key as keyof PerformanceMetrics] as number;
      const threshold = this.thresholds[key as keyof PerformanceThresholds];

      if (value !== undefined && threshold) {
        let score = 100;

        if (value > threshold.poor) {
          score = 0;
        } else if (value > threshold.good) {
          const range = threshold.poor - threshold.good;
          const excess = value - threshold.good;
          score = Math.max(0, 50 - (excess / range) * 50);
        }

        scores.push(score);
      }
    });

    return scores.length > 0
      ? Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length
        )
      : 0;
  }

  /**
   * Get performance grade
   */
  private getPerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Count good metrics
   */
  private countGoodMetrics(metrics: PerformanceMetrics): number {
    let count = 0;

    Object.keys(this.thresholds).forEach(key => {
      const value = metrics[key as keyof PerformanceMetrics] as number;
      const threshold = this.thresholds[key as keyof PerformanceThresholds];

      if (value !== undefined && threshold && value <= threshold.good) {
        count++;
      }
    });

    return count;
  }

  /**
   * Count poor metrics
   */
  private countPoorMetrics(metrics: PerformanceMetrics): number {
    let count = 0;

    Object.keys(this.thresholds).forEach(key => {
      const value = metrics[key as keyof PerformanceMetrics] as number;
      const threshold = this.thresholds[key as keyof PerformanceThresholds];

      if (value !== undefined && threshold && value > threshold.poor) {
        count++;
      }
    });

    return count;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.lcp && metrics.lcp > this.thresholds.lcp.good) {
      recommendations.push(
        'Optimize Largest Contentful Paint by reducing image sizes and improving server response times'
      );
    }

    if (metrics.fid && metrics.fid > this.thresholds.fid.good) {
      recommendations.push(
        'Reduce First Input Delay by minimizing JavaScript execution time and using code splitting'
      );
    }

    if (metrics.cls && metrics.cls > this.thresholds.cls.good) {
      recommendations.push(
        'Improve Cumulative Layout Shift by setting dimensions for images and avoiding dynamic content insertion'
      );
    }

    if (metrics.ttfb && metrics.ttfb > this.thresholds.ttfb.good) {
      recommendations.push(
        'Reduce Time to First Byte by optimizing server performance and using CDN'
      );
    }

    if (metrics.bundleSize && metrics.bundleSize > 1000000) {
      // 1MB
      recommendations.push(
        'Reduce bundle size by implementing code splitting and removing unused dependencies'
      );
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 50000000) {
      // 50MB
      recommendations.push(
        'Optimize memory usage by implementing proper cleanup and avoiding memory leaks'
      );
    }

    return recommendations;
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(): Array<{
    metric: string;
    trend: 'improving' | 'degrading' | 'stable';
    change: number;
  }> {
    const trends: Array<{
      metric: string;
      trend: 'improving' | 'degrading' | 'stable';
      change: number;
    }> = [];

    if (this.metrics.length < 10) {
      return trends;
    }

    const recentMetrics = this.metrics.slice(-10);
    const olderMetrics = this.metrics.slice(-20, -10);

    Object.keys(this.thresholds).forEach(key => {
      const recentValues = recentMetrics
        .map(m => m[key as keyof PerformanceMetrics] as number)
        .filter(v => v !== undefined);

      const olderValues = olderMetrics
        .map(m => m[key as keyof PerformanceMetrics] as number)
        .filter(v => v !== undefined);

      if (recentValues.length > 0 && olderValues.length > 0) {
        const recentAvg =
          recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
        const olderAvg =
          olderValues.reduce((sum, val) => sum + val, 0) / olderValues.length;

        const change = ((recentAvg - olderAvg) / olderAvg) * 100;

        let trend: 'improving' | 'degrading' | 'stable' = 'stable';

        if (Math.abs(change) > 5) {
          // For performance metrics, lower is better (except cache hit rate)
          if (key === 'cacheHitRate') {
            trend = change > 0 ? 'improving' : 'degrading';
          } else {
            trend = change < 0 ? 'improving' : 'degrading';
          }
        }

        trends.push({ metric: key, trend, change: Math.round(change) });
      }
    });

    return trends;
  }

  /**
   * Get recent alerts
   */
  private getRecentAlerts(): PerformanceAlert[] {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return this.alerts.filter(alert => alert.timestamp > oneHourAgo);
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    this.reportInterval = setInterval(
      () => {
        const report = this.getPerformanceReport();

        if (report.summary.score < 70) {
          logger.warn('Performance degradation detected', {
            score: report.summary.score,
            grade: report.summary.grade,
            poorMetrics: report.summary.poorMetrics,
          });
        }
      },
      5 * 60 * 1000
    ); // Every 5 minutes
  }

  /**
   * Destroy performance service
   */
  destroy(): void {
    this.stopMonitoring();
    this.clearData();

    logger.info('Performance service destroyed');
  }
}

// Export singleton instance
export const performanceService = new PerformanceService();
