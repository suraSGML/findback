import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { NotificationProvider } from './context/NotificationContext.js';
import { Navbar } from './components/common/Navbar.js';
import { ToastAlert } from './components/common/ToastAlert.js';

// Public pages
import { LandingPage } from './pages/public/LandingPage.js';
import { LoginPage } from './pages/public/LoginPage.js';
import { RegisterPage } from './pages/public/RegisterPage.js';
import { PasswordRecoveryPage } from './pages/public/PasswordRecoveryPage.js';
import { AboutPage } from './pages/public/AboutPage.js';
import { PlatformInfoPage } from './pages/public/PlatformInfoPage.js';
import { NotFoundPage } from './pages/public/NotFoundPage.js';

// Lost & Found pages
import { LostFoundBrowsePage } from './pages/lostFound/LostFoundBrowsePage.js';
import { ReportLostPage } from './pages/lostFound/ReportLostPage.js';
import { ReportFoundPage } from './pages/lostFound/ReportFoundPage.js';
import { MatchesPage } from './pages/lostFound/MatchesPage.js';
import { ClaimsPage } from './pages/lostFound/ClaimsPage.js';

// Peer chat page
import { MessagesPage } from './pages/messages/MessagesPage.js';
import { NotificationsPage } from './pages/notifications/NotificationsPage.js';

// Role Dashboards
import { UserDashboard } from './pages/dashboard/UserDashboard.js';
import { AdminDashboard } from './pages/dashboard/AdminDashboard.js';

import { Compass, ShieldCheck, Heart, MapPin, Sparkles } from 'lucide-react';
import { BRAND } from './config/brand.js';

const routeMetadata: { pattern: RegExp; title: string; description: string }[] = [
  { pattern: /^\/$/, title: 'FindBack | Lost & Found in Ethiopia', description: 'Search lost and found reports, submit an item report, and coordinate safe returns with FindBack.' },
  { pattern: /^\/about$/, title: 'About FindBack', description: 'Learn how FindBack connects people with lost property and supports safe handovers.' },
  { pattern: /^\/privacy$/, title: 'Privacy | FindBack', description: 'Learn what FindBack stores and how account, report, message, and image data are used.' },
  { pattern: /^\/terms$/, title: 'Terms of Use | FindBack', description: 'Review the community rules for reporting, claiming, and returning lost property.' },
  { pattern: /^\/security$/, title: 'Security | FindBack', description: 'Review FindBack application controls and production deployment security responsibilities.' },
  { pattern: /^\/(browse|lost-found)$/, title: 'Browse Lost & Found | FindBack', description: 'Browse public lost and found item reports in the FindBack registry.' },
  { pattern: /^\/report-lost$/, title: 'Report a Lost Item | FindBack', description: 'Create a lost-item report and help FindBack identify possible matches.' },
  { pattern: /^\/report-found$/, title: 'Report a Found Item | FindBack', description: 'Report an item you found and help its owner arrange a safe return.' },
  { pattern: /^\/(matches|lost-found\/matches)$/, title: 'Potential Matches | FindBack', description: 'Review possible lost-and-found matches associated with your reports.' },
  { pattern: /^\/(claims|lost-found\/claims)$/, title: 'Ownership Claims | FindBack', description: 'Review ownership claims and coordinate safe item handovers.' },
  { pattern: /^\/(login|register|forgot-password|reset-password)$/, title: 'Account Access | FindBack', description: 'Sign in, create an account, or recover access to FindBack.' },
  { pattern: /^\/messages/, title: 'Messages | FindBack', description: 'Coordinate lost-property handovers through FindBack messages.' },
  { pattern: /^\/notifications$/, title: 'Notifications | FindBack', description: 'Review notification details and follow up on FindBack updates.' },
  { pattern: /^\/dashboard/, title: 'Dashboard | FindBack', description: 'Manage your FindBack reports, claims, messages, and account.' },
];

