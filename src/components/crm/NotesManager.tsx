import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { FileText, Plus, Edit2, Trash2, X, Lock, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface Note {
  id: string;
  title: string | null;
  content: string;
  note_type: string;
  is_private: boolean;
  tags: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_profile?: {
    full_name: string;
  };
}

interface NotesManagerProps {
  entityType: 'lead' | 'opportunity' | 'customer' | 'contact';
  entityId: string;
}

export default function NotesManager({ entityType, entityId }: NotesManagerProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: notes, isLoading } = useQuery({
    queryKey: ['crm-notes', entityType, entityId, typeFilter],
    queryFn: async () => {
      const field = `${entityType}_id`;
      let query = supabase
        .from('crm_notes')
        .select(`
          *,
          created_by_profile:profiles!crm_notes_created_by_fkey(full_name)
        `)
        .eq(field, entityId)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('note_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Note[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from('crm_notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-notes'] });
      toast.success('Note deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete note');
    },
  });

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-100 text-blue-700';
      case 'call':
        return 'bg-green-100 text-green-700';
      case 'email':
        return 'bg-purple-100 text-purple-700';
      case 'internal':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold text-slate-900">Notes</h3>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="meeting">Meeting</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="internal">Internal</option>
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Note
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : !notes || notes.length === 0 ? (
        <div className="bg-slate-50 rounded-lg p-6 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-600 mb-3">No notes yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add First Note
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {note.title && (
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      {note.title}
                      {note.is_private && (
                        <Lock className="h-4 w-4 text-amber-600" title="Private note" />
                      )}
                    </h4>
                  )}

                  <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{note.content}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getNoteTypeColor(note.note_type)}`}
                    >
                      {note.note_type.toUpperCase()}
                    </span>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3 text-slate-400" />
                        {note.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <span className="text-xs text-slate-500">
                      {note.created_by_profile?.full_name || 'Unknown'} •{' '}
                      {format(new Date(note.created_at), 'MMM dd, yyyy h:mm a')}
                    </span>
                  </div>
                </div>

                {note.created_by === profile?.id && (
                  <div className="flex gap-1 ml-4">
                    <button
                      onClick={() => setEditingNote(note)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this note?')) {
                          deleteMutation.mutate(note.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAddModal || editingNote) && (
        <NoteModal
          note={editingNote}
          entityType={entityType}
          entityId={entityId}
          onClose={() => {
            setShowAddModal(false);
            setEditingNote(null);
          }}
        />
      )}
    </div>
  );
}

function NoteModal({
  note,
  entityType,
  entityId,
  onClose,
}: {
  note: Note | null;
  entityType: string;
  entityId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: note?.title || '',
    content: note?.content || '',
    note_type: note?.note_type || 'general',
    is_private: note?.is_private || false,
    tags: note?.tags?.join(', ') || '',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : null,
        [`${entityType}_id`]: entityId,
      };

      if (note) {
        const { error } = await supabase.from('crm_notes').update(data).eq('id', note.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_notes').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-notes'] });
      toast.success(note ? 'Note updated successfully' : 'Note added successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save note');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {note ? 'Edit Note' : 'Add New Note'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title (Optional)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Note title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Write your note here..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={formData.note_type}
                onChange={(e) => setFormData({ ...formData, note_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="general">General</option>
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="internal">Internal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="important, follow-up"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_private}
                onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-700 flex items-center gap-1">
                <Lock className="h-4 w-4" />
                Private Note (only you can see this)
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.content}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? 'Saving...' : note ? 'Update Note' : 'Add Note'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
