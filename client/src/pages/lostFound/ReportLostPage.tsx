import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Tag, ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api.js';
import { Category } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';

export const ReportLostPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryLoadError, setCategoryLoadError] = useState('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [distinguishingCharacteristics, setDistinguishingCharacteristics] = useState('');
  const [city, setCity] = useState('Addis Ababa');
  const [locationName, setLocationName] = useState('');
  const [dateLost, setDateLost] = useState(new Date().toISOString().split('T')[0]);
  const [approximateTime, setApproximateTime] = useState('');
  const [description, setDescription] = useState('');
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
      const res = await api.post<{ success: boolean }>('/lost-found/lost', {
        title,
        category,
        color,
        brand,
        distinguishingCharacteristics,
        city,
        locationName,
        dateLost,
        approximateTime,
        description,
        images: [...uploadedImages, ...(imageUrl ? [imageUrl] : [])],
      });

      if (res.success) {
        navigate('/matches');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to file lost report.');
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
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Report a Lost Item</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Provide accurate details to activate automatic heuristic matching against newly logged found possessions.
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
          <label htmlFor="lost-title" className="form-label">Item Title *</label>
          <input
            id="lost-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Samsung Galaxy S23 Ultra in black silicone case"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="lost-category" className="form-label">Category *</label>
            <select
              id="lost-category"
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
            <label htmlFor="lost-brand" className="form-label">Brand / Manufacturer</label>
            <input
              id="lost-brand"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Samsung, Apple, Casio, Wenger"
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="lost-color" className="form-label">Primary Color</label>
            <input
              id="lost-color"
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Matte Black, Dark Blue, Silver"
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="lost-city" className="form-label">City *</label>
            <input
              id="lost-city"
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
          <label htmlFor="lost-location" className="form-label">Approximate Location / Street / Landmark *</label>
          <input
            id="lost-location"
            type="text"
            required
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Bole Medhanealem taxi rank, near Edna Mall"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="lost-date" className="form-label">Date Lost *</label>
            <input
              id="lost-date"
              type="date"
              required
              value={dateLost}
              onChange={(e) => setDateLost(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="lost-time" className="form-label">Approximate Time Window</label>
            <input
              id="lost-time"
              type="text"
              value={approximateTime}
              onChange={(e) => setApproximateTime(e.target.value)}
              placeholder="e.g. Morning (08:30) or Afternoon"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="lost-description" className="form-label">Description & Circumstances *</label>
          <textarea
            id="lost-description"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe visible features, condition, or how the item was misplaced..."
            className="textarea-field"
          />
        </div>

        <div>
          <label htmlFor="lost-distinguishing" className="form-label">Distinguishing Characteristics (Verification Clue)</label>
          <input
            id="lost-distinguishing"
            type="text"
            value={distinguishingCharacteristics}
            onChange={(e) => setDistinguishingCharacteristics(e.target.value)}
            placeholder="e.g. Diagonal scratch near camera lens, sticker on back cover"
            className="input-field"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Helps the heuristic matching engine correlate with confidential notes on found items.
          </p>
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
            <label htmlFor="lost-photos" className="form-label">Item Photos (Optional)</label>
            <input
              id="lost-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(event) => setImageFiles(Array.from(event.target.files || []))}
              className="input-field"
            />
            <p className="text-[11px] text-slate-500 mt-1">Select or drop up to 5 images, maximum 5 MB each.</p>
            {imageFiles.length > 0 && <p className="text-[11px] text-slate-600 mt-1">{imageFiles.map((file) => file.name).join(', ')}</p>}
          </div>
          <label htmlFor="lost-photo-url" className="form-label mt-3">Or add a photo link</label>
          <input
            id="lost-photo-url"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/reference-photo.jpg"
            className="input-field"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || categories.length === 0}
            className="btn-danger w-full h-10"
          >
            {isLoading ? 'Publishing Report...' : 'Publish Lost Report'}
          </button>
        </div>
      </form>
    </div>
  );
};
