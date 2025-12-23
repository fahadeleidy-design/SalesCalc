import { Plus, Search, Filter, FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-data' | 'no-results' | 'no-filters';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export default function EmptyState({
  type,
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  const getDefaultIcon = () => {
    switch (type) {
      case 'no-data':
        return <FileQuestion className="h-16 w-16 text-slate-300" />;
      case 'no-results':
        return <Search className="h-16 w-16 text-slate-300" />;
      case 'no-filters':
        return <Filter className="h-16 w-16 text-slate-300" />;
      default:
        return <FileQuestion className="h-16 w-16 text-slate-300" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
        {icon || getDefaultIcon()}
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2 text-center">
        {title}
      </h3>

      <p className="text-slate-600 text-center max-w-md mb-8">{description}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          {action.label}
        </button>
      )}

      {type === 'no-results' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md">
          <p className="text-sm text-blue-800 text-center">
            Try adjusting your search or filters to find what you're looking for.
          </p>
        </div>
      )}
    </div>
  );
}
