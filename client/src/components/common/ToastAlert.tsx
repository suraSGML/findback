import React from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext.js';

export const ToastAlert: React.FC = () => {
  const { activeToast, dismissToast } = useNotifications();
  const navigate = useNavigate();

  if (!activeToast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full">
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xl border border-slate-800 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">FindBack Notification</p>
          <h4 className="text-xs font-semibold text-white truncate mt-0.5">{activeToast.title}</h4>
          <p className="text-xs text-slate-300 mt-1 leading-normal">{activeToast.message}</p>
          {activeToast.link && (
            <button
              onClick={() => {
                navigate(activeToast.link!);
                dismissToast();
              }}
              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium mt-2"
            >
              View details <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={dismissToast}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
