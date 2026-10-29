import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotifications } from '../../context/NotificationContext.js';
import { Notification } from '../../types/index.js';

type NotificationFilter = 'ALL' | 'UNREAD' | 'READ';

const notificationTypeLabels: Record<Notification['type'], string> = {
  MATCH: 'Potential match',
  CLAIM: 'Ownership claim',
  MESSAGE: 'Message',
  MODERATION: 'Moderation update',
  SYSTEM: 'System update',
  OFFER: 'Offer',
  TRANSACTION: 'Return update',
};

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/notifications' } });
      return;
    }
    void fetchNotifications().then(({ pages: totalPages }) => setPages(totalPages)).catch(() => {
      setLoadError('Could not load notifications. Please try again.');
    });
  }, [user, navigate]);

  const visibleNotifications = notifications.filter((notification) => {
    if (filter === 'UNREAD') return !notification.read;
    if (filter === 'READ') return notification.read;
    return true;
  });

  const openNotification = (notification: Notification) => {
    if (!notification.read) void markAsRead(notification._id);
    if (notification.link) navigate(notification.link);
  };

  const loadOlderNotifications = async () => {
    const nextPage = page + 1;
    setIsLoadingOlder(true);
    setLoadError('');
    try {
      const result = await fetchNotifications(nextPage, true);
      setPage(nextPage);
      setPages(result.pages);
    } catch {
      setLoadError('Could not load older notifications. Please try again.');
    } finally {
      setIsLoadingOlder(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Read updates about your reports, claims, messages, and returned items.
                </p>
                <p className="mt-2 text-sm font-medium text-emerald-700">
                  {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => void markAllAsRead()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </button>
            )}
          </header>

          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-4 sm:px-7">
            {(['ALL', 'UNREAD', 'READ'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filter === value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {value === 'ALL' ? 'All' : value === 'UNREAD' ? `Unread${unreadCount ? ` (${unreadCount})` : ''}` : 'Read'}
              </button>
            ))}
          </div>

          {loadError && (
            <p role="alert" className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700 sm:px-7">
              {loadError}
            </p>
          )}

          {visibleNotifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Inbox className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                {notifications.length === 0 ? 'You’re all caught up' : `No ${filter.toLowerCase()} notifications`}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {notifications.length === 0
                  ? 'New updates about your FindBack activity will appear here.'
                  : 'Choose another filter to see your notifications.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleNotifications.map((notification) => (
                <article
                  key={notification._id}
                  className={`p-5 transition-colors sm:px-7 ${
                    notification.read ? 'bg-white' : 'bg-emerald-50/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      notification.read ? 'bg-slate-300' : 'bg-emerald-600'
                    }`} aria-label={notification.read ? 'Read' : 'Unread'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">{notification.title}</h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {notificationTypeLabels[notification.type]}
                        </span>
                        {!notification.read && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {notification.message}
                      </p>
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(notification.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {notification.link && (
                        <button
                          onClick={() => openNotification(notification)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                        >
                          View details
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                      {!notification.read && (
                        <button
                          onClick={() => void markAsRead(notification._id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {page < pages && (
            <div className="border-t border-slate-100 p-4 text-center">
              <button
                onClick={() => void loadOlderNotifications()}
                disabled={isLoadingOlder}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isLoadingOlder ? 'Loading...' : 'Load older notifications'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
