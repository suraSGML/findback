import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notification } from '../types/index.js';
import { api } from '../services/api.js';
import { getSocket } from '../services/socket.js';
import { useAuth } from './AuthContext.js';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: (page?: number, append?: boolean) => Promise<{ pages: number }>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  activeToast: Notification | null;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);

  const fetchNotifications = async (page = 1, append = false): Promise<{ pages: number }> => {
    if (!user) return { pages: 1 };
    try {
      const res = await api.get<{
        success: boolean;
        notifications: Notification[];
        unreadCount: number;
        pagination?: { pages: number };
      }>(
        `/notifications?page=${page}&limit=50`
      );
      if (res.success) {
        setNotifications((previous) => {
          if (!append) return res.notifications;
          const byId = new Map(previous.map((notification) => [notification._id, notification]));
          res.notifications.forEach((notification) => byId.set(notification._id, notification));
          return [...byId.values()].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        setUnreadCount(res.unreadCount);
      }
      return { pages: res.pagination?.pages ?? 1 };
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      throw err;
    }
    return { pages: 1 };
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    void fetchNotifications().catch(() => undefined);

    const socket = getSocket();
    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setActiveToast(notification);

      // Auto dismiss toast after 6 seconds
      setTimeout(() => {
        setActiveToast((current) => (current?._id === notification._id ? null : current));
      }, 6000);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      const wasUnread = notifications.some((notification) => notification._id === id && !notification.read);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/all/read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const dismissToast = () => setActiveToast(null);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        activeToast,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
