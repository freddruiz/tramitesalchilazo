'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Service } from '@/lib/catalog/services';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        const data = await response.json();
        setServices(data);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg h-32 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Select a Service
        </h1>
        <p className="text-gray-600 mb-8">
          Choose the document or certificate you need
        </p>

        <div className="space-y-4">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.id}/new`}
              className="block"
            >
              <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer border border-gray-200 hover:border-blue-400">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">
                      {service.name}
                    </h2>
                    <p className="text-gray-600 text-sm mb-3">
                      {service.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        Processing time:{' '}
                        <span className="font-medium text-gray-700">
                          {service.processingDays} business day
                          {service.processingDays !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-3xl font-bold text-blue-600">
                      Q{service.priceGTQ.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">GTQ</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {services.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600">No services available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
