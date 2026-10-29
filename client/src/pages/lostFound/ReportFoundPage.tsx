import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Tag, ArrowLeft, AlertCircle, ShieldCheck, Lock } from 'lucide-react';
import { api } from '../../services/api.js';
import { Category, Location } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';

export const ReportFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryLoadError, setCategoryLoadError] = useState('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [city, setCity] = useState('Addis Ababa');
  const [locationName, setLocationName] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [dateFound, setDateFound] = useState(new Date().toISOString().split('T')[0]);
  const [approximateTime, setApproximateTime] = useState('');
  const [description, setDescription] = useState('');
  const [custodyStatus, setCustodyStatus] = useState<'WITH_FINDER' | 'TRANSFERRED_TO_CUSTODIAN'>('WITH_FINDER');
  const [custodyLocationDetails, setCustodyLocationDetails] = useState('');
  const [secretIdentifyingDetails, setSecretIdentifyingDetails] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      navigate('/login');
    }
  }, [user, isAuthLoading]);

  useEffect(() => {
    api.get<{ success: boolean; categories: Category[] }>('/categories').then((res) => {
      if (res.success && res.categories?.length) {
        setCategories(res.categories);
        setCategory((prev) => prev || res.categories[0]._id);
      } else {
        setCategoryLoadError('No item categories are available right now. Please try again later.');
      }
    }).catch(() => {
      setCategoryLoadError('Could not load item categories. Check your connection and reload the page.');
    });

    api.get<{ success: boolean; locations: Location[] }>('/locations').then((res) => {
      if (res.success && res.locations) {
        setLocations(res.locations);
      }
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!categories.length || !category) {
        throw new Error('Item categories are still unavailable. Please reload the page before submitting.');
      }
      if (imageFiles.length + (imageUrl.trim() ? 1 : 0) > 5 || imageFiles.some((file) => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)) {
        throw new Error('Choose up to 5 image files, each no larger than 5 MB.');
      }
      const uploadedImages = imageFiles.length ? await api.uploadImages(imageFiles) : [];
      const res = await api.post<{ success: boolean }>('/lost-found/found', {
        title,
        category,
        color,
        brand,
        city,
        locationName,
        foundLocation: foundLocation || undefined,
        dateFound,
        approximateTime,
        description,
        custodyStatus,
        custodyLocationDetails,
        secretIdentifyingDetails,
        images: [...uploadedImages, ...(imageUrl ? [imageUrl] : [])],
      });

      if (res.success) {
        navigate('/browse?tab=found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to file found report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to registry
      </button>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Report a Found Item</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Thank you for being an honest community member. Provide public details while keeping secret identifying features private for verification.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {categoryLoadError && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
          {categoryLoadError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-7 rounded-xl shadow-sm border border-slate-200 space-y-5">
        <div>
          <label htmlFor="found-title" className="form-label">Item Title *</label>
          <input
            id="found-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Leather wallet with cards, black keys with Toyota fob"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="found-category" className="form-label">Category *</label>
            <select
              id="found-category"
              disabled={categories.length === 0}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select-field"
            >
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="found-brand" className="form-label">Brand / Manufacturer</label>
            <input
              id="found-brand"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Dell, Apple, Samsung, Casio"
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="found-color" className="form-label">Primary Color</label>
            <input
              id="found-color"
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Brown, Black, Silver"
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="found-city" className="form-label">City *</label>
            <input
              id="found-city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Addis Ababa, Hawassa, Bahir Dar"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="found-location-name" className="form-label">Discovery Location / Landmark *</label>
          <input
            id="found-location-name"
            type="text"
            required
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Mexico Square LRT platform, near ticket booth"
            className="input-field"
          />
        </div>

        {locations.length > 0 && (
          <div>
            <label htmlFor="found-location" className="form-label">Nearest Registered Public Hub (Optional)</label>
            <select
              id="found-location"
              value={foundLocation}
              onChange={(e) => setFoundLocation(e.target.value)}
              className="select-field"
            >
              <option value="">Select a known landmark or transit center...</option>
              {locations.map((loc) => (
                <option key={loc._id} value={loc._id}>{loc.name} ({loc.city})</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="found-date" className="form-label">Date Found *</label>
            <input
              id="found-date"
              type="date"
              required
              value={dateFound}
              onChange={(e) => setDateFound(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="found-time" className="form-label">Approximate Time of Discovery</label>
            <input
              id="found-time"
              type="text"
              value={approximateTime}
              onChange={(e) => setApproximateTime(e.target.value)}
              placeholder="e.g. 11:30 AM or Evening"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="found-description" className="form-label">Public Description *</label>
          <textarea
            id="found-description"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a general description of the item. Do NOT include secret identifying features here..."
            className="textarea-field"
          />
        </div>

        {/* Security Shield Callout for Secret Details */}
        <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200/90 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
            <h3 className="text-xs font-semibold text-emerald-900">
              Secret Identifying Details (Anti-Fraud Shield)
            </h3>
          </div>
          <p className="text-[11px] text-emerald-800 leading-normal">
            This field is <strong>completely shielded</strong> from the public website and API. Only you and platform administrators can see it. Use this to verify genuine owners when they submit claims.
          </p>
          <label htmlFor="found-secret-details" className="sr-only">Secret identifying details</label>
          <input
            id="found-secret-details"
            type="text"
            value={secretIdentifyingDetails}
            onChange={(e) => setSecretIdentifyingDetails(e.target.value)}
            placeholder="e.g. Lock screen picture is a dog, driver's license name inside wallet is Dawit, engraving initials 'M.K.'"
            className="input-field bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="found-custody-status" className="form-label">Current Custody Status</label>
            <select
              id="found-custody-status"
              value={custodyStatus}
              onChange={(e) => setCustodyStatus(e.target.value as any)}
              className="select-field"
            >
              <option value="WITH_FINDER">Safely kept by finder (you)</option>
              <option value="TRANSFERRED_TO_CUSTODIAN">Deposited at public information / security desk</option>
            </select>
          </div>

          <div>
            <label htmlFor="found-custody-location" className="form-label">Storage Location Notes</label>
            <input
              id="found-custody-location"
              type="text"
              value={custodyLocationDetails}
              onChange={(e) => setCustodyLocationDetails(e.target.value)}
              placeholder="e.g. At home in Bole, or at station lost desk"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <div
            className="rounded-lg border border-dashed border-slate-300 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              setImageFiles(Array.from(event.dataTransfer.files));
            }}
          >
            <label htmlFor="found-photos" className="form-label">Item Photos (Optional)</label>
            <input
              id="found-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(event) => setImageFiles(Array.from(event.target.files || []))}
              className="input-field"
            />
            <p className="text-[11px] text-slate-500 mt-1">Select or drop up to 5 images, maximum 5 MB each.</p>
            {imageFiles.length > 0 && <p className="text-[11px] text-slate-600 mt-1">{imageFiles.map((file) => file.name).join(', ')}</p>}
          </div>
          <label htmlFor="found-photo-url" className="form-label mt-3">Or add a photo link</label>
          <input
            id="found-photo-url"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/found-item.jpg"
            className="input-field"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || categories.length === 0}
            className="btn-primary w-full h-10"
          >
            {isLoading ? 'Publishing Report...' : 'Publish Found Item Report'}
          </button>
        </div>
      </form>
    </div>
  );
};
