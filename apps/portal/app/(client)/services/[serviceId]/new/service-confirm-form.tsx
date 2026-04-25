'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ServiceConfirmForm({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.code === 'AUTH_STEP_UP_REQUIRED') {
          router.push(`/step-up?returnTo=/services/${serviceId}/new`);
          return;
        }
        setError('No tienes permisos para realizar esta acción.');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al crear el trámite. Por favor intenta de nuevo.');
        return;
      }

      const { requestId } = await res.json();
      router.push(`/requests/${requestId}/pay`);
    } catch {
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fee2e2',
            borderRadius: '0.375rem',
            color: '#991b1b',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: submitting ? '#93c5fd' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? 'Procesando...' : 'Confirmar Trámite'}
      </button>
    </div>
  );
}
