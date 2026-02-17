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

      // Manager, CEO and Admin can see all sales reps
      if (profile.role === 'manager' || profile.role === 'group_ceo' || profile.role === 'ceo_commercial' || profile.role === 'ceo_manufacturing' || profile.role === 'admin') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('role', 'sales')
          .order('full_name');

        if (error) throw error;
        return data as TeamMember[];
      }

      // Managers can also see their team members
      if (profile.role === 'manager') {
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