const RouteMetadata: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = routeMetadata.find(({ pattern }) => pattern.test(pathname));
    const title = metadata?.title || `${BRAND.name} | Lost & Found`;
    const description = metadata?.description || 'FindBack helps people report and recover lost property.';
    document.title = title;
    let descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement('meta');
      descriptionTag.name = 'description';
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.content = description;
  }, [pathname]);

  return null;
};

export const App: React.FC = () => {
  return (
    <Router>
      <RouteMetadata />
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/privacy" element={<PlatformInfoPage type="privacy" />} />
                <Route path="/terms" element={<PlatformInfoPage type="terms" />} />
                <Route path="/security" element={<PlatformInfoPage type="security" />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
                <Route path="/reset-password" element={<PasswordRecoveryPage />} />
                <Route path="/404" element={<NotFoundPage />} />

                {/* Primary Lost & Found Routes */}
                <Route path="/browse" element={<LostFoundBrowsePage />} />
                <Route path="/report-lost" element={<ReportLostPage />} />
                <Route path="/report-found" element={<ReportFoundPage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/claims" element={<ClaimsPage />} />

                {/* Legacy Lost & Found Aliases */}
                <Route path="/lost-found" element={<LostFoundBrowsePage />} />
                <Route path="/lost-found/report-lost" element={<ReportLostPage />} />
                <Route path="/lost-found/report-found" element={<ReportFoundPage />} />
                <Route path="/lost-found/matches" element={<MatchesPage />} />
                <Route path="/lost-found/claims" element={<ClaimsPage />} />

                {/* Messaging */}
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/messages/:conversationId" element={<MessagesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />

                {/* Dashboards */}
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/dashboard/admin" element={<AdminDashboard />} />
                <Route path="/dashboard/officer" element={<Navigate to="/dashboard/admin" replace />} />
                <Route path="/dashboard/moderator" element={<Navigate to="/dashboard/admin" replace />} />

                {/* Legacy Marketplace Redirects */}
                <Route path="/marketplace/*" element={<Navigate to="/browse" replace />} />

                {/* Fallback */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>

            <ToastAlert />

            {/* Professional Footer */}
            <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-10 px-4 sm:px-6 lg:px-8 mt-auto">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                      FB
                    </div>
                    <span>{BRAND.name}</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-normal">
                    A free, public lost-and-found community platform connecting owners and finders through multi-factor heuristic correlation and verified safe handovers.
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    Covering Addis Ababa, Hawassa, Bahir Dar & all regions.
                  </p>
                </div>

                <div>
                  <h4 className="text-slate-200 font-semibold text-xs tracking-wider uppercase mb-3">Registry</h4>
                  <ul className="space-y-2">
                    <li><Link to="/browse" className="hover:text-white transition-colors">Browse Lost & Found</Link></li>
                    <li><Link to="/report-lost" className="hover:text-white transition-colors">Report Lost Property</Link></li>
                    <li><Link to="/report-found" className="hover:text-white transition-colors">Post Found Possession</Link></li>
                    <li><Link to="/matches" className="hover:text-white transition-colors">Heuristic Matching Engine</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-slate-200 font-semibold text-xs tracking-wider uppercase mb-3">Trust & Security</h4>
                  <ul className="space-y-2">
                    <li><Link to="/about" className="hover:text-white transition-colors">How Verification Works</Link></li>
                    <li><span className="text-slate-400 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secret Identifying Details Shield</span></li>
                    <li><Link to="/claims" className="hover:text-white transition-colors">Ownership Challenge Protocol</Link></li>
                    <li><Link to="/about" className="hover:text-white transition-colors">Public Handover Guidelines</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-slate-200 font-semibold text-xs tracking-wider uppercase mb-3">Service Pledge</h4>
                  <p className="text-slate-400 text-xs leading-normal mb-3">
                    FindBack is 100% free for everyone. No subscription tiers, advance claiming fees, or paywalls.
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Free Public Service
                  </div>
                </div>
              </div>

              <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
                <p>© 2026 {BRAND.name}. Public community service.</p>
                <div className="flex gap-4">
                  <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
                  <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms of Use</Link>
                  <Link to="/security" className="hover:text-slate-300 transition-colors">Security</Link>
                </div>
              </div>
            </footer>
          </div>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
