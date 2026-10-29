import React from 'react';
import {
  Compass,
  ShieldCheck,
  Sparkles,
  MapPin,
  HeartHandshake,
  Lock,
  Users,
  CheckCircle,
} from 'lucide-react';
import { BRAND } from '../../config/brand.js';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Title */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
          <Compass className="w-3.5 h-3.5" />
          <span>Platform Mission & Principles</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          About {BRAND.name}
        </h1>
        <p className="text-sm text-slate-500 leading-normal">
          {BRAND.tagline} — connecting finders and owners across Ethiopia with verifiable trust.
        </p>
      </div>

      {/* Problem & Vision Statement */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Why FindBack Was Built</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Every day in bustling public hubs — transit stations, cafes, municipal offices, and streets — essential possessions like smartphones, identification cards, wallets, keys, and backpacks are left behind. In most communities, there is no centralized, privacy-respecting system to connect finders with the legitimate owner.
        </p>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          <strong>FindBack</strong> solves this with a 100% free, structured registry. We combine location-aware heuristic scoring with an anti-fraud verification shield, ensuring that private details remain shielded while rightful owners are reunited with their property quickly and safely.
        </p>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-xs sm:text-sm text-slate-900">100% Free Public Utility</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Helping someone recover their property should never be monetized. Reporting, searching, automated matching, and claiming are free for all community members without subscriptions, paywalls, or claiming fees.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-xs sm:text-sm text-slate-900">Multi-Factor Heuristic Matching</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Our algorithmic engine continuously calculates multi-variable vector similarity across category, city and landmark proximity, date, brand, color, and description tokens to instantly surface potential correlations.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-xs sm:text-sm text-slate-900">Anti-Fraud Secret Shield</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Finders record confidential identifying marks (e.g., hidden scratches, specific wallpaper photos, lock codes, or serial suffixes) that are stripped from public APIs. Claimants must prove ownership through challenge questions.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-xs sm:text-sm text-slate-900">Designated Safe Meeting Hubs</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            We provide structured public safety guidance, encouraging daytime meetings in high-traffic, well-lit spaces like transit terminals, popular cafes, and civic plazas with checklist reminders.
          </p>
        </div>
      </div>
    </div>
  );
};
