import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width={120} height={24} />
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <Skeleton width="100%" height={48} />
      <div className="space-y-2">
        <Skeleton width="90%" />
        <Skeleton width="70%" />
        <Skeleton width="80%" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <Skeleton width={200} height={24} />
      </div>
      <div className="divide-y divide-slate-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" />
              <Skeleton width="40%" />
            </div>
            <Skeleton width={80} height={32} variant="rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton width={100} height={16} />
              <Skeleton variant="circular" width={32} height={32} />
            </div>
            <Skeleton width={120} height={32} />
            <Skeleton width={80} height={12} className="mt-2" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <SkeletonTable />
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={16} />
            <Skeleton width="50%" height={12} />
          </div>
          <Skeleton width={60} height={24} variant="rounded" />
        </div>
      ))}
    </div>
  );
}

interface SkeletonWrapperProps {
  isLoading: boolean;
  skeleton?: ReactNode;
  children: ReactNode;
  fallback?: ReactNode;
}

export function SkeletonWrapper({
  isLoading,
  skeleton = <SkeletonCard />,
  children,
  fallback,
}: SkeletonWrapperProps) {
  if (isLoading) {
    return <>{skeleton}</>;
  }

  if (fallback && !children) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
