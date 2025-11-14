/**
 * Modern Card Component
 * Enhanced card with animations, hover effects, and customization
 */

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ModernCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  elevated?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  loading?: boolean;
  onClick?: () => void;
  gradient?: boolean;
  pattern?: 'dots' | 'grid' | 'waves' | 'none';
}

export function ModernCard({
  children,
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  actions,
  footer,
  className = '',
  elevated = false,
  hoverable = false,
  bordered = true,
  loading = false,
  onClick,
  gradient = false,
  pattern = 'none',
}: ModernCardProps) {
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    hover: hoverable ? { y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' } : {},
  };

  const patternStyles = {
    dots: 'bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] bg-[length:16px_16px]',
    grid: 'bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[length:16px_16px]',
    waves: 'bg-[url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 10c2.5 0 2.5-5 5-5s2.5 5 5 5 2.5-5 5-5 2.5 5 5 5v5H0z\' fill=\'rgba(0,0,0,0.02)\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")]',
    none: '',
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl bg-white
        ${bordered ? 'border border-gray-200' : ''}
        ${elevated ? 'shadow-lg' : 'shadow'}
        ${hoverable ? 'cursor-pointer' : ''}
        ${gradient ? 'bg-gradient-to-br from-white via-gray-50 to-white' : ''}
        ${patternStyles[pattern]}
        ${className}
      `}
    >
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}

      {/* Header */}
      {(title || subtitle || Icon || actions) && (
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {Icon && (
                <div className={`p-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1">
                {title && (
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            {actions && <div className="ml-4">{actions}</div>}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          {footer}
        </div>
      )}
    </motion.div>
  );
}

// Stat Card variant
interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-blue-600',
  trend = 'neutral',
  loading = false,
  onClick,
}: StatCardProps) {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  return (
    <ModernCard
      hoverable={!!onClick}
      onClick={onClick}
      loading={loading}
      className="relative overflow-hidden"
    >
      {Icon && (
        <div className={`absolute top-4 right-4 p-2 rounded-lg bg-opacity-10 ${iconColor}`}>
          <Icon className="w-5 h-5 opacity-30" />
        </div>
      )}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {(change !== undefined || changeLabel) && (
          <div className="flex items-center gap-2">
            {change !== undefined && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${trendColors[trend]}`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            )}
            {changeLabel && (
              <span className="text-xs text-gray-500">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </ModernCard>
  );
}

// Grid layout for cards
interface CardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CardGrid({ children, columns = 3, gap = 'md', className = '' }: CardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  const gapSizes = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <div className={`grid ${gridCols[columns]} ${gapSizes[gap]} ${className}`}>
      {children}
    </div>
  );
}
