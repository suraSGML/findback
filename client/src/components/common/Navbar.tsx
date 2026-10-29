import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  FileCheck2,
  MessageSquare,
  Bell,
  User as UserIcon,
  LogOut,
  Shield,
  Menu,
  X,
  Compass,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNotifications } from '../../context/NotificationContext.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isReturnedBrowse =
    location.pathname === '/browse' &&
    new URLSearchParams(location.search).get('tab') === 'returned';
  const isActive = (path: string) => {
    if (path === '/browse' && (location.pathname === '/browse' || location.pathname === '/lost-found')) {
      return !isReturnedBrowse;
    }
    return location.pathname === path;
  };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-7">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Compass className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-base text-slate-900 tracking-tight">
                  FindBack
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded">
                  Free
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/browse"
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive('/browse')
                    ? 'text-emerald-700 bg-emerald-50/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Browse Registry
              </Link>
              <Link
                to="/browse?tab=returned"
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isReturnedBrowse
                    ? 'text-emerald-700 bg-emerald-50/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Returned Items
              </Link>

              {user && (
                <>
                  <Link
                    to="/matches"
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/matches')
                        ? 'text-emerald-700 bg-emerald-50/80 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Matches
                  </Link>

                  <Link
                    to="/claims"
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/claims')
                        ? 'text-emerald-700 bg-emerald-50/80 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
                    Claims
                  </Link>

                  <Link
                    to="/messages"
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/messages')
                        ? 'text-emerald-700 bg-emerald-50/80 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    Messages
                  </Link>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <Link
                  to="/dashboard/admin"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/dashboard/admin')
                      ? 'text-purple-700 bg-purple-50 font-semibold'
                      : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50/50'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin Console
                </Link>
              )}

              <Link
                to="/about"
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive('/about')
                    ? 'text-emerald-700 bg-emerald-50/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                About
              </Link>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* Authenticated Controls */}
            {user ? (
              <div className="flex items-center gap-1.5">
                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotifOpen && (
                    <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                      <div className="px-3.5 pb-2 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="font-semibold text-xs text-slate-900">Notifications</h4>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 6).map((n) => (
                            <div
                              key={n._id}
                              onClick={() => {
                                markAsRead(n._id);
                                if (n.link) navigate(n.link);
                                setIsNotifOpen(false);
                              }}
                              className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                                !n.read ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1 mb-0.5">
                                <span className="font-semibold text-slate-900">{n.title}</span>
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1 shrink-0" />}
                              </div>
                              <p className="text-slate-500 text-xs line-clamp-2">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                      <Link
                        to="/notifications"
                        onClick={() => setIsNotifOpen(false)}
                        className="block border-t border-slate-100 px-3.5 py-2.5 text-center text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>

                {/* User Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-slate-800 text-white font-medium text-xs flex items-center justify-center">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {user.city || 'Unknown'} • {user.role}
                        </span>
                      </div>

                      <Link
                        to="/dashboard"
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        My Dashboard
                      </Link>
                      <Link
                        to="/notifications"
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5 text-slate-400" />
                        Notifications
                        {unreadCount > 0 && (
                          <span className="ml-auto rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </Link>

                      {user.role === 'ADMIN' && (
                        <Link
                          to="/dashboard/admin"
                          onClick={() => setIsProfileOpen(false)}
                          className="w-full text-left px-3 py-2 text-purple-700 hover:bg-purple-50 flex items-center gap-2 transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5 text-purple-600" />
                          Admin Console
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          logout();
                          setIsProfileOpen(false);
                          navigate('/');
                        }}
                        className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100 mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="btn-ghost h-8 px-3 text-xs"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary h-8 px-3 text-xs"
                >
                  Create Account
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 text-sm">
          <Link
            to="/browse"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
          >
            Browse Registry
          </Link>
          <Link
            to="/browse?tab=returned"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Returned Items
          </Link>

          {user && (
            <>
              <Link
                to="/matches"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
              >
                Matches
              </Link>
              <Link
                to="/claims"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
              >
                Claims
              </Link>
              <Link
                to="/messages"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
              >
                Messages
              </Link>
              <Link
                to="/notifications"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
              >
                My Dashboard
              </Link>
            </>
          )}

          {user?.role === 'ADMIN' && (
            <Link
              to="/dashboard/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md font-medium text-purple-700 hover:bg-purple-50"
            >
              Admin Console
            </Link>
          )}

          <Link
            to="/about"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md font-medium text-slate-700 hover:bg-slate-50"
          >
            About FindBack
          </Link>

          {!user && (
            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn-ghost h-9 text-xs flex-1 justify-center"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn-primary h-9 text-xs flex-1 justify-center"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
