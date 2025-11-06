import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  userId: string;
}

/**
 * Notification Center Component
 * Displays real-time notifications with actions
 */
export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications(userId);

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mark All as Read */}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}

                {/* Clear All */}
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all notifications?')) {
                        clearAll();
                      }
                    }}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Bell className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Individual Notification Item
 */
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getIcon = () => {
    switch (notification.type) {
      case 'approval_request':
        return '📋';
      case 'approval_approved':
        return '✅';
      case 'approval_rejected':
        return '❌';
      case 'comment':
        return '💬';
      case 'mention':
        return '@';
      case 'assignment':
        return '👤';
      default:
        return '🔔';
    }
  };

  const getBgColor = () => {
    if (!notification.is_read) {
      return 'bg-blue-50 hover:bg-blue-100';
    }
    return 'hover:bg-gray-50';
  };

  return (
    <div
      className={`relative p-4 transition-colors cursor-pointer ${getBgColor()}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (!notification.is_read) {
          onMarkAsRead(notification.id);
        }
        if (notification.action_url) {
          window.location.href = notification.action_url;
        }
      }}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-2xl">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">
              {notification.title}
            </p>
            
            {/* Unread Indicator */}
            {!notification.is_read && (
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </div>

          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {notification.message}
          </p>

          {notification.quotation_number && (
            <p className="mt-1 text-xs text-gray-500">
              Quotation: {notification.quotation_number}
            </p>
          )}

          <p className="mt-2 text-xs text-gray-400">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>

        {/* Actions (shown on hover) */}
        {isHovered && (
          <div className="flex items-start gap-1">
            {!notification.is_read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                title="Mark as read"
              >
                <Check className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
