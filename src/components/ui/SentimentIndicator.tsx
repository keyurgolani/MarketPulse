/**
 * Sentiment Indicator Component
 * Displays sentiment analysis with visual indicators and tooltips
 */

import React from 'react';
import type { SentimentAnalysis, SentimentLabel } from '@/types/news';

export interface SentimentIndicatorProps {
  /** Sentiment analysis data */
  sentiment: SentimentAnalysis;
  /** Display size */
  size?: 'sm' | 'md' | 'lg';
  /** Show label text */
  showLabel?: boolean;
  /** Show confidence score */
  showConfidence?: boolean;
  /** Custom className */
  className?: string;
}

export const SentimentIndicator: React.FC<SentimentIndicatorProps> = ({
  sentiment,
  size = 'md',
  showLabel = false,
  showConfidence = false,
  className = '',
}) => {
  // Get sentiment configuration
  const getSentimentConfig = (
    label: SentimentLabel
  ): {
    color: string;
    bgColor: string;
    icon: string;
    text: string;
  } => {
    switch (label) {
      case 'very-positive':
        return {
          color: 'text-green-700 dark:text-green-300',
          bgColor: 'bg-green-100 dark:bg-green-900',
          icon: '📈',
          text: 'Very Positive',
        };
      case 'positive':
        return {
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/50',
          icon: '📊',
          text: 'Positive',
        };
      case 'negative':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/50',
          icon: '📉',
          text: 'Negative',
        };
      case 'very-negative':
        return {
          color: 'text-red-700 dark:text-red-300',
          bgColor: 'bg-red-100 dark:bg-red-900',
          icon: '⬇️',
          text: 'Very Negative',
        };
      case 'neutral':
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          icon: '➖',
          text: 'Neutral',
        };
    }
  };

  // Get size classes
  const getSizeClasses = (
    size: 'sm' | 'md' | 'lg'
  ): {
    container: string;
    icon: string;
    text: string;
    confidence: string;
  } => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-1.5 py-0.5',
          icon: 'text-xs',
          text: 'text-xs',
          confidence: 'text-xs',
        };
      case 'lg':
        return {
          container: 'px-3 py-2',
          icon: 'text-lg',
          text: 'text-sm font-medium',
          confidence: 'text-sm',
        };
      case 'md':
      default:
        return {
          container: 'px-2 py-1',
          icon: 'text-sm',
          text: 'text-xs font-medium',
          confidence: 'text-xs',
        };
    }
  };

  const config = getSentimentConfig(sentiment.label);
  const sizeClasses = getSizeClasses(size);

  // Format confidence as percentage
  const confidencePercent = Math.round(sentiment.confidence * 100);

  // Create tooltip content
  const tooltipContent = `${config.text} sentiment (${confidencePercent}% confidence)`;

  return (
    <div
      className={`inline-flex items-center space-x-1 rounded-full ${config.bgColor} ${sizeClasses.container} ${className}`}
      title={tooltipContent}
    >
      {/* Sentiment icon */}
      <span
        className={`${sizeClasses.icon}`}
        role="img"
        aria-label={config.text}
      >
        {config.icon}
      </span>

      {/* Sentiment label */}
      {showLabel && (
        <span className={`${config.color} ${sizeClasses.text}`}>
          {config.text}
        </span>
      )}

      {/* Confidence score */}
      {showConfidence && (
        <span
          className={`${config.color} ${sizeClasses.confidence} opacity-75`}
        >
          {confidencePercent}%
        </span>
      )}
    </div>
  );
};

/**
 * Sentiment Bar Component
 * Shows sentiment as a horizontal bar with score
 */
export interface SentimentBarProps {
  /** Sentiment analysis data */
  sentiment: SentimentAnalysis;
  /** Bar width */
  width?: number;
  /** Bar height */
  height?: number;
  /** Show score text */
  showScore?: boolean;
  /** Custom className */
  className?: string;
}

export const SentimentBar: React.FC<SentimentBarProps> = ({
  sentiment,
  width = 100,
  height = 8,
  showScore = true,
  className = '',
}) => {
  // Convert score (-1 to 1) to percentage (0 to 100)
  const scorePercent = ((sentiment.score + 1) / 2) * 100;

  // Get color based on score
  const getBarColor = (score: number): string => {
    if (score > 0.5) return 'bg-green-500';
    if (score > 0.1) return 'bg-green-300';
    if (score > -0.1) return 'bg-gray-400';
    if (score > -0.5) return 'bg-red-300';
    return 'bg-red-500';
  };

  const barColor = getBarColor(sentiment.score);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Sentiment bar */}
      <div
        className="bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${scorePercent}%` }}
        />
      </div>

      {/* Score text */}
      {showScore && (
        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
          {sentiment.score.toFixed(2)}
        </span>
      )}
    </div>
  );
};

/**
 * Sentiment Breakdown Component
 * Shows detailed sentiment breakdown if available
 */
export interface SentimentBreakdownProps {
  /** Sentiment analysis data */
  sentiment: SentimentAnalysis;
  /** Custom className */
  className?: string;
}

export const SentimentBreakdown: React.FC<SentimentBreakdownProps> = ({
  sentiment,
  className = '',
}) => {
  if (!sentiment.breakdown) {
    return (
      <SentimentIndicator sentiment={sentiment} showLabel showConfidence />
    );
  }

  const { breakdown } = sentiment;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Overall sentiment */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Overall
        </span>
        <SentimentIndicator sentiment={sentiment} showLabel />
      </div>

      {/* Breakdown bars */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-green-600 dark:text-green-400">Positive</span>
          <span className="text-gray-500">
            {Math.round(breakdown.positive * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div
            className="bg-green-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${breakdown.positive * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">Neutral</span>
          <span className="text-gray-500">
            {Math.round(breakdown.neutral * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div
            className="bg-gray-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${breakdown.neutral * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-red-600 dark:text-red-400">Negative</span>
          <span className="text-gray-500">
            {Math.round(breakdown.negative * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div
            className="bg-red-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${breakdown.negative * 100}%` }}
          />
        </div>
      </div>

      {/* Key phrases */}
      {breakdown.keyPhrases && breakdown.keyPhrases.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Key Phrases
          </div>
          <div className="flex flex-wrap gap-1">
            {breakdown.keyPhrases.slice(0, 3).map((phrase, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
              >
                {phrase}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SentimentIndicator;
