import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Phone, Mail, Calendar, MessageSquare, CheckCircle, ArrowRightCircle, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityTimelineProps {
  entityType: 'lead' | 'opportunity' | 'customer';
  entityId: string;
}

export default function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['crm-activities', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_activities')
        .select(`
          *,
          creator:profiles!crm_activities_created_by_fkey(full_name)
        `)
        .eq(`${entityType}_id`, entityId)
        .order('activity_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return { icon: Phone, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'email':
        return { icon: Mail, color: 'text-purple-600', bg: 'bg-purple-100' };
      case 'meeting':
        return { icon: Calendar, color: 'text-green-600', bg: 'bg-green-100' };
      case 'note':
        return { icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-100' };
      case 'task':
        return { icon: CheckCircle, color: 'text-orange-600', bg: 'bg-orange-100' };
      case 'conversion':
        return { icon: ArrowRightCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' };
      default:
        return { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100' };
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'successful':
      case 'interested':
      case 'meeting_scheduled':
        return 'text-green-700 bg-green-100';
      case 'needs_follow_up':
      case 'left_message':
      case 'no_answer':
        return 'text-amber-700 bg-amber-100';
      case 'not_interested':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-slate-700 bg-slate-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <p>No activities yet</p>
        <p className="text-sm mt-1">Start logging activities to track your interactions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const { icon: Icon, color, bg } = getActivityIcon(activity.activity_type);

        return (
          <div key={activity.id} className="relative flex gap-4">
            {/* Timeline line */}
            {index < activities.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-px bg-slate-200" />
            )}

            {/* Icon */}
            <div className={`relative flex-shrink-0 w-12 h-12 rounded-full ${bg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>

            {/* Content */}
            <div className={`flex-1 bg-white border border-slate-200 rounded-lg p-4 relative overflow-hidden ${activity.sentiment_label === 'risk' ? 'border-l-4 border-l-red-500' :
                activity.sentiment_label === 'critical' ? 'border-l-4 border-l-red-700' :
                  activity.sentiment_label === 'positive' ? 'border-l-4 border-l-green-500' :
                    ''
              }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900">{activity.subject}</h4>
                    {activity.sentiment_label && (
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${activity.sentiment_label === 'positive' ? 'bg-green-100 text-green-700' :
                          activity.sentiment_label === 'risk' ? 'bg-red-100 text-red-600' :
                            activity.sentiment_label === 'critical' ? 'bg-red-200 text-red-800' :
                              'bg-slate-100 text-slate-600'
                        }`}>
                        {activity.sentiment_label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                    <span className="capitalize">{activity.activity_type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(activity.activity_date), { addSuffix: true })}
                    </span>
                    {activity.duration_minutes && (
                      <>
                        <span>•</span>
                        <span>{activity.duration_minutes} min</span>
                      </>
                    )}
                  </div>
                </div>
                {activity.outcome && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(activity.outcome)}`}>
                    {activity.outcome.replace('_', ' ')}
                  </span>
                )}
              </div>

              {activity.description && (
                <p className="text-sm text-slate-700 mb-2">{activity.description}</p>
              )}

              {activity.sentiment_summary && (
                <p className="text-[11px] italic text-slate-500 mb-3 flex items-center gap-1">
                  <span className="opacity-70">AI Summary:</span> {activity.sentiment_summary}
                </p>
              )}

              {activity.follow_up_date && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded px-3 py-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">
                    Follow-up: {new Date(activity.follow_up_date).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <User className="h-3 w-3" />
                <span>{activity.creator?.full_name || 'Unknown'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
