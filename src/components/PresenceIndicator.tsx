import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

interface User {
  userId: string;
  userName: string;
  onlineAt: string;
}

interface PresenceIndicatorProps {
  quotationId: string;
  currentUserId: string;
}

/**
 * Shows who is currently viewing/editing a quotation
 * Displays user avatars and names in real-time
 */
export function PresenceIndicator({ quotationId, currentUserId }: PresenceIndicatorProps) {
  const [viewers, setViewers] = useState<User[]>([]);
  const [isTyping, setIsTyping] = useState<Map<string, string>>(new Map());

  // Filter out current user from viewers
  const otherViewers = viewers.filter(v => v.userId !== currentUserId);

  if (otherViewers.length === 0 && isTyping.size === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
      <Users className="w-4 h-4 text-blue-600" />
      
      <div className="flex items-center gap-2">
        {/* User Avatars */}
        <div className="flex -space-x-2">
          {otherViewers.slice(0, 3).map((viewer) => (
            <div
              key={viewer.userId}
              className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
              title={viewer.userName}
            >
              {getInitials(viewer.userName)}
            </div>
          ))}
        </div>

        {/* Viewer Names */}
        <div className="text-sm text-blue-700">
          {otherViewers.length === 1 && (
            <span>{otherViewers[0].userName} is viewing</span>
          )}
          {otherViewers.length === 2 && (
            <span>{otherViewers[0].userName} and {otherViewers[1].userName} are viewing</span>
          )}
          {otherViewers.length > 2 && (
            <span>
              {otherViewers[0].userName} and {otherViewers.length - 1} others are viewing
            </span>
          )}
        </div>

        {/* Typing Indicator */}
        {isTyping.size > 0 && (
          <div className="flex items-center gap-1 ml-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-blue-600 ml-1">
              {Array.from(isTyping.values())[0]} is typing...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get user initials from full name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Typing indicator badge
 */
interface TypingIndicatorProps {
  userName: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{userName} is typing...</span>
    </div>
  );
}

/**
 * Online status badge
 */
interface OnlineStatusProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function OnlineStatus({ isOnline, size = 'md' }: OnlineStatusProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className="relative inline-flex">
      <span
        className={`${sizeClasses[size]} rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
      {isOnline && (
        <span
          className={`absolute ${sizeClasses[size]} rounded-full bg-green-500 animate-ping opacity-75`}
        />
      )}
    </div>
  );
}

/**
 * User avatar with presence indicator
 */
interface UserAvatarProps {
  userName: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  imageUrl?: string;
}

export function UserAvatar({ userName, isOnline = false, size = 'md', imageUrl }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const statusSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <div className="relative inline-flex">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={userName}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white shadow-sm flex items-center justify-center text-white font-semibold`}
        >
          {getInitials(userName)}
        </div>
      )}
      
      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizeClasses[size]} bg-green-500 border-2 border-white rounded-full`}
        />
      )}
    </div>
  );
}
