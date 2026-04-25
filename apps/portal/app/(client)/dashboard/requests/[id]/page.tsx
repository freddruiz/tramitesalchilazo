'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import RequestStatusBadge from '@/components/request-status-badge';

interface RequestDetail {
  id: string;
  serviceId: string;
  serviceName: string;
  status: string;
  priceGtq: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequest() {
      try {
        const response = await fetch(`/api/requests/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Trámite no encontrado');
          } else {
            setError('Error al cargar el trámite');
          }
          return;
        }
        const data: RequestDetail = await response.json();
        setRequest(data);
      } catch (err) {
        setError('Error al cargar el trámite');
        console.error('Error fetching request:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRequest();
  }, [id]);

  if (loading) {
    return (
      <main
        style={{
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '48rem',
          margin: '0 auto',
        }}
      >
        <p>Cargando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '48rem',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            borderRadius: '0.5rem',
            color: '#991b1b',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
        <Link
          href="/dashboard"
          style={{
            color: '#3b82f6',
            textDecoration: 'underline',
          }}
        >
          Volver al dashboard
        </Link>
      </main>
    );
  }

  if (!request) {
    return (
      <main
        style={{
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '48rem',
          margin: '0 auto',
        }}
      >
        <p>Trámite no encontrado</p>
      </main>
    );
  }

  const canDownloadDocument =
    request.status === 'completed' &&
    new Date(request.updatedAt).getTime() > Date.now() - 20 * 24 * 60 * 60 * 1000;

  return (
    <main
      style={{
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '48rem',
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/dashboard"
          style={{
            color: '#3b82f6',
            textDecoration: 'underline',
            fontSize: '0.875rem',
          }}
        >
          ← Volver al dashboard
        </Link>
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {request.serviceName}
          </h1>
          <RequestStatusBadge status={request.status as any} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            marginBottom: '2rem',
            paddingBottom: '2rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '0.5rem',
              }}
            >
              ID del Trámite
            </p>
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: '#1f2937',
                wordBreak: 'break-all',
              }}
            >
              {request.id}
            </p>
          </div>

          <div>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '0.5rem',
              }}
            >
              Monto
            </p>
            <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              Q {request.priceGtq.toFixed(2)}
            </p>
          </div>

          <div>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '0.5rem',
              }}
            >
              Fecha de Creación
            </p>
            <p style={{ fontSize: '0.9375rem' }}>
              {new Date(request.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '0.5rem',
              }}
            >
              Última Actualización
            </p>
            <p style={{ fontSize: '0.9375rem' }}>
              {new Date(request.updatedAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {request.status === 'pending_payment' && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
            }}
          >
            <p style={{ color: '#374151', fontSize: '0.875rem' }}>
              Este trámite está esperando confirmación de pago. Una vez que se
              confirme el pago, el estado cambiará a "En Cola".
            </p>
          </div>
        )}

        {request.status === 'in_progress' && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fef3c7',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
            }}
          >
            <p style={{ color: '#92400e', fontSize: '0.875rem' }}>
              Tu trámite está siendo procesado. Recibirás una notificación cuando
              esté completado.
            </p>
          </div>
        )}

        {request.status === 'needs_manual_review' && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fed7aa',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
            }}
          >
            <p style={{ color: '#92400e', fontSize: '0.875rem' }}>
              Tu trámite requiere revisión manual. Nuestro equipo está analizando
              tu solicitud y se pondrá en contacto contigo si es necesario.
            </p>
          </div>
        )}

        {request.status === 'failed' && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fee2e2',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
            }}
          >
            <p style={{ color: '#991b1b', fontSize: '0.875rem' }}>
              Desafortunadamente, el procesamiento de tu trámite falló. Por favor,
              contacta al equipo de soporte para más información.
            </p>
          </div>
        )}

        {canDownloadDocument && (
          <div style={{ marginTop: '1rem' }}>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Descargar Documento
            </button>
            <p
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.5rem',
              }}
            >
              El documento estará disponible durante 20 días desde la fecha de
              completación.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
