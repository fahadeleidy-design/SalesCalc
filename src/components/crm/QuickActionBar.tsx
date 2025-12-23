import {
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  Users,
  Target,
  MessageSquare,
  Calendar,
  BarChart3,
  Zap,
} from 'lucide-react';

interface QuickActionBarProps {
  type: 'leads' | 'opportunities';
  onAddNew: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onDownloadTemplate?: () => void;
  onBulkAction?: () => void;
  showImportExport?: boolean;
}

export default function QuickActionBar({
  type,
  onAddNew,
  onImport,
  onExport,
  onDownloadTemplate,
  onBulkAction,
  showImportExport = false,
}: QuickActionBarProps) {
  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Primary Action */}
        <button
          onClick={onAddNew}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          <span>New {type === 'leads' ? 'Lead' : 'Opportunity'}</span>
        </button>

        <div className="h-8 w-px bg-slate-300" />

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {showImportExport && (
            <>
              {onImport && (
                <button
                  onClick={onImport}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Import</span>
                </button>
              )}
              {onExport && (
                <button
                  onClick={onExport}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
              {onDownloadTemplate && (
                <button
                  onClick={onDownloadTemplate}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden sm:inline">Template</span>
                </button>
              )}
            </>
          )}

          {onBulkAction && (
            <button
              onClick={onBulkAction}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-2 text-sm"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Bulk Actions</span>
            </button>
          )}
        </div>

        {/* Info Badge */}
        <div className="ml-auto hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
          <BarChart3 className="h-4 w-4" />
          <span>Viewing all {type}</span>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-3 pt-3 border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            <span>Use filters to narrow results</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Click cards for quick actions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Drag to reschedule tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
