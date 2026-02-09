import { useState, useEffect } from 'react';
import { Lightbulb, AlertTriangle, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';
import { analyzeQuotation } from '../lib/aiApprovalRouting';
import type { Quotation } from '../hooks/useQuotations';

interface SmartSuggestionsProps {
  quotation: Quotation;
}

/**
 * AI-powered smart suggestions for quotations
 * Analyzes quotation and provides real-time feedback
 */
export function SmartSuggestions({ quotation }: SmartSuggestionsProps) {
  const [analysis, setAnalysis] = useState<{
    issues: string[];
    warnings: string[];
    suggestions: string[];
    score: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    analyzeQuotationData();
  }, [quotation.id, quotation.total, quotation.items?.length, quotation.discount_percentage]);

  const analyzeQuotationData = async () => {
    setIsLoading(true);
    try {
      const result = await analyzeQuotation(quotation);
      setAnalysis(result);
    } catch (error) {
      console.error('Failed to analyze quotation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
          <p className="text-sm text-gray-600">Analyzing quotation with AI...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const hasIssues = analysis.issues.length > 0;
  const hasWarnings = analysis.warnings.length > 0;
  const hasSuggestions = analysis.suggestions.length > 0;
  const totalItems = analysis.issues.length + analysis.warnings.length + analysis.suggestions.length;

  if (totalItems === 0) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">✓</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">Quotation looks great!</h3>
            <p className="text-sm text-green-700 mt-1">
              Quality Score: <span className="font-bold">{analysis.score}/100</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">AI Smart Suggestions</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Quality Score: <span className={getScoreColor(analysis.score)}>{analysis.score}/100</span>
              {' • '}
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badges */}
          {hasIssues && (
            <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
              {analysis.issues.length} {analysis.issues.length === 1 ? 'issue' : 'issues'}
            </span>
          )}
          {hasWarnings && (
            <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
              {analysis.warnings.length} {analysis.warnings.length === 1 ? 'warning' : 'warnings'}
            </span>
          )}

          {/* Expand/Collapse Icon */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Issues */}
          {hasIssues && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Critical Issues</span>
              </div>
              <ul className="space-y-2 ml-6">
                {analysis.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-700 font-medium text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Warnings</span>
              </div>
              <ul className="space-y-2 ml-6">
                {analysis.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-600 flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {hasSuggestions && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                <Lightbulb className="w-4 h-4" />
                <span>Suggestions</span>
              </div>
              <ul className="space-y-2 ml-6">
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Re-analyze Button */}
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={analyzeQuotationData}
              disabled={isLoading}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Re-analyze with AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get color class based on score
 */
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 font-bold';
  if (score >= 75) return 'text-blue-600 font-bold';
  if (score >= 60) return 'text-yellow-600 font-bold';
  return 'text-red-600 font-bold';
}

/**
 * Score Badge Component
 */
interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-base',
    lg: 'w-20 h-20 text-lg',
  };

  const getColor = () => {
    if (score >= 90) return 'from-green-400 to-emerald-500';
    if (score >= 75) return 'from-blue-400 to-cyan-500';
    if (score >= 60) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-rose-500';
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${getColor()} flex items-center justify-center text-white font-bold shadow-lg`}
    >
      {score}
    </div>
  );
}

/**
 * Approval Route Suggestion Component
 */
interface ApprovalRouteSuggestionProps {
  route: {
    approvers: string[];
    estimatedTime: number;
    confidence: number;
    reasoning: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    suggestedPath: string;
  };
}

export function ApprovalRouteSuggestion({ route }: ApprovalRouteSuggestionProps) {
  const getPriorityColor = () => {
    switch (route.priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-sm border border-purple-200 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <TrendingUp className="w-6 h-6 text-purple-600" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            AI-Suggested Approval Route
          </h3>

          <div className="space-y-3">
            {/* Approval Path */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Suggested Path:</p>
              <p className="text-base font-medium text-purple-900">{route.suggestedPath}</p>
            </div>

            {/* Estimated Time & Priority */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-gray-600">Estimated Time:</p>
                <p className="text-base font-medium text-gray-900">
                  {route.estimatedTime < 24
                    ? `${route.estimatedTime} hours`
                    : `${Math.round(route.estimatedTime / 24)} days`}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Priority:</p>
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${getPriorityColor()}`}>
                  {route.priority.toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-600">Confidence:</p>
                <p className="text-base font-medium text-gray-900">
                  {Math.round(route.confidence * 100)}%
                </p>
              </div>
            </div>

            {/* Reasoning */}
            <div className="pt-3 border-t border-purple-200">
              <p className="text-sm text-gray-700">{route.reasoning}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
