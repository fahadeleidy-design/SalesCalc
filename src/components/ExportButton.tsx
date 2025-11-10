import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportProfessionalQuotationPDF } from '../lib/professionalPdfExport';
import {
  exportQuotationsToExcel,
  exportQuotationDetailsToExcel,
  exportAnalyticsToExcel,
  exportCustomersToExcel,
  exportProductsToExcel,
} from '../lib/excelExport';
import type { Quotation } from '../hooks/useQuotations';

interface ExportButtonProps {
  type: 'quotation' | 'quotations' | 'analytics' | 'customers' | 'products';
  data: any;
  label?: string;
  variant?: 'primary' | 'secondary';
}

/**
 * Export Button with Dropdown Menu
 * Supports PDF and Excel export for various data types
 */
export function ExportButton({ type, data, label = 'Export', variant = 'primary' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async (format: 'pdf' | 'excel') => {
    setIsOpen(false);

    try {
      switch (type) {
        case 'quotation':
          if (format === 'pdf') {
            const success = await exportProfessionalQuotationPDF(data);
            if (success) {
              toast.success('PDF opened in new window', { icon: '📄' });
            }
          } else {
            exportQuotationDetailsToExcel(data);
            toast.success('Excel file downloaded', { icon: '📊' });
          }
          break;

        case 'quotations':
          if (format === 'pdf') {
            toast.info('PDF export for quotations list coming soon!');
          } else {
            exportQuotationsToExcel(data);
            toast.success('Excel file downloaded', { icon: '📊' });
          }
          break;

        case 'analytics':
          if (format === 'excel') {
            exportAnalyticsToExcel(data.quotations, data.dateRange);
            toast.success('Analytics exported to Excel', { icon: '📊' });
          }
          break;

        case 'customers':
          if (format === 'excel') {
            exportCustomersToExcel(data);
            toast.success('Customers exported to Excel', { icon: '📊' });
          }
          break;

        case 'products':
          if (format === 'excel') {
            exportProductsToExcel(data);
            toast.success('Products exported to Excel', { icon: '📊' });
          }
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    }
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${variantClasses[variant]}`}
      >
        <Download className="w-4 h-4" />
        <span>{label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            {/* PDF Options */}
            {(type === 'quotation') && (
              <>
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase">PDF Export</p>
                </div>

                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors text-left border-b border-gray-200"
                >
                  <FileText className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Professional PDF</p>
                    <p className="text-xs text-gray-500">With company logo & branding</p>
                  </div>
                </button>
              </>
            )}

            {/* Excel Options */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase">Excel Export</p>
            </div>

            <button
              onClick={() => handleExport('excel')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Excel Spreadsheet</p>
                <p className="text-xs text-gray-500">
                  {type === 'quotation' && 'Detailed quotation data'}
                  {type === 'quotations' && 'All quotations list'}
                  {type === 'analytics' && 'Analytics report'}
                  {type === 'customers' && 'Customer database'}
                  {type === 'products' && 'Product catalog'}
                </p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Simple Export Button (no dropdown)
 */
interface SimpleExportButtonProps {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function SimpleExportButton({
  onClick,
  label = 'Export',
  icon,
  variant = 'primary',
}: SimpleExportButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${variantClasses[variant]}`}
    >
      {icon || <Download className="w-4 h-4" />}
      <span>{label}</span>
    </button>
  );
}
