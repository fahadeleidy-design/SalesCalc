import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Info,
  Loader,
} from 'lucide-react';
import { bulkUploadService, UploadTemplate, UploadResult } from '../../lib/bulkUploadService';
import toast from 'react-hot-toast';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  onSuccess?: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  tableName,
  onSuccess,
}) => {
  const [template, setTemplate] = useState<UploadTemplate | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplate();
    } else {
      resetState();
    }
  }, [isOpen, tableName]);

  const loadTemplate = async () => {
    try {
      const tmpl = await bulkUploadService.getTemplate(tableName);
      if (tmpl) {
        setTemplate(tmpl);
      } else {
        toast.error('Upload template not found');
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message);
      onClose();
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setUploading(false);
    setProgress(0);
    setResult(null);
    setShowErrors(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!template) return;
    try {
      await bulkUploadService.downloadTemplate(template);
    } catch (error: any) {
      toast.error('Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !template) return;

    setUploading(true);
    setProgress(0);

    try {
      const uploadResult = await bulkUploadService.uploadData(
        selectedFile,
        template,
        setProgress
      );

      setResult(uploadResult);

      if (uploadResult.successfulRows === uploadResult.totalRows) {
        toast.success(`Successfully uploaded ${uploadResult.successfulRows} rows`);
        if (onSuccess) onSuccess();
      } else if (uploadResult.successfulRows > 0) {
        toast.success(
          `Partially completed: ${uploadResult.successfulRows}/${uploadResult.totalRows} rows uploaded`
        );
        if (onSuccess) onSuccess();
      } else {
        toast.error('Upload failed. Please check the errors below.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      onClose();
    }
  };

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bulk Upload</h2>
              <p className="text-sm text-gray-600">{template.display_name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!result ? (
            <>
              <Card className="p-4 bg-blue-50 border border-blue-200">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Instructions</h3>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>Download the template file below</li>
                      <li>Fill in your data following the column headers</li>
                      <li>Save the file and upload it here</li>
                      <li>Review any validation errors and re-upload if needed</li>
                    </ol>
                    <p className="text-sm text-gray-600 mt-3">{template.description}</p>
                  </div>
                </div>
              </Card>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Required Fields</h3>
                <div className="flex flex-wrap gap-2">
                  {template.required_columns.map((col) => (
                    <span
                      key={col}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                    >
                      {template.column_mappings[col] || col}
                    </span>
                  ))}
                </div>
              </div>

              {template.optional_columns.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Optional Fields</h3>
                  <div className="flex flex-wrap gap-2">
                    {template.optional_columns.map((col) => (
                      <span
                        key={col}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {template.column_mappings[col] || col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Upload File</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    disabled={uploading}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="space-y-2">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedFile(null);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Change file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                        <p className="text-sm font-medium text-gray-900">
                          Click to select Excel file
                        </p>
                        <p className="text-xs text-gray-500">or drag and drop</p>
                        <p className="text-xs text-gray-400">XLSX, XLS up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>

                {uploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                      <span>Uploading...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <Card
                className={`p-6 ${
                  result.successfulRows === result.totalRows
                    ? 'bg-green-50 border-green-200'
                    : result.successfulRows > 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {result.successfulRows === result.totalRows ? (
                    <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                  ) : result.successfulRows > 0 ? (
                    <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Complete</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Rows</p>
                        <p className="text-2xl font-bold text-gray-900">{result.totalRows}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Successful</p>
                        <p className="text-2xl font-bold text-green-600">
                          {result.successfulRows}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Failed</p>
                        <p className="text-2xl font-bold text-red-600">{result.failedRows}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {result.errors.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      Errors ({result.errors.length})
                    </h3>
                    <button
                      onClick={() => setShowErrors(!showErrors)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {showErrors ? 'Hide' : 'Show'} Details
                    </button>
                  </div>

                  {showErrors && (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Row</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {result.errors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-900">{err.row}</td>
                              <td className="px-4 py-2 text-red-600">{err.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetState();
                  }}
                  className="flex-1"
                >
                  Upload Another File
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>

        {!result && (
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
