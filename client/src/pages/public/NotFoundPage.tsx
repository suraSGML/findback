import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Search } from 'lucide-react';

export const NotFoundPage: React.FC = () => (
  <section className="flex min-h-[65vh] items-center justify-center px-4 py-16">
    <div className="max-w-lg text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <Compass className="h-7 w-7" />
      </div>
      <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">404 - Page not found</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">We couldn’t find that page</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        The address may be incorrect, or the page may have moved. You can return home or browse the registry.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-secondary h-10 px-4">Go home</Link>
        <Link to="/browse" className="btn-primary h-10 px-4">
          <Search className="h-4 w-4" />
          Browse registry
        </Link>
      </div>
    </div>
  </section>
);
