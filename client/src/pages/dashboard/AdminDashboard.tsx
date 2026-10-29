import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  TrendingUp,
  Sliders,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Settings,
  Lock,
  Search,
  Package,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MapPin,
  X,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { User, AuditLog, SystemPolicy, Report } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { Badge } from '../../components/common/Badge.js';

const ADMIN_TABS = ['analytics', 'users', 'reports', 'policy', 'audit'] as const;
type AdminTab = typeof ADMIN_TABS[number];

const PaginationControls: React.FC<{
  page: number;
  pages: number;
  onChange: (page: number) => void;
}> = ({ page, pages, onChange }) => (
  pages > 1 ? (
    <nav className="flex items-center justify-center gap-3 p-3" aria-label="List pages">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="btn-secondary h-8 px-3 text-xs disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-xs text-slate-600" aria-live="polite">Page {page} of {pages}</span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="btn-secondary h-8 px-3 text-xs disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  ) : null
);

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<AdminTab>(
    ADMIN_TABS.includes(requestedTab as AdminTab) ? requestedTab as AdminTab : 'analytics'
  );
  const [analytics, setAnalytics] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [abuseReports, setAbuseReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [policy, setPolicy] = useState<SystemPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPages, setReportsPages] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPages, setAuditPages] = useState(1);

  // Edit User Role Modal
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<'USER' | 'ADMIN'>('USER');
  const [editStatus, setEditStatus] = useState('VERIFIED');
  const [editSuspended, setEditSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');

  // Resolve Abuse Report Modal
  const [selectedReportToResolve, setSelectedReportToResolve] = useState<Report | null>(null);
  const [actionTaken, setActionTaken] = useState('WARNING_ISSUED');
  const [adminNotes, setAdminNotes] = useState('');
  const [isResolvingReport, setIsResolvingReport] = useState(false);

  // Policy Form state
  const [policyMatchWeights, setPolicyMatchWeights] = useState<any>({
    category: 20,
    location: 25,
    date: 15,
    time: 10,
    color: 10,
    brand: 10,
    description: 10,
  });

  useEffect(() => {
    setActiveTab(ADMIN_TABS.includes(requestedTab as AdminTab) ? requestedTab as AdminTab : 'analytics');
  }, [requestedTab]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    fetchAdminData();
  }, [user, activeTab, usersPage, reportsPage, auditPage]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'analytics') {
        const res = await api.get<{ success: boolean; analytics: any }>('/admin/analytics');
        if (res.success) setAnalytics(res.analytics);
      } else if (activeTab === 'users') {
        const res = await api.get<{
          success: boolean;
          users: User[];
          pagination?: { page: number; pages: number };
        }>(`/admin/users?page=${usersPage}&limit=20`);
        if (res.success && res.users) {
          setUsersList(res.users);
          setUsersPages(res.pagination?.pages ?? 1);
        }
      } else if (activeTab === 'reports') {
        const res = await api.get<{
          success: boolean;
          reports: Report[];
          pagination?: { page: number; pages: number };
        }>(`/reports?page=${reportsPage}&limit=25`);
        if (res.success && res.reports) {
          setAbuseReports(res.reports);
          setReportsPages(res.pagination?.pages ?? 1);
        }
      } else if (activeTab === 'policy') {
        const res = await api.get<{ success: boolean; policy: SystemPolicy }>('/admin/policy');
        if (res.success && res.policy) {
          setPolicy(res.policy);
          if (res.policy.matchWeights) {
            setPolicyMatchWeights(res.policy.matchWeights);
          }
        }
      } else if (activeTab === 'audit') {
        const res = await api.get<{
          success: boolean;
          logs: AuditLog[];
          pagination?: { page: number; pages: number };
        }>(`/admin/audit-logs?page=${auditPage}&limit=30`);
        if (res.success && res.logs) {
          setAuditLogs(res.logs);
          setAuditPages(res.pagination?.pages ?? 1);
        }
      }
    } catch (err) {
      console.error('Admin fetch error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUserPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit) return;

    try {
      const res = await api.put<{ success: boolean }>(`/admin/users/${selectedUserToEdit._id}`, {
        role: editRole,
        verificationStatus: editStatus,
        isSuspended: editSuspended,
        suspensionReason,
      });

      if (res.success) {
        alert('User permissions updated successfully.');
        setSelectedUserToEdit(null);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update user.');
    }
  };

  const handleResolveAbuseReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportToResolve) return;

    setIsResolvingReport(true);
    try {
      const res = await api.put<{ success: boolean }>(`/reports/${selectedReportToResolve._id}/resolve`, {
        actionTaken,
        notes: adminNotes,
      });

      if (res.success) {
        alert('Abuse report resolved successfully.');
        setSelectedReportToResolve(null);
        setAdminNotes('');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to resolve report.');
    } finally {
      setIsResolvingReport(false);
    }
  };

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === 'analytics') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    });
  };

  const handleSavePolicyWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put<{ success: boolean }>('/admin/policy', {
        matchWeights: policyMatchWeights,
      });
      if (res.success) {
        alert('Heuristic matching weights successfully re-calibrated.');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update policy.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Platform Administration
            </h1>
            <Badge variant="purple">Executive Console</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Nationwide lost & found analytics, user directory, abuse moderation, and policy calibration
          </p>
        </div>

        <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
          Logged in as: <strong className="text-slate-800">{user?.email}</strong>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        {[
          { key: 'analytics', label: 'Platform Analytics' },
          { key: 'users', label: `User Directory (${usersList.length})` },
          { key: 'reports', label: `Abuse Queue (${abuseReports.length})` },
          { key: 'policy', label: 'Match Weights & Policy' },
          { key: 'audit', label: `Audit Log (${auditLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => selectTab(tab.key as AdminTab)}
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
        <div className="text-center py-16 text-slate-400 text-xs">Loading governance dataset...</div>
      ) : activeTab === 'analytics' && analytics ? (
        /* Analytics View */
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Users</span>
              <div className="text-2xl font-bold text-slate-900">{analytics.totalUsers}</div>
              <p className="text-[11px] text-slate-500">{analytics.verifiedUsers} verified members</p>
            </div>

            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Lost</span>
              <div className="text-2xl font-bold text-slate-900">{analytics.activeLost}</div>
              <p className="text-[11px] text-slate-500">Currently in correlation</p>
            </div>

            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Items Found</span>
              <div className="text-2xl font-bold text-slate-900">{analytics.activeFound}</div>
              <p className="text-[11px] text-slate-500">Awaiting owner claim</p>
            </div>

            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recovery Rate</span>
              <div className="text-2xl font-bold text-emerald-700">{analytics.recoveryRate}%</div>
              <p className="text-[11px] text-slate-500">{analytics.returnedItems} returns recorded</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-700">Moderation & Platform Health</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Pending Abuse Reports</span>
                  <strong className={analytics.pendingReports > 0 ? 'text-rose-600' : 'text-slate-900'}>
                    {analytics.pendingReports}
                  </strong>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Suspended Misconduct Accounts</span>
                  <strong className="text-amber-800">{analytics.suspendedUsers}</strong>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Platform Access Fee</span>
                  <strong className="text-emerald-700 font-semibold">0 ETB (100% Free Service)</strong>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-700">Heuristic Operations</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Total Correlations Calculated</span>
                  <strong className="text-slate-900">{analytics.totalMatches}</strong>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Claims Pending Review</span>
                  <strong className="text-slate-900">{analytics.pendingClaims}</strong>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Physical Returns Verified</span>
                  <strong className="text-emerald-700">{analytics.returnedItems}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        /* Users Directory Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <span className="font-semibold text-xs uppercase tracking-wider text-slate-700">
              Registered Users ({usersList.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="p-3.5">Name & Contact</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Returns / Recoveries</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email} {u.phone ? `• ${u.phone}` : ''}</div>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {u.city || 'Addis Ababa'}, {u.country || 'Ethiopia'}
                    </td>
                    <td className="p-3.5">
                      <Badge variant={u.role === 'ADMIN' ? 'purple' : 'neutral'} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={u.isSuspended ? 'danger' : u.verificationStatus === 'VERIFIED' ? 'emerald' : 'warning'} size="sm">
                        {u.isSuspended ? 'SUSPENDED' : u.verificationStatus}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {u.reputation?.itemsReturned || 0} returned • {u.reputation?.itemsRecovered || 0} recovered
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedUserToEdit(u);
                          setEditRole(u.role as 'USER' | 'ADMIN');
                          setEditStatus(u.verificationStatus);
                          setEditSuspended(u.isSuspended);
                          setSuspensionReason(u.suspensionReason || '');
                        }}
                        className="btn-secondary h-7 px-2.5 text-xs"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls page={usersPage} pages={usersPages} onChange={setUsersPage} />
        </div>
      ) : activeTab === 'reports' ? (
        /* Abuse Reports Queue */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <span className="font-semibold text-xs uppercase tracking-wider text-slate-700">
              Reported Content & Abuse Inquiries ({abuseReports.length})
            </span>
          </div>

          {abuseReports.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No community reports found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {abuseReports.map((rep) => (
                <div key={rep._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                        {rep.targetType}
                      </span>
                      <h4 className="font-semibold text-slate-900">{rep.reason}</h4>
                      <Badge
                        variant={rep.status === 'RESOLVED' ? 'emerald' : rep.status === 'DISMISSED' ? 'neutral' : 'warning'}
                        size="sm"
                      >
                        {rep.status}
                      </Badge>
                    </div>
                    <p className="font-semibold text-slate-800">
                      Reported: {rep.target?.title || `${rep.targetType.replace(/_/g, ' ')} (${rep.targetId})`}
                    </p>
                    {rep.target && (
                      <p className="text-[11px] text-slate-500">
                        {rep.target.status && <>Status: {rep.target.status} · </>}
                        {rep.target.locationName || rep.target.city || ''}
                        {rep.target.ownerName && <> · Account: {rep.target.ownerName}</>}
                      </p>
                    )}
                    {rep.details && <p className="text-slate-600">{rep.details}</p>}
                    <p className="text-[11px] text-slate-500">
                      Reported by: {rep.reporter?.name || 'Unknown user'} {rep.reporter?.email ? `(${rep.reporter.email})` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Reported: {new Date(rep.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {rep.status === 'PENDING' && (
                    <button
                      onClick={() => {
                        setSelectedReportToResolve(rep);
                        setActionTaken(
                          rep.targetType === 'CLAIM'
                            ? 'REJECT_CLAIM'
                            : rep.targetType === 'USER'
                              ? 'WARN_USER'
                              : rep.targetType === 'LISTING'
                                ? 'REMOVE_LISTING'
                                : 'REMOVE_REPORT'
                        );
                        setAdminNotes('');
                      }}
                      className="btn-danger h-8 px-3 text-xs self-start sm:self-auto shrink-0"
                    >
                      Take Action
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <PaginationControls page={reportsPage} pages={reportsPages} onChange={setReportsPage} />
        </div>
      ) : activeTab === 'policy' ? (
        /* Match Weights & Policy Editor */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Heuristic Engine Weights Calibration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjust the algorithmic importance of different variables when correlating lost and found reports nationwide.
            </p>
          </div>

          <form onSubmit={handleSavePolicyWeights} className="space-y-4 max-w-lg text-xs">
            {Object.keys(policyMatchWeights).map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700 capitalize text-xs">
                  <span>{key} Weight Importance</span>
                  <span className="font-bold text-slate-900">{policyMatchWeights[key]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={policyMatchWeights[key]}
                  onChange={(e) =>
                    setPolicyMatchWeights({
                      ...policyMatchWeights,
                      [key]: Number(e.target.value),
                    })
                  }
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
            ))}

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary h-9 px-4 text-xs"
              >
                Save Calibrated Weights
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Audit Logs Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <span className="font-semibold text-xs uppercase tracking-wider text-slate-700">
              Governance Audit Trail ({auditLogs.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Actor</th>
                  <th className="p-3.5">Target Entity</th>
                  <th className="p-3.5">Details</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-emerald-800">{log.action}</td>
                    <td className="p-3.5 text-slate-800">{log.actor?.name || 'System'}</td>
                    <td className="p-3.5 text-slate-500">{log.entityType} #{log.entityId?.substring(0, 8)}</td>
                    <td className="p-3.5 text-slate-700 font-sans">{log.notes || '—'}</td>
                    <td className="p-3.5 text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls page={auditPage} pages={auditPages} onChange={setAuditPage} />
        </div>
      )}

      {/* Edit User Modal */}
      {selectedUserToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Manage User Account</h3>
              <button
                onClick={() => setSelectedUserToEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {selectedUserToEdit.name} ({selectedUserToEdit.email})
            </p>

            <form onSubmit={handleSaveUserPermissions} className="space-y-4 text-xs">
              <div>
                <label className="form-label">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'USER' | 'ADMIN')}
                  className="select-field"
                >
                  <option value="USER">User (Standard Member)</option>
                  <option value="ADMIN">Admin (System Governance)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Verification Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="select-field"
                >
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="susp"
                  checked={editSuspended}
                  onChange={(e) => setEditSuspended(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="susp" className="text-xs font-semibold text-rose-700 cursor-pointer">
                  Suspend Posting & Claims Privileges
                </label>
              </div>

              {editSuspended && (
                <div>
                  <label className="form-label">Suspension Reason</label>
                  <input
                    type="text"
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    placeholder="e.g. Fraudulent ownership claim attempts"
                    className="input-field"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserToEdit(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Abuse Report Modal */}
      {selectedReportToResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Review Community Report</h3>
              <button
                onClick={() => setSelectedReportToResolve(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
              <p><strong>Reason:</strong> {selectedReportToResolve.reason}</p>
              <p><strong>Reported:</strong> {selectedReportToResolve.target?.title || selectedReportToResolve.targetId}</p>
              {selectedReportToResolve.target?.ownerName && (
                <p><strong>Account involved:</strong> {selectedReportToResolve.target.ownerName}</p>
              )}
              {selectedReportToResolve.target?.status && (
                <p><strong>Current status:</strong> {selectedReportToResolve.target.status}</p>
              )}
              <p><strong>Reporter:</strong> {selectedReportToResolve.reporter?.name || 'Unknown user'} {selectedReportToResolve.reporter?.email ? `(${selectedReportToResolve.reporter.email})` : ''}</p>
              {selectedReportToResolve.details && <p><strong>Details:</strong> {selectedReportToResolve.details}</p>}
            </div>

            <form onSubmit={handleResolveAbuseReport} className="space-y-4 text-xs">
              <div>
                <label className="form-label">Action to Take</label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="select-field"
                >
                  {selectedReportToResolve.targetType === 'CLAIM' && (
                    <option value="REJECT_CLAIM">Reject reported ownership claim</option>
                  )}
                  {selectedReportToResolve.targetType !== 'USER' && (
                    <option value={selectedReportToResolve.targetType === 'LISTING' ? 'REMOVE_LISTING' : 'REMOVE_REPORT'}>
                      Remove reported content
                    </option>
                  )}
                  <option value="WARN_USER">
                    {selectedReportToResolve.targetType === 'USER' ? 'Warn reported user' : 'Warn content owner / claimant'}
                  </option>
                  <option value="SUSPEND_USER">
                    {selectedReportToResolve.targetType === 'USER' ? 'Suspend reported user' : 'Suspend content owner / claimant'}
                  </option>
                  <option value="DISMISSED">Dismiss report (no action)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Resolution Notes</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain reasoning for audit trail..."
                  className="textarea-field"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReportToResolve(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolvingReport}
                  className="btn-danger flex-1"
                >
                  {isResolvingReport ? 'Saving...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
