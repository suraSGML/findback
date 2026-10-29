import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Lock, Mail } from 'lucide-react';
import { api } from '../../services/api.js';

export const PasswordRecoveryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const result = token
        ? await api.post<{ message: string }>('/auth/reset-password', { token, password })
        : await api.post<{ message: string }>('/auth/forgot-password', { email });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Password recovery failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {token ? 'Choose a new password' : 'Reset your password'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {token
              ? 'Password reset links expire after 30 minutes.'
              : 'We will email a one-time password reset link if the account exists.'}
          </p>
        </div>
        {error && (
          <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        {message && (
          <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />{message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          {token ? (
            <div>
              <label className="form-label" htmlFor="new-password">New password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="new-password" type="password" minLength={10} maxLength={128} required
                  autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)}
                  className="input-field pl-9 text-xs" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Use at least 10 characters.</p>
            </div>
          ) : (
            <div>
              <label className="form-label" htmlFor="recovery-email">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="recovery-email" type="email" required maxLength={254} autoComplete="email"
                  value={email} onChange={(event) => setEmail(event.target.value)}
                  className="input-field pl-9 text-xs" />
              </div>
            </div>
          )}
          <button type="submit" disabled={isLoading} className="btn-primary w-full h-10 text-xs">
            {isLoading ? 'Please wait...' : token ? 'Update password' : 'Send reset link'}
          </button>
        </form>
        <p className="text-center text-xs text-slate-500"><Link to="/login" className="text-emerald-700 font-semibold">Back to sign in</Link></p>
      </div>
    </div>
  );
};
