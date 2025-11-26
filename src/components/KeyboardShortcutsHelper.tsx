import { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

export default function KeyboardShortcutsHelper() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Show shortcuts with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShow(true);
      }
      // Close with Escape
      if (e.key === 'Escape' && show) {
        setShow(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [show]);

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="fixed bottom-24 right-6 p-3 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-all z-40 hover:scale-110"
        title="Keyboard Shortcuts (Ctrl+K)"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setShow(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* General */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
              General
            </h3>
            <div className="space-y-2">
              <ShortcutItem keys={['Ctrl', 'K']} description="Show keyboard shortcuts" />
              <ShortcutItem keys={['Esc']} description="Close modal/dialog" />
              <ShortcutItem keys={['/']} description="Focus search" />
            </div>
          </div>

          {/* Quotations */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Quotations
            </h3>
            <div className="space-y-2">
              <ShortcutItem keys={['N']} description="New quotation" />
              <ShortcutItem keys={['D']} description="Duplicate selected quotation" />
              <ShortcutItem keys={['S']} description="Submit for approval" />
              <ShortcutItem keys={['E']} description="Edit selected quotation" />
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Products
            </h3>
            <div className="space-y-2">
              <ShortcutItem keys={['P']} description="Add product to quotation" />
              <ShortcutItem keys={['F']} description="Toggle favorite product" />
              <ShortcutItem keys={['C']} description="Add custom item" />
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Navigation
            </h3>
            <div className="space-y-2">
              <ShortcutItem keys={['G', 'Q']} description="Go to Quotations" />
              <ShortcutItem keys={['G', 'P']} description="Go to Products" />
              <ShortcutItem keys={['G', 'C']} description="Go to Customers" />
              <ShortcutItem keys={['G', 'D']} description="Go to Dashboard" />
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Pro Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use Tab to navigate between form fields quickly</li>
              <li>• Recent customers appear at the top for quick access</li>
              <li>• Favorite products are accessible from the sidebar</li>
              <li>• Duplicate existing quotations to save time</li>
              <li>• Use templates for common quotation scenarios</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutItem({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-600">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            <kbd className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded shadow-sm">
              {key}
            </kbd>
            {index < keys.length - 1 && <span className="mx-1 text-slate-400">+</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
