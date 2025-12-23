import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  DollarSign,
  Calendar,
  User,
  TrendingUp,
  AlertCircle,
  Plus,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../lib/currencyUtils';
import toast from 'react-hot-toast';

interface Opportunity {
  id: string;
  name: string;
  amount: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  customer_id: string | null;
  created_at: string;
  customers?: {
    company_name: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface PipelineStage {
  id: string;
  name: string;
  probability: number;
  color: string;
}

const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'creating_proposition', name: 'Creating Proposition', probability: 35, color: '#8B5CF6' },
  { id: 'proposition_accepted', name: 'Proposition Accepted', probability: 65, color: '#3B82F6' },
  { id: 'going_our_way', name: 'Going Our Way', probability: 80, color: '#10B981' },
  { id: 'closing', name: 'Closing', probability: 90, color: '#F59E0B' },
];

export default function PipelineKanban() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null);

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['pipeline-opportunities', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('crm_opportunities')
        .select(`
          *,
          customers(company_name),
          profiles:assigned_to(full_name)
        `)
        .not('stage', 'in', '(closed_won,closed_lost)')
        .order('created_at', { ascending: false });

      if (profile?.role === 'sales') {
        query = query.eq('assigned_to', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!profile?.id,
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ oppId, newStage }: { oppId: string; newStage: string }) => {
      const stage = DEFAULT_STAGES.find((s) => s.id === newStage);
      const { error } = await supabase
        .from('crm_opportunities')
        .update({
          stage: newStage,
          probability: stage?.probability || 50,
        })
        .eq('id', oppId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-opportunities'] });
      toast.success('Deal moved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to move deal');
    },
  });

  const getOpportunitiesByStage = (stageId: string) => {
    return opportunities?.filter((opp) => opp.stage === stageId) || [];
  };

  const getStageTotal = (stageId: string) => {
    const opps = getOpportunitiesByStage(stageId);
    return opps.reduce((sum, opp) => sum + Number(opp.amount), 0);
  };

  const handleDragStart = (e: React.DragEvent, opportunity: Opportunity) => {
    setDraggedOpportunity(opportunity);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedOpportunity && draggedOpportunity.stage !== stageId) {
      updateStageMutation.mutate({
        oppId: draggedOpportunity.id,
        newStage: stageId,
      });
    }
    setDraggedOpportunity(null);
  };

  const getTotalPipelineValue = () => {
    return opportunities?.reduce((sum, opp) => sum + Number(opp.amount), 0) || 0;
  };

  const getWeightedPipelineValue = () => {
    return (
      opportunities?.reduce(
        (sum, opp) => sum + Number(opp.amount) * (opp.probability / 100),
        0
      ) || 0
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Total Pipeline</span>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(getTotalPipelineValue())}
          </p>
          <p className="text-xs text-slate-500 mt-1">{opportunities?.length || 0} deals</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Weighted Pipeline</span>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(getWeightedPipelineValue())}
          </p>
          <p className="text-xs text-slate-500 mt-1">Based on probability</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Average Deal Size</span>
            <DollarSign className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {opportunities && opportunities.length > 0
              ? formatCurrency(getTotalPipelineValue() / opportunities.length)
              : formatCurrency(0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Per opportunity</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Active Deals</span>
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{opportunities?.length || 0}</p>
          <p className="text-xs text-slate-500 mt-1">In pipeline</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="bg-slate-50 rounded-xl p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {DEFAULT_STAGES.map((stage) => {
            const stageOpps = getOpportunitiesByStage(stage.id);
            const stageTotal = getStageTotal(stage.id);

            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Stage Header */}
                <div
                  className="bg-white rounded-t-lg p-4 border-b-4"
                  style={{ borderBottomColor: stage.color }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{stage.name}</h3>
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                      {stageOpps.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{formatCurrency(stageTotal)}</span>
                    <span className="text-slate-500">{stage.probability}%</span>
                  </div>
                </div>

                {/* Stage Cards */}
                <div className="bg-slate-100 rounded-b-lg p-2 space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto">
                  {stageOpps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Plus className="h-8 w-8 mb-2" />
                      <p className="text-sm">No deals in {stage.name}</p>
                    </div>
                  ) : (
                    stageOpps.map((opp) => (
                      <div
                        key={opp.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp)}
                        className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-move border border-slate-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-slate-900 text-sm line-clamp-2">
                            {opp.name}
                          </h4>
                          <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                        </div>

                        {opp.customers?.company_name && (
                          <p className="text-xs text-slate-600 mb-2">
                            {opp.customers.company_name}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(opp.amount)}
                          </span>
                          <span>{opp.probability}%</span>
                        </div>

                        {opp.expected_close_date && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(opp.expected_close_date), 'MMM dd')}</span>
                          </div>
                        )}

                        {opp.profiles?.full_name && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <User className="h-3 w-3" />
                            <span>{opp.profiles.full_name}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
