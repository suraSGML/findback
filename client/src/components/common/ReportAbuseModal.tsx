import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { api } from '../../services/api.js';

export type ReportTarget = 'LOST_REPORT' | 'FOUND_REPORT' | 'CLAIM' | 'USER';

interface ReportAbuseModalProps {
  targetType: ReportTarget;
  targetId: string;
  onClose: () => void;
}

export const ReportAbuseModal: React.FC<ReportAbuseModalProps> = ({ targetType, targetId, onClose }) => {
  const [reason, setReason] = useState('Suspicious or fraudulent content');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.post('/reports', { targetType, targetId, reason, details });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit this report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/50 p-4 flex items-center justify-center" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-4" role="dialog" aria-modal="true" aria-labelledby="report-abuse-title">
        <div className="flex items-center justify-between">
          <h2 id="report-abuse-title" className="font-semibold text-slate-900">Report suspicious content</h2>
          <button type="button" onClick={onClose} aria-label="Close report dialog" className="p-1 text-slate-500 hover:text-slate-900"><X className="w-4 h-4" /></button>
        </div>
        {error && <div role="alert" className="text-xs text-rose-700 bg-rose-50 p-2 rounded flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        <div>
          <label htmlFor="report-reason" className="form-label">Reason</label>
          <select id="report-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="select-field">
            <option>Suspicious or fraudulent content</option>
            <option>Spam or duplicate report</option>
            <option>Harassment or unsafe behavior</option>
            <option>Personal information exposed</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="report-details" className="form-label">Details (optional)</label>
          <textarea id="report-details" maxLength={1000} rows={4} value={details} onChange={(event) => setDetails(event.target.value)} className="textarea-field" placeholder="Tell the moderation team what looks suspicious." />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Submitting...' : 'Submit report'}</button>
        </div>
      </form>
    </div>
  );
};
