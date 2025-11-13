import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', interactive = false, hover = true, onClick }: CardProps) {
  const baseClasses = 'bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300';
  const hoverClasses = hover ? 'hover:shadow-md hover:-translate-y-0.5' : '';
  const interactiveClasses = interactive
    ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-orange-200 active:scale-[0.98]'
    : '';

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-b border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl ${className}`}>
      {children}
    </div>
  );
}
