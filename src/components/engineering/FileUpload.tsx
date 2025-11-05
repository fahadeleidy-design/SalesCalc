import { useState } from 'react';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  existingFiles?: UploadedFile[];
  maxFiles?: number;
}

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export default function FileUpload({ onFilesChange, existingFiles = [], maxFiles = 10 }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type === 'application/pdf') return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadedFiles: UploadedFile[] = [];

      for (const file of selectedFiles) {
        // Check file size (50MB limit)
        if (file.size > 52428800) {
          setError(`File ${file.name} exceeds 50MB limit`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `engineering/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('engineering-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('engineering-files')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.name,
          url: filePath,
          size: file.size,
          type: file.type,
        });
      }

      const newFiles = [...files, ...uploadedFiles];
      setFiles(newFiles);
      onFilesChange(newFiles);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (index: number) => {
    const fileToRemove = files[index];

    try {
      // Delete from storage
      await supabase.storage
        .from('engineering-files')
        .remove([fileToRemove.url]);

      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
      onFilesChange(newFiles);
    } catch (err: any) {
      console.error('Delete error:', err);
      setError('Failed to delete file');
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('engineering-files')
        .download(file.url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      setError('Failed to download file');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          Engineering Files (Drawings, Designs, Documents)
        </label>
        <span className="text-xs text-slate-500">
          {files.length} / {maxFiles} files
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={uploading || files.length >= maxFiles}
          className="hidden"
          id="file-upload"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.dwg,.dxf,.xlsx,.xls,.docx,.doc,.txt,.zip"
        />
        <label
          htmlFor="file-upload"
          className={`cursor-pointer ${uploading || files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">
            {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            PDF, Images, CAD files, Documents (Max 50MB per file)
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <Icon className="w-5 h-5 text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 text-slate-600 hover:bg-slate-200 rounded"
                    title="Download"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
