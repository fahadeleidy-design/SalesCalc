import { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Responsive container with consistent padding and max-width
 */
export function ResponsiveContainer({ children, className = '' }: ResponsiveContainerProps) {
  return (
    <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl ${className}`}>
      {children}
    </div>
  );
}

/**
 * Responsive grid with auto-fit columns
 */
interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}

export function ResponsiveGrid({
  children,
  className = '',
  minWidth = '280px'
}: ResponsiveGridProps) {
  return (
    <div
      className={`grid gap-4 sm:gap-6 ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))` }}
    >
      {children}
    </div>
  );
}

/**
 * Stack that switches from vertical to horizontal at breakpoint
 */
interface ResponsiveStackProps {
  children: ReactNode;
  className?: string;
  breakpoint?: 'sm' | 'md' | 'lg';
  gap?: string;
}

export function ResponsiveStack({
  children,
  className = '',
  breakpoint = 'md',
  gap = '4'
}: ResponsiveStackProps) {
  const breakpointClass = {
    sm: `flex flex-col sm:flex-row gap-${gap}`,
    md: `flex flex-col md:flex-row gap-${gap}`,
    lg: `flex flex-col lg:flex-row gap-${gap}`,
  }[breakpoint];

  return (
    <div className={`${breakpointClass} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Show/hide based on screen size
 */
interface ResponsiveShowProps {
  children: ReactNode;
  on?: 'mobile' | 'tablet' | 'desktop';
}

export function ResponsiveShow({ children, on = 'mobile' }: ResponsiveShowProps) {
  const displayClass = {
    mobile: 'block md:hidden',
    tablet: 'hidden md:block lg:hidden',
    desktop: 'hidden lg:block',
  }[on];

  return <div className={displayClass}>{children}</div>;
}

export function ResponsiveHide({ children, on = 'mobile' }: ResponsiveShowProps) {
  const displayClass = {
    mobile: 'hidden md:block',
    tablet: 'block md:hidden lg:block',
    desktop: 'block lg:hidden',
  }[on];

  return <div className={displayClass}>{children}</div>;
}

/**
 * Responsive text size
 */
interface ResponsiveTextProps {
  children: ReactNode;
  className?: string;
  base?: string;
  sm?: string;
  md?: string;
  lg?: string;
}

export function ResponsiveText({
  children,
  className = '',
  base = 'text-base',
  sm = 'sm:text-lg',
  md = 'md:text-xl',
  lg = 'lg:text-2xl'
}: ResponsiveTextProps) {
  return (
    <div className={`${base} ${sm} ${md} ${lg} ${className}`}>
      {children}
    </div>
  );
}
