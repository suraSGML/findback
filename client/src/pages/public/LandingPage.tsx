import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Sparkles,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock,
  Compass,
  FileCheck2,
  HelpCircle,
  Package,
  Shield,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { LostReport, FoundReport, Category } from '../../types/index.js';
import { SafeMeetingGuideModal } from '../../components/common/SafeMeetingGuideModal.js';
import { Badge } from '../../components/common/Badge.js';
import { BRAND } from '../../config/brand.js';
import { useAuth } from '../../context/AuthContext.js';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [recentLost, setRecentLost] = useState<LostReport[]>([]);
  const [recentFound, setRecentFound] = useState<FoundReport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'found' | 'lost'>('found');

  useEffect(() => {
    api.get<{ success: boolean; reports: LostReport[] }>('/lost-found/lost?limit=6')
      .then((res) => {
        if (res.success && res.reports) setRecentLost(res.reports);
      })
      .catch(() => {});

    api.get<{ success: boolean; reports: FoundReport[] }>('/lost-found/found?limit=6')
      .then((res) => {
        if (res.success && res.reports) setRecentFound(res.reports);
      })
      .catch(() => {});

    api.get<{ success: boolean; categories: Category[] }>('/categories')
      .then((res) => {
        if (res.success && res.categories) setCategories(res.categories);
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (selectedCity.trim()) params.append('city', selectedCity.trim());
    navigate(`/browse?${params.toString()}`);
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Refined, High-Trust Hero Section */}
      <section className="bg-white border-b border-slate-200 pt-12 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ethiopia's Free Public Lost & Found Platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Reconnect with what was misplaced.
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-normal">
            FindBack uses multi-variable heuristic matching and anti-fraud challenge verification to help honest finders reunite lost belongings with their owners.
          </p>

          {/* Precision Search Console */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto pt-2">
            <div className="flex flex-col sm:flex-row items-center bg-white rounded-lg p-1.5 border border-slate-300 shadow-sm gap-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-600">
              <div className="flex items-center w-full sm:flex-1 pl-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="What are you looking for? (e.g. Phone, Keys, Wallet, Backpack)..."
                  className="w-full h-9 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
                />
              </div>

              <div className="flex items-center w-full sm:w-48 border-t sm:border-t-0 sm:border-l border-slate-200 pl-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
                <input
                  type="text"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  placeholder="City (e.g. Addis Ababa)"
                  className="w-full h-9 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
                />
              </div>

              <button
                type="submit"
                className="btn-primary h-9 px-4 text-xs w-full sm:w-auto shrink-0"
              >
                Search Registry
              </button>
            </div>
          </form>

          {/* Primary Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/report-lost"
              className="btn-secondary h-9 px-4 text-xs"
            >
              <Plus className="w-3.5 h-3.5 text-rose-600" />
              I Lost Something
            </Link>

            <Link
              to="/report-found"
              className="btn-primary h-9 px-4 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              I Found Something
            </Link>

            <Link
              to="/browse"
              className="btn-ghost h-9 px-3 text-xs"
            >
              View All Items &rarr;
            </Link>
            <Link
              to="/browse?tab=returned"
              className="btn-ghost h-9 px-3 text-xs text-emerald-700"
            >
              See Returned Items
            </Link>
          </div>
        </div>
      </section>

      {/* Structured Category Bar */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Browse Common Categories
            </h2>
            <Link to="/browse" className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
              View all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/browse?category=${cat._id}`}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-slate-800 truncate">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Main Registry Feed with Clean Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recent Activity
            </h2>
            <p className="text-xs text-slate-500">
              Verified reports currently in matching or awaiting legitimate ownership claim
            </p>
          </div>

          {/* Segmented Control */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('found')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'found'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Found Items ({recentFound.length})
            </button>
            <button
              onClick={() => setActiveTab('lost')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'lost'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lost Items ({recentLost.length})
            </button>
          </div>
        </div>

        {/* Feed Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeTab === 'found' ? recentFound : recentLost).map((item) => {
            const isFound = activeTab === 'found';
            return (
              <div
                key={item._id}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between overflow-hidden shadow-sm"
              >
                <div>
                  <div className="relative aspect-video bg-slate-100 overflow-hidden border-b border-slate-100">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Compass className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant={isFound ? 'emerald' : 'danger'}>
                        {isFound ? 'Found Property' : 'Lost Item'}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900/80 text-white">
                        {item.city || 'Addis Ababa'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-normal">
                      {item.description}
                    </p>
                    <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {item.locationName || item.city || 'General Area'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date((item as any).dateFound || (item as any).dateLost).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 pt-0 border-t border-slate-100 flex items-center justify-between mt-2">
                  <span className="text-[11px] font-medium text-slate-500">
                    Category: {item.category?.name || 'General'}
                  </span>
                  {user && isFound && ((item as any).finder?._id === user._id || (item as any).finder === user._id) ? (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Your Report
                    </span>
                  ) : (
                    <Link
                      to={isFound ? `/claims?foundReportId=${item._id}` : `/browse`}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      {isFound ? 'Claim Item →' : 'View Report →'}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works — Clean Linear Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              How FindBack Works
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              A structured 4-step workflow ensuring privacy and preventing false claims
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="w-7 h-7 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h3 className="font-semibold text-xs text-slate-900">Report Possession</h3>
              <p className="text-xs text-slate-600 leading-normal">
                Log the item's location, date, category, and private identifying details.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="w-7 h-7 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h3 className="font-semibold text-xs text-slate-900">Heuristic Correlation</h3>
              <p className="text-xs text-slate-600 leading-normal">
                Algorithms score geographic proximity, brand, color, and date to generate matches.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="w-7 h-7 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h3 className="font-semibold text-xs text-slate-900">Challenge Q&A</h3>
              <p className="text-xs text-slate-600 leading-normal">
                Finders verify the claimant's answers against shielded secret characteristics.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="w-7 h-7 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                4
              </div>
              <h3 className="font-semibold text-xs text-slate-900">Safe Public Return</h3>
              <p className="text-xs text-slate-600 leading-normal">
                Coordinate handovers in verified daylight public spots and confirm recovery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety Assurance Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-100/70 rounded-xl border border-slate-200 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <Lock className="w-3.5 h-3.5" />
              <span>Anti-Fraud Information Asymmetry</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Why FindBack Shields Secret Details
            </h3>
            <p className="text-xs text-slate-600 leading-normal">
              Finders record identifying details (engravings, lock screen wallpapers, unique scratches) that are never shown publicly. Only claimants who independently know these details can successfully verify ownership.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowSafetyModal(true)}
              className="btn-secondary h-9 text-xs"
            >
              Handover Safety Guide
            </button>
            <Link
              to="/about"
              className="btn-primary h-9 text-xs"
            >
              About Platform Security
            </Link>
          </div>
        </div>
      </section>

      <SafeMeetingGuideModal isOpen={showSafetyModal} onClose={() => setShowSafetyModal(false)} />
    </div>
  );
};
