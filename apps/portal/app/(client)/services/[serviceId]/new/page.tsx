import { notFound } from 'next/navigation';
import { SERVICE_CATALOG } from '@/lib/catalog/services';
import type { ServiceId } from '@/lib/catalog/services';
import ServiceConfirmForm from './service-confirm-form';

export default async function NewServiceRequestPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const service = SERVICE_CATALOG[serviceId as ServiceId];

  if (!service || !service.available) {
    notFound();
  }

  return (
    <main
      style={{
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '40rem',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '2rem',
          backgroundColor: '#fff',
        }}
      >
        <h1
          style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}
        >
          {service.name}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {service.description}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Precio
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8' }}>
              Q{service.priceGTQ.toFixed(2)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Tiempo estimado
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>
              {service.processingDays} día{service.processingDays !== 1 ? 's' : ''} hábil
              {service.processingDays !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef9c3',
            borderRadius: '0.375rem',
            marginBottom: '1.5rem',
            fontSize: '0.8125rem',
            color: '#713f12',
            lineHeight: '1.5',
          }}
        >
          <strong>Aviso legal:</strong> Al confirmar este trámite, autoriza a
          Trámites al Chilazo a actuar como su representante para gestionar
          este servicio ante las entidades gubernamentales correspondientes.
          El precio indicado cubre únicamente los honorarios del servicio. El
          documento resultante será válido únicamente para los fines legales
          establecidos por la entidad emisora.
        </div>

        <ServiceConfirmForm serviceId={service.id} />
      </div>
    </main>
  );
}
