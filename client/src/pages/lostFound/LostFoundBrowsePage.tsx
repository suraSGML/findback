import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Compass,
  Search,
  MapPin,
  Calendar,
  Sparkles,
  Plus,
  Tag,
  ArrowRight,
  Filter,
  X,
  CheckCircle,
  Check,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { LostReport, FoundReport, Category } from '../../types/index.js';
import { Badge } from '../../components/common/Badge.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import { useAuth } from '../../context/AuthContext.js';
import { ReportAbuseModal } from '../../components/common/ReportAbuseModal.js';

export const LostFoundBrowsePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const initialTab: 'lost' | 'found' | 'returned' =
    tabParam === 'found' ? 'found' : tabParam === 'returned' ? 'returned' : 'lost';
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialCity = searchParams.get('city') || '';

  const [activeTab, setActiveTab] = useState<'lost' | 'found' | 'returned'>(initialTab);
  const [lostItems, setLostItems] = useState<LostReport[]>([]);
  const [foundItems, setFoundItems] = useState<FoundReport[]>([]);
  const [returnedItems, setReturnedItems] = useState<FoundReport[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLostItem, setSelectedLostItem] = useState<LostReport | null>(null);
  const [selectedFoundItem, setSelectedFoundItem] = useState<FoundReport | null>(null);
  const [abuseTarget, setAbuseTarget] = useState<{ type: 'LOST_REPORT' | 'FOUND_REPORT'; id: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; categories: Category[] }>('/categories').then((res) => {
      if (res.success && res.categories) setCategories(res.categories);
    });
  }, []);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory, selectedCity]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedCity.trim()) params.set('city', selectedCity.trim());

      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const [lostRes, foundRes, returnedRes] = await Promise.all([
        api.get<{ success: boolean; reports: LostReport[] }>(`/lost-found/lost${queryStr}`),
        api.get<{ success: boolean; reports: FoundReport[] }>(`/lost-found/found${queryStr}`),
        api.get<{ success: boolean; reports: FoundReport[] }>(
          `/lost-found/found?status=RETURNED${params.toString() ? '&' + params.toString() : ''}`
        ),
      ]);

      if (lostRes.success && lostRes.reports) setLostItems(lostRes.reports);
      if (foundRes.success && foundRes.reports) setFoundItems(foundRes.reports);
      if (returnedRes.success && returnedRes.reports) setReturnedItems(returnedRes.reports);
    } catch (err) {
      console.error('Error fetching lost and found', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedCity('');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(search || selectedCategory || selectedCity);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Lost & Found Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Search active public reports, discover confirmed returned property, or post an item
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/matches"
            className="btn-secondary h-8 px-3 text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            My Matches
          </Link>
          <button
            type="button"
            onClick={() => {
              setActiveTab('found');
              setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                params.set('tab', 'found');
                return params;
              });
            }}
            className="btn-primary h-8 px-3 text-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Find an Item to Claim
          </button>
          <Link
            to="/report-lost"
            className="btn-secondary h-8 px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5 text-rose-600" />
            Report Lost
          </Link>
          <Link
            to="/report-found"
            className="btn-primary h-8 px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Report Found
          </Link>
        </div>
      </div>

      {activeTab === 'lost' && (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          To claim property, open <button
            type="button"
            onClick={() => {
              setActiveTab('found');
              setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                params.set('tab', 'found');
                return params;
              });
            }}
            className="font-semibold underline underline-offset-2"
          >Found Property</button> and choose <strong>Claim Item</strong> on the matching report. You can only claim items that have been reported found.
        </p>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Control */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start flex-wrap gap-0.5">
            <button
              onClick={() => {
                setActiveTab('lost');
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set('tab', 'lost');
                  return p;
                });
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'lost'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lost Reports ({lostItems.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('found');
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set('tab', 'found');
                  return p;
                });
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'found'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Found Property ({foundItems.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('returned');
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set('tab', 'returned');
                  return p;
                });
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'returned'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reunited & Returned ({returnedItems.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by keywords, brand, color, or model..."
                className="input-field h-9 pl-9 text-xs"
              />
            </div>
            <button
              type="submit"
              className="btn-secondary h-9 px-3.5 text-xs shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          <input
            type="text"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            placeholder="City (e.g. Addis Ababa)"
            className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
          />

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-xs">Loading registry items...</div>
      ) : activeTab === 'lost' ? (
        lostItems.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No lost reports match your criteria"
            description="If you misplaced an item, file a report to enable automatic heuristic matching."
            actionLabel="Report Lost Item"
            onAction={() => navigate('/report-lost')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lostItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between overflow-hidden shadow-sm"
              >
                <div>
                  <div className="h-44 bg-slate-100 relative overflow-hidden border-b border-slate-100">
                    <img
                      src={
                        item.images && item.images.length > 0
                          ? item.images[0]
                          : 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="danger" size="sm">LOST</Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant="info" size="sm">{item.status}</Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>{item.category?.name || 'General'}</span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-normal">
                      {item.description}
                    </p>

                    <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.locationName || item.city || 'Location not specified'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Date lost: {new Date(item.dateLost).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-400">
                    ID #{item._id.substring(0, 6)}
                  </span>
                  <Link
                    to="/matches"
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Check Matches →
                  </Link>
                  <button type="button" onClick={() => setSelectedLostItem(item)} className="text-xs font-semibold text-slate-700 hover:text-slate-900">
                    View details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'found' ? (
        foundItems.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No found items available to claim"
            description="Claims can only be made on items listed in Found Property. There are no matching found reports right now; keep your lost report active and check your matches."
            actionLabel="Check My Matches"
            onAction={() => navigate('/matches')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foundItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between overflow-hidden shadow-sm"
              >
                <div>
                  <div className="h-44 bg-slate-100 relative overflow-hidden border-b border-slate-100">
                    <img
                      src={
                        item.images && item.images.length > 0
                          ? item.images[0]
                          : 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="emerald" size="sm">FOUND</Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant="info" size="sm">{item.status}</Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>{item.category?.name || 'General'}</span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-normal">
                      {item.description}
                    </p>

                    <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.locationName || item.city || 'Discovery Location'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Date found: {new Date(item.dateFound).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-400">
                    ID #{item._id.substring(0, 6)}
                  </span>
                  {user && (item.finder?._id === user._id || (item.finder as any) === user._id) ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        Your Report
                      </span>
                      <button type="button" onClick={() => setSelectedFoundItem(item)} className="text-xs font-semibold text-slate-700 hover:text-slate-900">
                        View details
                      </button>
                      <Link
                        to={`/claims?foundReportId=${item._id}`}
                        className="btn-secondary h-8 px-2.5 text-xs"
                      >
                        View Claims
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setSelectedFoundItem(item)} className="text-xs font-semibold text-slate-700 hover:text-slate-900">
                        Details
                      </button>
                      <Link to={`/claims?foundReportId=${item._id}`} className="btn-primary h-9 px-3 text-xs">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Claim Item
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Reunited & Returned Tab */
        returnedItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="No returned items cataloged yet"
            description="When an item is safely handed over and verified by both finder and owner, it will be proudly showcased here."
            actionLabel="Browse Found Property"
            onAction={() => {
              setActiveTab('found');
              setSearchParams((prev) => {
                const p = new URLSearchParams(prev);
                p.set('tab', 'found');
                return p;
              });
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {returnedItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-lg border border-emerald-200 hover:border-emerald-300 transition-colors flex flex-col justify-between overflow-hidden shadow-sm"
              >
                <div>
                  <div className="h-44 bg-slate-100 relative overflow-hidden border-b border-emerald-100">
                    <img
                      src={
                        item.images && item.images.length > 0
                          ? item.images[0]
                          : 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="emerald" size="sm">
                        <Check className="w-3 h-3 mr-1 inline" />
                        REUNITED & RETURNED
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>{item.category?.name || 'General'}</span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-normal">
                      {item.description}
                    </p>

                    <div className="pt-2 text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          Handover: {item.returnRecord?.handoverLocationName || item.locationName || item.city || 'Verified Meeting Spot'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Returned on:{' '}
                          {item.returnRecord?.returnDate
                            ? new Date(item.returnRecord.returnDate).toLocaleDateString()
                            : new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Owner Confirmation & Review Badge */}
                    {item.returnRecord?.ownerConfirmed ? (
                      <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-950 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                            Confirmed by Owner
                          </span>
                          {item.returnRecord.ownerRating && (
                            <span className="text-amber-500 font-bold">
                              {'★'.repeat(item.returnRecord.ownerRating)}
                            </span>
                          )}
                        </div>
                        {item.returnRecord.ownerFeedback && (
                          <p className="italic text-emerald-800 mt-0.5">
                            "{item.returnRecord.ownerFeedback}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2.5 text-[11px] text-slate-400 italic flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Physical return recorded by finder
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between mt-2 text-xs">
                  <span className="text-[11px] text-slate-500">
                    Finder: <strong>{item.finder?.name || 'Community Member'}</strong>
                  </span>
                  <Badge variant="emerald" size="sm">
                    Verified Return ✓
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {(selectedLostItem || selectedFoundItem) && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 p-4 flex items-center justify-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedLostItem(null);
              setSelectedFoundItem(null);
            }
          }}
        >
          <section className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl space-y-4" role="dialog" aria-modal="true" aria-labelledby="report-detail-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">{selectedLostItem ? 'Lost item' : 'Found item'}</p>
                <h2 id="report-detail-title" className="text-lg font-bold text-slate-900">{selectedLostItem?.title || selectedFoundItem?.title}</h2>
              </div>
              <button type="button" onClick={() => { setSelectedLostItem(null); setSelectedFoundItem(null); }} className="text-slate-500 hover:text-slate-900" aria-label="Close details"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(selectedLostItem?.images || selectedFoundItem?.images || []).map((image, index) => (
                <button key={`${image}-${index}`} type="button" onClick={() => setLightboxImage(image)} className="focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg" aria-label={`Zoom image ${index + 1}`}>
                  <img src={image} alt={`${selectedLostItem?.title || selectedFoundItem?.title} ${index + 1}`} className="w-full h-36 object-cover rounded-lg" />
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedLostItem?.description || selectedFoundItem?.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <p><strong>Category:</strong> {selectedLostItem?.category?.name || selectedFoundItem?.category?.name || 'General'}</p>
              <p><strong>Location:</strong> {selectedLostItem?.locationName || selectedFoundItem?.locationName || selectedLostItem?.city || selectedFoundItem?.city}</p>
              <p><strong>Date:</strong> {new Date(selectedLostItem?.dateLost || selectedFoundItem?.dateFound || '').toLocaleDateString()}</p>
              <p><strong>Color / brand:</strong> {[selectedLostItem?.color || selectedFoundItem?.color, selectedLostItem?.brand || selectedFoundItem?.brand].filter(Boolean).join(' / ') || 'Not specified'}</p>
              {selectedFoundItem && <p><strong>Finder:</strong> {selectedFoundItem.finder?.name || 'Community member'}</p>}
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              {user && (
                <button type="button" onClick={() => setAbuseTarget({
                  type: selectedLostItem ? 'LOST_REPORT' : 'FOUND_REPORT',
                  id: selectedLostItem?._id || selectedFoundItem!._id,
                })} className="text-xs font-medium text-rose-700 hover:text-rose-900">
                  Report suspicious content
                </button>
              )}
              {selectedFoundItem && <Link to={`/claims?foundReportId=${selectedFoundItem._id}`} className="btn-primary h-8 px-3 text-xs">Start a claim</Link>}
            </div>
          </section>
        </div>
      )}
      {abuseTarget && (
        <ReportAbuseModal targetType={abuseTarget.type} targetId={abuseTarget.id} onClose={() => setAbuseTarget(null)} />
      )}
      {lightboxImage && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 p-4 flex items-center justify-center" role="presentation" onClick={() => setLightboxImage(null)}>
          <button type="button" className="absolute right-4 top-4 text-white text-sm" onClick={() => setLightboxImage(null)} aria-label="Close image zoom">Close</button>
          <img src={lightboxImage} alt="Expanded item photo" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
};
