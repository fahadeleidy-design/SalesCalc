import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  type: 'approval_request' | 'approval_approved' | 'approval_rejected' | 'comment' | 'mention' | 'assignment';
  title: string;
  message: string;
  quotation_id: string | null;
  quotation_number: string | null;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
}

/**
 * Fetch and manage user notifications
 */
export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();

  // Fetch initial notifications
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    };

    fetchNotifications();
  }, [userId]);

  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!userId) return;

    const channel: RealtimeChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast notification
          showNotificationToast(newNotification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          
          // Recalculate unread count
          setUnreadCount(prev => {
            const oldNotification = notifications.find(n => n.id === updatedNotification.id);
            if (oldNotification && !oldNotification.is_read && updatedNotification.is_read) {
              return prev - 1;
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, notifications]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
      return;
    }

    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
      return;
    }

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
      return;
    }

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
      return;
    }

    setNotifications([]);
    setUnreadCount(0);
    toast.success('All notifications cleared');
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}

/**
 * Show toast notification based on type
 */
function showNotificationToast(notification: Notification) {
  const options = {
    duration: 5000,
    position: 'top-right' as const,
  };

  switch (notification.type) {
    case 'approval_request':
      toast(notification.message, {
        ...options,
        icon: '📋',
      });
      break;

    case 'approval_approved':
      toast.success(notification.message, {
        ...options,
        icon: '✅',
      });
      break;

    case 'approval_rejected':
      toast.error(notification.message, {
        ...options,
        icon: '❌',
      });
      break;

    case 'comment':
      toast(notification.message, {
        ...options,
        icon: '💬',
      });
      break;

    case 'mention':
      toast(notification.message, {
        ...options,
        icon: '@',
      });
      break;

    case 'assignment':
      toast(notification.message, {
        ...options,
        icon: '👤',
      });
      break;

    default:
      toast(notification.message, options);
  }
}

/**
 * Create a new notification
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        ...notification,
        is_read: false,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  return data as Notification;
}

/**
 * Create approval request notification
 */
export async function notifyApprovalRequest(
  approverId: string,
  quotationId: string,
  quotationNumber: string,
  requesterName: string
) {
  return createNotification({
    user_id: approverId,
    type: 'approval_request',
    title: 'New Approval Request',
    message: `${requesterName} has submitted quotation ${quotationNumber} for your approval`,
    quotation_id: quotationId,
    quotation_number: quotationNumber,
    action_url: `/quotations/${quotationId}`,
  });
}

/**
 * Create approval decision notification
 */
export async function notifyApprovalDecision(
  creatorId: string,
  quotationId: string,
  quotationNumber: string,
  approved: boolean,
  approverName: string,
  comments?: string
) {
  return createNotification({
    user_id: creatorId,
    type: approved ? 'approval_approved' : 'approval_rejected',
    title: approved ? 'Quotation Approved' : 'Quotation Rejected',
    message: approved
      ? `${approverName} approved quotation ${quotationNumber}`
      : `${approverName} rejected quotation ${quotationNumber}${comments ? `: ${comments}` : ''}`,
    quotation_id: quotationId,
    quotation_number: quotationNumber,
    action_url: `/quotations/${quotationId}`,
  });
}
