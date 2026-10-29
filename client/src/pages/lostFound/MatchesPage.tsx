import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Info,
  Layers,
  FileText,
  X,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { LostFoundMatch } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { Badge } from '../../components/common/Badge.js';
import { EmptyState } from '../../components/common/EmptyState.js';

type MatchTab = 'active' | 'resolved' | 'dismissed';

export const MatchesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<LostFoundMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MatchTab>('active');

  // Claim modal state
  const [selectedMatchForClaim, setSelectedMatchForClaim] = useState<LostFoundMatch | null>(null);
  const [proofDescription, setProofDescription] = useState('');
  const [distinguishingFeaturesAnswer, setDistinguishingFeaturesAnswer] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchMatches();
  }, [user]);

  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; matches: LostFoundMatch[] }>('/lost-found/matches');
      if (res.success && res.matches) {
        setMatches(res.matches);
      }
    } catch (err) {
      console.error('Failed to load matches', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismissMatch = async (matchId: string) => {
    try {
      await api.put(`/lost-found/matches/${matchId}`, {
        status: 'DISMISSED',
        dismissReason: 'Not my item',
      });
      fetchMatches();
    } catch (err) {
      console.error('Dismiss error', err);
    }
  };

  const handleRestoreMatch = async (matchId: string) => {
    try {
      await api.put(`/lost-found/matches/${matchId}`, {
        status: 'SUGGESTED',
      });
      fetchMatches();
    } catch (err) {
      console.error('Restore error', err);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchForClaim) return;
    setClaimError('');
    setIsSubmittingClaim(true);

    try {
      const res = await api.post<{ success: boolean }>('/claims', {
        foundReportId: selectedMatchForClaim.foundReport._id,
        lostReportId: selectedMatchForClaim.lostReport._id,
        proofDescription,
        distinguishingFeaturesAnswer,
        serialNumber,
      });

      if (res.success) {
        setSelectedMatchForClaim(null);
        navigate(`/claims`);
      }
    } catch (err: any) {
      setClaimError(err.message || 'Failed to submit claim.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const isResolvedOrReturned = (match: LostFoundMatch) => {
    return (
      match.status === 'CONFIRMED' ||
      match.lostReport?.status === 'RETURNED' ||
      match.lostReport?.status === 'MATCH_CONFIRMED' ||
      match.foundReport?.status === 'RETURNED' ||
      match.foundReport?.status === 'CLAIM_APPROVED'
    );
  };

  const isDismissed = (match: LostFoundMatch) => {
    return match.status === 'DISMISSED';
  };

  const activeMatches = matches.filter((m) => !isResolvedOrReturned(m) && !isDismissed(m));
  const resolvedMatches = matches.filter((m) => isResolvedOrReturned(m));
  const dismissedMatches = matches.filter((m) => isDismissed(m) && !isResolvedOrReturned(m));

  const currentList =
    activeTab === 'active'
      ? activeMatches
      : activeTab === 'resolved'
      ? resolvedMatches
      : dismissedMatches;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Heuristic Match Feed
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Statistical correlations calculated across your lost reports and newly logged found property
          </p>
        </div>

        <Link
          to="/browse"
          className="btn-secondary h-8 px-3 text-xs self-start sm:self-auto"
        >
          Browse All Registry Items &rarr;
        </Link>
      </div>

      {/* Protocol Banner */}
      <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 leading-normal">
          <strong className="text-slate-900">Anti-Fraud Verification:</strong> Match scores represent algorithmic probability. To claim an item, provide verifiable answers or describe concealed identifying characteristics. The finder will review your submission before releasing the item.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 relative flex items-center gap-1.5 transition-colors ${
            activeTab === 'active'
              ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Active Suggestions</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600 font-bold">
            {activeMatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('resolved')}
          className={`pb-3 relative flex items-center gap-1.5 transition-colors ${
            activeTab === 'resolved'
              ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Resolved & Returned</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-700 font-bold">
            {resolvedMatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dismissed')}
          className={`pb-3 relative flex items-center gap-1.5 transition-colors ${
            activeTab === 'dismissed'
              ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Dismissed</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-500 font-bold">
            {dismissedMatches.length}
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-xs">Computing match vectors...</div>
      ) : currentList.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={
            activeTab === 'active'
              ? 'No active correlations detected'
              : activeTab === 'resolved'
              ? 'No returned/resolved matches yet'
              : 'No dismissed correlations'
          }
          description={
            activeTab === 'active'
              ? 'All matched items have either been claimed, returned, or dismissed. New reports will appear here automatically.'
              : activeTab === 'resolved'
              ? 'When a matched lost item is verified and returned to its owner, it will be cataloged here.'
              : 'Items you mark as "Not My Item" will appear here in case you want to restore them.'
          }
          actionLabel="Browse Found Registry"
          onAction={() => navigate('/browse?tab=found')}
        />
      ) : (
        <div className="space-y-5">
          {currentList.map((match) => {
            const resolved = isResolvedOrReturned(match);
            const dismissed = isDismissed(match);

            return (
              <div
                key={match._id}
                className={`bg-white rounded-xl border shadow-sm p-5 sm:p-6 space-y-5 ${
                  resolved
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : dismissed
                    ? 'border-slate-200 opacity-75'
                    : 'border-slate-200'
                }`}
              >
                {/* Score Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-lg border font-bold text-base flex items-center justify-center shrink-0 ${
                        resolved
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {match.matchScore}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold text-slate-900">
                          Match for "{match.lostReport?.title}"
                        </h2>
                        <Badge variant={resolved ? 'emerald' : 'info'}>
                          {resolved ? 'RETURNED & RESOLVED' : `${match.matchScore}% Confidence`}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Correlated found item:{' '}
                        <strong className="text-slate-700">{match.foundReport?.title}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {resolved ? (
                      <Link
                        to="/claims"
                        className="btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View Return in Claims &rarr;</span>
                      </Link>
                    ) : dismissed ? (
                      <button
                        onClick={() => handleRestoreMatch(match._id)}
                        className="btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-600" />
                        <span>Restore to Active</span>
                      </button>
                    ) : user &&
                      (match.foundReport?.finder?._id === user._id ||
                        (match.foundReport?.finder as any) === user._id) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                          You Reported Found
                        </span>
                        <Link
                          to="/claims"
                          className="btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>View Claims</span>
                        </Link>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleDismissMatch(match._id)}
                          className="btn-ghost h-8 px-3 text-xs text-slate-500 hover:text-slate-800"
                        >
                          Not My Item
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMatchForClaim(match);
                            setProofDescription('');
                            setDistinguishingFeaturesAnswer('');
                            setSerialNumber('');
                          }}
                          className="btn-primary h-8 px-3.5 text-xs inline-flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>File Claim</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lost Report */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-rose-600" />
                        Your Lost Report
                      </span>
                      <Badge variant="danger" size="sm">
                        {match.lostReport?.status || 'LOST'}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-xs text-slate-900">{match.lostReport?.title}</h3>
                    <p className="text-xs text-slate-600 leading-normal">{match.lostReport?.description}</p>
                    <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/80 space-y-0.5">
                      <div>
                        <strong>City:</strong> {match.lostReport?.city || 'Addis Ababa'}
                      </div>
                      <div>
                        <strong>Location:</strong> {match.lostReport?.locationName || 'General Area'}
                      </div>
                      <div>
                        <strong>Date Lost:</strong>{' '}
                        {match.lostReport?.dateLost ? new Date(match.lostReport.dateLost).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Found Report */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Discovered Found Item
                      </span>
                      <Badge variant="emerald" size="sm">
                        {match.foundReport?.status || 'FOUND'}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-xs text-slate-900">{match.foundReport?.title}</h3>
                    <p className="text-xs text-slate-600 leading-normal">{match.foundReport?.description}</p>
                    <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/80 space-y-0.5">
                      <div>
                        <strong>Discovery City:</strong> {match.foundReport?.city || 'Addis Ababa'}
                      </div>
                      <div>
                        <strong>Location:</strong> {match.foundReport?.locationName || 'Discovery Site'}
                      </div>
                      <div>
                        <strong>Date Found:</strong>{' '}
                        {match.foundReport?.dateFound ? new Date(match.foundReport.dateFound).toLocaleDateString() : 'N/A'}
                      </div>
                      <div>
                        <strong>Custody:</strong>{' '}
                        {match.foundReport?.custodyStatus?.replace(/_/g, ' ') || 'With finder'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Algorithmic Breakdown */}
                <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Similarity Weight Breakdown
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                        <span>Category</span>
                        <span>{match.breakdown?.category || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${match.breakdown?.category || 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                        <span>Location</span>
                        <span>{match.breakdown?.location || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${match.breakdown?.location || 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                        <span>Date / Timing</span>
                        <span>{match.breakdown?.date || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${match.breakdown?.date || 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                        <span>Brand / Model</span>
                        <span>{match.breakdown?.brand || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${match.breakdown?.brand || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Claim Submission Modal */}
      {selectedMatchForClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Claim Ownership for "{selectedMatchForClaim.foundReport?.title}"
                </h3>
              </div>
              <button
                onClick={() => setSelectedMatchForClaim(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Correlated with your lost report: <strong>"{selectedMatchForClaim.lostReport?.title}"</strong>. Provide proof details so the finder can verify your identity.
            </p>

            {claimError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {claimError}
              </div>
            )}

            <form onSubmit={handleSubmitClaim} className="space-y-4 text-xs">
              <div>
                <label className="form-label">
                  Proof of Ownership Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={3000}
                  value={proofDescription}
                  onChange={(e) => setProofDescription(e.target.value)}
                  placeholder="Describe unique characteristics, contents, wallpaper, or markings..."
                  className="textarea-field text-xs"
                />
              </div>

              <div>
                <label className="form-label">
                  Distinguishing Features <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={1000}
                  value={distinguishingFeaturesAnswer}
                  onChange={(e) => setDistinguishingFeaturesAnswer(e.target.value)}
                  placeholder="e.g. Scratched logo, specific keychain, custom case..."
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="form-label">Serial Number or Device IMEI (Optional)</label>
                <input
                  type="text"
                  maxLength={200}
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. Serial or IMEI number"
                  className="input-field text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMatchForClaim(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5"
                >
                  {isSubmittingClaim ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
