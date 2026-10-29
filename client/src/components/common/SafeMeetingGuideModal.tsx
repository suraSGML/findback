import React from 'react';
import { ShieldCheck, MapPin, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';

interface SafeMeetingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafeMeetingGuideModal: React.FC<SafeMeetingGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-xl w-full p-6 sm:p-7 shadow-xl border border-slate-200 overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Safe Public Handover Protocol</h3>
            <p className="text-xs text-slate-500">Community Safety & Anti-Fraud Guidelines</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-5 leading-normal">
          When coordinating a physical handover for a lost or found possession, please follow these standard safety guidelines:
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-slate-900">Choose Busy Public Locations</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                Always meet in popular, well-lit spaces with continuous foot traffic — such as a public transit concourse, shopping mall foyer, or near security desks. Never meet in secluded areas or private residences.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-slate-900">Meet During Daylight</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                Schedule handovers during regular daylight hours. Let a trusted colleague or family member know your expected meeting time and location.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-slate-900">Verify Ownership On Site</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                Ask the claimant to unlock device screens, state distinguishing serial suffixes, or present matching identification before releasing physical custody.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/70 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-amber-900">Zero Upfront Recovery Fees</h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-normal">
                FindBack is completely free. Never transfer unverified advance courier or release fees. Keep all communication within the platform.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn-primary w-full"
        >
          I Understand & Acknowledge Safety Guidelines
        </button>
      </div>
    </div>
  );
};
