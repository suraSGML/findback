import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  Package,
  Search,
  MapPin,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Pencil,
  X,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { LostReport, FoundReport, Claim, LostFoundMatch } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { Badge } from '../../components/common/Badge.js';

export const UserDashboard: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'lost' | 'found' | 'matches' | 'claims'>('overview');
  const [myLostReports, setMyLostReports] = useState<LostReport[]>([]);
  const [myFoundReports, setMyFoundReports] = useState<FoundReport[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [myMatches, setMyMatches] = useState<LostFoundMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', bio: '', phone: '', city: '', avatar: '' });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role === 'ADMIN') {
      navigate('/dashboard/admin');
      return;
    }
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [lostRes, foundRes, claimsRes, matchesRes] = await Promise.all([
        api.get<{ success: boolean; reports: LostReport[] }>(`/lost-found/lost?reporterId=${user?._id}`),
        api.get<{ success: boolean; reports: FoundReport[] }>(`/lost-found/found?finderId=${user?._id}`),
        api.get<{ success: boolean; claims: Claim[] }>('/claims/my-claims'),
        api.get<{ success: boolean; matches: LostFoundMatch[] }>('/lost-found/matches'),
      ]);

      if (lostRes.success && lostRes.reports) setMyLostReports(lostRes.reports);
      if (foundRes.success && foundRes.reports) setMyFoundReports(foundRes.reports);
      if (claimsRes.success && claimsRes.claims) setMyClaims(claimsRes.claims);
      if (matchesRes.success && matchesRes.matches) setMyMatches(matchesRes.matches);
    } catch (err) {
      console.error('User dashboard error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkResolved = async (reportId: string) => {
    if (!window.confirm('Close this lost item report? Closing it will remove it from active matching.')) return;
    try {
      const res = await api.put<{ success: boolean }>(`/lost-found/lost/${reportId}`, {
        status: 'CLOSED',
      });
      if (res.success) {
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update report status');
    }
  };

  const openProfileEditor = () => {
    setProfileForm({
      name: user?.name || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      city: user?.city || '',
      avatar: user?.avatar || '',
    });
    setProfileError('');
    setIsProfileEditorOpen(true);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError('');
    setIsSavingProfile(true);
    try {
      await api.put('/auth/profile', profileForm);
      await refreshProfile();
      setIsProfileEditorOpen(false);
    } catch (requestError) {
      setProfileError(requestError instanceof Error ? requestError.message : 'Failed to update your profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const activeLostCount = myLostReports.filter((r) => ['ACTIVE', 'OPEN', 'POTENTIAL_MATCH', 'POSSIBLE_MATCH'].includes(r.status)).length;
  const activeFoundCount = myFoundReports.filter((r) => ['AVAILABLE_FOR_CLAIM', 'REPORTED', 'UNDER_REVIEW'].includes(r.status)).length;
  const pendingClaimsCount = myClaims.filter((c) => ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUESTED'].includes(c.status)).length;

  const isMatchResolved = (m: LostFoundMatch) => {
    return (
      m.status === 'CONFIRMED' ||
      m.status === 'DISMISSED' ||
      m.lostReport?.status === 'RETURNED' ||
      m.lostReport?.status === 'CLOSED' ||
      m.lostReport?.status === 'MATCH_CONFIRMED' ||
      m.foundReport?.status === 'RETURNED' ||
      m.foundReport?.status === 'CLOSED' ||
      m.foundReport?.status === 'CLAIM_APPROVED'
    );
  };

  const activeMatches = myMatches.filter((m) => !isMatchResolved(m));
  const resolvedMatches = myMatches.filter((m) => isMatchResolved(m));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {user?.name}
            </h1>
            <Badge variant="emerald" size="sm">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Verified Community Member
            </Badge>
          </div>
          <button type="button" onClick={openProfileEditor} className="btn-secondary h-9 px-3 text-xs self-start md:self-auto">
            <Pencil className="w-3.5 h-3.5" /> Edit profile
          </button>
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{user?.city || 'Addis Ababa'}, {user?.country || 'Ethiopia'}</span>
            <span>•</span>
            <span>{user?.email}</span>
            {user?.phone && (
              <>
                <span>•</span>
                <span>{user.phone}</span>
              </>
            )}
          </p>
        </div>

        {/* Reputation & Trust Stats */}
        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 self-start md:self-auto">
          <div className="text-center px-2">
            <div className="text-lg font-bold text-slate-900">{user?.reputation?.itemsReturned || 0}</div>
            <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Returned</div>
          </div>
          <div className="w-px h-7 bg-slate-200" />
          <div className="text-center px-2">
            <div className="text-lg font-bold text-slate-900">{user?.reputation?.itemsRecovered || 0}</div>
            <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Recovered</div>
          </div>
          <div className="w-px h-7 bg-slate-200" />
          <div className="text-center px-2">
            <div className="text-lg font-bold text-emerald-700">100%</div>
            <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Free Platform</div>
          </div>
        </div>
      </div>

      {isProfileEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-4 flex items-center justify-center" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsProfileEditorOpen(false);
        }}>
          <form onSubmit={saveProfile} className="w-full max-w-lg bg-white rounded-xl p-5 shadow-xl space-y-4" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
            <div className="flex items-center justify-between">
              <h2 id="profile-editor-title" className="font-semibold text-slate-900">Edit profile</h2>
              <button type="button" onClick={() => setIsProfileEditorOpen(false)} aria-label="Close profile editor"><X className="w-4 h-4" /></button>
            </div>
            {profileError && <p role="alert" className="text-xs text-rose-700 bg-rose-50 p-2 rounded">{profileError}</p>}
            <label className="block"><span className="form-label">Name</span><input required maxLength={100} className="input-field" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /></label>
            <label className="block"><span className="form-label">Phone</span><input maxLength={40} className="input-field" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} /></label>
            <label className="block"><span className="form-label">City</span><input required maxLength={100} className="input-field" value={profileForm.city} onChange={(event) => setProfileForm({ ...profileForm, city: event.target.value })} /></label>
            <label className="block"><span className="form-label">Avatar URL</span><input type="url" maxLength={2048} className="input-field" value={profileForm.avatar} onChange={(event) => setProfileForm({ ...profileForm, avatar: event.target.value })} /></label>
            <label className="block"><span className="form-label">Bio</span><textarea rows={3} maxLength={500} className="textarea-field" value={profileForm.bio} onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })} /></label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsProfileEditorOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={isSavingProfile} className="btn-primary">{isSavingProfile ? 'Saving...' : 'Save profile'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/report-lost"
          className="p-3.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-3 shadow-sm"
        >
          <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs text-slate-900">Report Lost</h3>
            <p className="text-[11px] text-slate-500">File a missing item</p>
          </div>
        </Link>

        <Link
          to="/report-found"
          className="p-3.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-3 shadow-sm"
        >
          <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs text-slate-900">Report Found</h3>
            <p className="text-[11px] text-slate-500">Post discovered item</p>
          </div>
        </Link>

        <Link
          to="/browse"
          className="p-3.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-3 shadow-sm"
        >
          <div className="w-9 h-9 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs text-slate-900">Public Feed</h3>
            <p className="text-[11px] text-slate-500">Search all items</p>
          </div>
        </Link>

        <Link
          to="/messages"
          className="p-3.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-3 shadow-sm"
        >
          <div className="w-9 h-9 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs text-slate-900">Messages</h3>
            <p className="text-[11px] text-slate-500">Handover chats</p>
          </div>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'lost', label: `My Lost Reports (${myLostReports.length})` },
          { key: 'found', label: `Items I Found (${myFoundReports.length})` },
          { key: 'matches', label: `Matches (${activeMatches.length})` },
          { key: 'claims', label: `My Claims (${myClaims.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3.5 py-2 font-medium text-xs whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-800 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-xs">Loading dashboard data...</div>
      ) : activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Stat Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Lost</span>
              <div className="text-2xl font-bold text-slate-900">{activeLostCount}</div>
              <p className="text-[11px] text-slate-500">Items being correlated</p>
            </div>
            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">In Custody</span>
              <div className="text-2xl font-bold text-slate-900">{activeFoundCount}</div>
              <p className="text-[11px] text-slate-500">Found items stored</p>
            </div>
            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Matches</span>
              <div className="text-2xl font-bold text-emerald-700">{activeMatches.length}</div>
              <p className="text-[11px] text-slate-500">Active correlations</p>
            </div>
            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Claims</span>
              <div className="text-2xl font-bold text-slate-900">{pendingClaimsCount}</div>
              <p className="text-[11px] text-slate-500">Under verification</p>
            </div>
          </div>

          {/* Quick Matches Teaser */}
          {activeMatches.length > 0 && (
            <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-semibold text-slate-900">
                    High-Confidence Matches Found
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('matches')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  View All ({activeMatches.length}) <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {activeMatches.slice(0, 2).map((m) => (
                  <div key={m._id} className="p-3 bg-white rounded-lg border border-emerald-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="emerald" size="sm">{m.matchScore}% Match</Badge>
                        <span className="text-xs font-semibold text-slate-900">{m.foundReport?.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {m.foundReport?.city || 'Addis Ababa'} • Matches: "{m.lostReport?.title}"
                      </p>
                    </div>
                    <Link
                      to={`/claims?foundReportId=${m.foundReport?._id}`}
                      className="btn-primary h-7 px-2.5 text-xs"
                    >
                      Verify
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reports Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Lost */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-rose-600" />
                  Recent Lost Items
                </h3>
                <button
                  onClick={() => setActiveTab('lost')}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Manage
                </button>
              </div>
              {myLostReports.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No lost items reported.</p>
              ) : (
                <div className="space-y-2">
                  {myLostReports.slice(0, 3).map((r) => (
                    <div key={r._id} className="p-2.5 rounded-md bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{r.title}</div>
                        <div className="text-[11px] text-slate-500">{r.city} • {new Date(r.dateLost).toLocaleDateString()}</div>
                      </div>
                      <Badge variant={r.status === 'RETURNED' ? 'emerald' : 'warning'}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Found */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  Items You Found
                </h3>
                <button
                  onClick={() => setActiveTab('found')}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Manage
                </button>
              </div>
              {myFoundReports.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No found items reported.</p>
              ) : (
                <div className="space-y-2">
                  {myFoundReports.slice(0, 3).map((r) => (
                    <div key={r._id} className="p-2.5 rounded-md bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{r.title}</div>
                        <div className="text-[11px] text-slate-500">{r.city} • {new Date(r.dateFound).toLocaleDateString()}</div>
                      </div>
                      <Badge variant={r.status === 'RETURNED' ? 'emerald' : 'info'}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'lost' ? (
        /* Lost Reports Tab */
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Lost Property Records ({myLostReports.length})
            </h2>
            <Link
              to="/report-lost"
              className="btn-primary h-8 px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Report New Item
            </Link>
          </div>

          {myLostReports.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs">
              No lost items reported.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myLostReports.map((report) => (
                <div key={report._id} className="bg-white rounded-lg border border-slate-200 p-4 space-y-2 flex flex-col justify-between shadow-sm">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-xs text-slate-900 line-clamp-1">{report.title}</h3>
                      <Badge variant={report.status === 'RETURNED' ? 'emerald' : 'warning'}>{report.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-normal">{report.description}</p>
                    <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                      <div>{report.city} • {report.locationName}</div>
                      <div>Date: {new Date(report.dateLost).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Link
                      to="/matches"
                      className="font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Check Matches
                    </Link>
                    {report.status !== 'RETURNED' && (
                      <button
                        onClick={() => handleMarkResolved(report._id)}
                        className="text-slate-500 hover:text-emerald-700"
                      >
                        Close Report
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'found' ? (
        /* Found Reports Tab */
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Found Property Records ({myFoundReports.length})
            </h2>
            <Link
              to="/report-found"
              className="btn-primary h-8 px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Report Found Item
            </Link>
          </div>

          {myFoundReports.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs">
              You haven't reported finding any items yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myFoundReports.map((report) => (
                <div key={report._id} className="bg-white rounded-lg border border-slate-200 p-4 space-y-2 flex flex-col justify-between shadow-sm">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-xs text-slate-900 line-clamp-1">{report.title}</h3>
                      <Badge variant={report.status === 'RETURNED' ? 'emerald' : 'info'}>{report.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-normal">{report.description}</p>
                    <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                      <div>{report.city} • {report.locationName}</div>
                      <div>Date: {new Date(report.dateFound).toLocaleDateString()}</div>
                      <div>Custody: {report.custodyLocationDetails || 'With finder'}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Link
                      to="/claims"
                      className="font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Review Claims
                    </Link>
                    <Link
                      to={`/browse?search=${encodeURIComponent(report.title)}`}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Public View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'matches' ? (
        /* Matches Tab */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Heuristic Correlations ({activeMatches.length})
            </h2>
          </div>

          {activeMatches.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs">
              No active matching found items currently correlated with your lost reports.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeMatches.map((m) => (
                <div key={m._id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="emerald" size="sm">{m.matchScore}% Match</Badge>
                      <h3 className="font-semibold text-slate-900">{m.foundReport?.title}</h3>
                    </div>
                    <p className="text-slate-600">
                      Matches lost report: <span className="font-medium text-slate-900">"{m.lostReport?.title}"</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      City: {m.foundReport?.city || 'Locally'} • Found: {new Date(m.foundReport?.dateFound).toLocaleDateString()}
                    </p>
                  </div>

                  <Link
                    to={`/claims?foundReportId=${m.foundReport?._id}`}
                    className="btn-primary h-8 px-3 text-xs self-start sm:self-auto shrink-0"
                  >
                    File Claim
                  </Link>
                </div>
              ))}
            </div>
          )}

          {resolvedMatches.length > 0 && (
            <div className="mt-6 space-y-3 pt-6 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Resolved & Returned Items ({resolvedMatches.length})
              </h3>
              <div className="space-y-2.5">
                {resolvedMatches.map((m) => (
                  <div key={m._id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 opacity-80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" size="sm">Returned</Badge>
                        <h4 className="font-semibold text-slate-700">{m.foundReport?.title}</h4>
                      </div>
                      <p className="text-slate-500">
                        Matches: "{m.lostReport?.title}" • Item returned successfully
                      </p>
                    </div>
                    <Badge variant="emerald" size="sm" className="self-start sm:self-auto">
                      Case Closed
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Claims Tab */
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Your Claims ({myClaims.length})
            </h2>
          </div>

          {myClaims.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs">
              You haven't filed any claims yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {myClaims.map((claim) => (
                <div key={claim._id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{claim.foundReport?.title || 'Claimed Item'}</h3>
                        <Badge
                          variant={
                            claim.status === 'APPROVED' || claim.status === 'RETURNED'
                              ? 'emerald'
                              : claim.status === 'REJECTED'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {claim.status}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mt-0.5">Proof: {claim.proofDescription}</p>
                    </div>

                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {claim.officerQuestions && claim.officerQuestions.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                        Verification Q&A
                      </div>
                      {claim.officerQuestions.map((q, idx) => (
                        <div key={idx} className="text-xs">
                          <p className="text-slate-900 font-medium">{q.question}</p>
                          <p className="text-slate-600 italic">Response: {q.answer || 'Pending answer'}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 flex justify-end">
                    <Link
                      to="/messages"
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Coordinate Handover
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
