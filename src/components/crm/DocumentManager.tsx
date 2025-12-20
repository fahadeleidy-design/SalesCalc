import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Search,
  Filter,
  File,
  FileSpreadsheet,
  FileImage,
  X,
  Folder,
  Star,
  Clock,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  opportunity_id: string | null;
  lead_id: string | null;
  customer_id: string | null;
  document_type: string;
  description: string | null;
  is_favorite: boolean;
  uploaded_by: string;
  uploaded_at: string;
  profiles: {
    full_name: string;
  };
}

interface DocumentManagerProps {
  opportunityId?: string;
  leadId?: string;
  customerId?: string;
}

export default function DocumentManager({
  opportunityId,
  leadId,
  customerId,
}: DocumentManagerProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', opportunityId, leadId, customerId],
    queryFn: async () => {
      let query = supabase
        .from('crm_documents')
        .select(`
          *,
          profiles:uploaded_by(full_name)
        `)
        .order('uploaded_at', { ascending: false });

      if (opportunityId) {
        query = query.eq('opportunity_id', opportunityId);
      } else if (leadId) {
        query = query.eq('lead_id', leadId);
      } else if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!(opportunityId || leadId || customerId),
  });

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('crm-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('crm-documents')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('crm_documents')
        .insert([{
          name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl,
          opportunity_id: opportunityId || null,
          lead_id: leadId || null,
          customer_id: customerId || null,
          document_type: getDocumentType(file.type),
          uploaded_by: profile?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded successfully');
      setIsUploading(false);
    },
    onError: () => {
      toast.error('Failed to upload document');
      setIsUploading(false);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: Document) => {
      const filePath = doc.file_url.split('/').slice(-2).join('/');

      await supabase.storage
        .from('crm-documents')
        .remove([filePath]);

      const { error } = await supabase
        .from('crm_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete document');
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('crm_documents')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    uploadDocument.mutate(file);
    e.target.value = '';
  };

  const getDocumentType = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'proposal';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'contract';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    return 'other';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('sheet') || fileType.includes('excel')) return FileSpreadsheet;
    if (fileType.includes('image')) return FileImage;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const documentTypes = ['all', 'proposal', 'contract', 'spreadsheet', 'presentation', 'image', 'other'];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'all' || doc.document_type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Folder className="h-6 w-6 text-indigo-600" />
            Document Manager
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage proposals, contracts, and other deal documents
          </p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">
          <Upload className="h-5 w-5" />
          {isUploading ? 'Uploading...' : 'Upload Document'}
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
          />
        </label>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        >
          {documentTypes.map(type => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No documents found</p>
          <p className="text-sm mt-1">Upload your first document to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => {
            const FileIcon = getFileIcon(doc.file_type);

            return (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <FileIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <button
                      onClick={() => toggleFavorite.mutate({ id: doc.id, isFavorite: doc.is_favorite })}
                      className={`p-1 rounded ${
                        doc.is_favorite
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-slate-300 hover:text-yellow-500'
                      }`}
                      title={doc.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className="h-4 w-4" fill={doc.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-indigo-600"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                    <a
                      href={doc.file_url}
                      download
                      className="p-1 text-slate-400 hover:text-green-600"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => {
                        if (confirm('Delete this document?')) {
                          deleteDocument.mutate(doc);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-medium text-slate-900 text-sm mb-1 line-clamp-2" title={doc.name}>
                  {doc.name}
                </h3>

                {doc.description && (
                  <p className="text-xs text-slate-600 mb-2 line-clamp-2">{doc.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="capitalize">{doc.document_type}</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                </div>

                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <User className="h-3 w-3" />
                  <span className="truncate">{doc.profiles?.full_name || 'Unknown'}</span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
