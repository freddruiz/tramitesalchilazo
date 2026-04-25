'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import RequestStatusBadge from '@/components/request-status-badge';
import RequestSkeleton from '@/components/request-skeleton';
import Pagination from '@/components/pagination';

interface Request {
  id: string;
  serviceId: string;
  serviceName: string;
  status: string;
  priceGtq: number;
  createdAt: string;
}

interface ListResponse {
  requests: Request[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function DashboardPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      try {
        const response = await fetch(`/api/requests?page=${page}`);
        if (response.ok) {
          const data: ListResponse = await response.json();
          setRequests(data.requests);
          setTotal(data.pagination.total);
          setPages(data.pagination.pages);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, [page]);

  return (
    <main
      style={{
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '64rem',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Mis trámites</h1>

        <button
          onClick={() => signOut({ redirectTo: '/login' })}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Cerrar sesión
        </button>
      </div>

      {total === 0 && !loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#6b7280',
          }}
        >
          <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
            No tienes trámites aún
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Comienza creando tu primer trámite en la{' '}
            <Link
              href="/services"
              style={{
                color: '#3b82f6',
                textDecoration: 'underline',
              }}
            >
              catálogo de servicios
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr auto',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <div>Servicio</div>
              <div>Fecha de creación</div>
              <div>Monto (Q)</div>
              <div>Estado</div>
            </div>

            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <RequestSkeleton key={i} />)
            ) : (
              requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr auto',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        'transparent';
                    }}
                  >
                    <div style={{ fontSize: '0.9375rem' }}>
                      {request.serviceName}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {new Date(request.createdAt).toLocaleDateString('es-ES')}
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                      Q {request.priceGtq.toFixed(2)}
                    </div>
                    <RequestStatusBadge status={request.status as any} />
                  </div>
                </Link>
              ))
            )}
          </div>

          <Pagination
            currentPage={page}
            totalPages={pages}
            onPageChange={setPage}
          />
        </>
      )}
    </main>
  );
}
