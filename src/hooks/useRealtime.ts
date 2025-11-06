import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Subscribe to real-time quotation changes
 * Automatically updates the query cache when quotations are inserted, updated, or deleted
 */
export function useQuotationRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel('quotations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotations',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Quotation change received:', payload);

          // Invalidate and refetch quotations list
          queryClient.invalidateQueries({ queryKey: ['quotations'] });

          // Handle specific events
          if (payload.eventType === 'INSERT') {
            toast.success('New quotation created', {
              icon: '📝',
            });
          } else if (payload.eventType === 'UPDATE') {
            const quotation = payload.new;
            
            // Update specific quotation in cache
            queryClient.setQueryData(['quotations', quotation.id], quotation);
            
            // Show notification based on what changed
            if (quotation.approval_status === 'approved') {
              toast.success(`Quotation ${quotation.quotation_number} approved`, {
                icon: '✅',
              });
            } else if (quotation.approval_status === 'rejected') {
              toast.error(`Quotation ${quotation.quotation_number} rejected`, {
                icon: '❌',
              });
            } else {
              toast('Quotation updated', {
                icon: '🔄',
              });
            }
          } else if (payload.eventType === 'DELETE') {
            toast('Quotation deleted', {
              icon: '🗑️',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Subscribe to real-time customer changes
 */
export function useCustomerRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Customer change received:', payload);

          // Invalidate and refetch customers list
          queryClient.invalidateQueries({ queryKey: ['customers'] });

          if (payload.eventType === 'INSERT') {
            toast.success('New customer added', {
              icon: '👤',
            });
          } else if (payload.eventType === 'UPDATE') {
            const customer = payload.new;
            queryClient.setQueryData(['customers', customer.id], customer);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Subscribe to real-time product changes
 */
export function useProductRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Product change received:', payload);

          // Invalidate and refetch products list
          queryClient.invalidateQueries({ queryKey: ['products'] });

          if (payload.eventType === 'INSERT') {
            toast.success('New product added', {
              icon: '📦',
            });
          } else if (payload.eventType === 'UPDATE') {
            const product = payload.new;
            queryClient.setQueryData(['products', product.id], product);
            
            // Alert if stock is low
            if (product.stock_quantity <= product.min_stock_level) {
              toast.error(`Low stock alert: ${product.name}`, {
                icon: '⚠️',
                duration: 6000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Presence tracking for collaborative editing
 * Tracks who is currently viewing/editing a specific quotation
 */
export function useQuotationPresence(quotationId: string, userId: string, userName: string) {
  useEffect(() => {
    if (!quotationId || !userId) return;

    const channel: RealtimeChannel = supabase.channel(`quotation:${quotationId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Track presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence state:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        const user = newPresences[0];
        if (user && user.user_id !== userId) {
          toast(`${user.user_name} is viewing this quotation`, {
            icon: '👀',
            duration: 3000,
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            user_name: userName,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [quotationId, userId, userName]);
}

/**
 * Get list of users currently viewing a quotation
 */
export function useQuotationViewers(quotationId: string) {
  const getViewers = useCallback(async () => {
    const channel = supabase.channel(`quotation:${quotationId}`);
    await channel.subscribe();
    const presenceState = channel.presenceState();
    
    const viewers = Object.values(presenceState).flat().map((presence: any) => ({
      userId: presence.user_id,
      userName: presence.user_name,
      onlineAt: presence.online_at,
    }));

    return viewers;
  }, [quotationId]);

  return { getViewers };
}

/**
 * Broadcast typing indicator for collaborative editing
 */
export function useBroadcastTyping(quotationId: string, userId: string, userName: string) {
  const broadcastTyping = useCallback(
    async (isTyping: boolean) => {
      const channel = supabase.channel(`quotation:${quotationId}`);
      
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: userId,
          user_name: userName,
          is_typing: isTyping,
        },
      });
    },
    [quotationId, userId, userName]
  );

  return { broadcastTyping };
}

/**
 * Listen for typing indicators from other users
 */
export function useListenTyping(quotationId: string, onTyping: (userId: string, userName: string, isTyping: boolean) => void) {
  useEffect(() => {
    if (!quotationId) return;

    const channel: RealtimeChannel = supabase
      .channel(`quotation:${quotationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        onTyping(payload.user_id, payload.user_name, payload.is_typing);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quotationId, onTyping]);
}
