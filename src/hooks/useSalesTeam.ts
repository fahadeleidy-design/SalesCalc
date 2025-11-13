import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export function useSalesTeam() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['sales-team', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      // Sales Manager and CEO can see all sales reps and supervisors
      if (profile.role === 'sales_manager' || profile.role === 'ceo' || profile.role === 'admin') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('role', ['sales', 'supervisor'])
          .order('full_name');

        if (error) throw error;
        return data as TeamMember[];
      }

      // Supervisors can see their team members
      if (profile.role === 'supervisor') {
        const { data, error } = await supabase
          .from('sales_team_members')
          .select(`
            member:profiles!sales_team_members_member_id_fkey(
              id,
              full_name,
              email,
              role
            )
          `)
          .in('team_id', (
            await supabase
              .from('sales_teams')
              .select('id')
              .eq('manager_id', profile.id)
          ).data?.map(t => t.id) || [])
          .eq('is_active', true);

        if (error) throw error;

        const members = data?.map(item => (item as any).member).filter(Boolean) || [];
        return members as TeamMember[];
      }

      // Sales reps don't need to see team
      return [];
    },
    enabled: !!profile,
  });
}
