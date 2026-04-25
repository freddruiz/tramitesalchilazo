export type RequestStatus =
  | 'pending_payment'
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'needs_manual_review';

interface StatusBadgeProps {
  status: RequestStatus;
}

const statusColors: Record<RequestStatus, { bg: string; text: string; label: string }> = {
  pending_payment: {
    bg: '#f3f4f6',
    text: '#374151',
    label: 'Pendiente de Pago',
  },
  queued: {
    bg: '#dbeafe',
    text: '#1e40af',
    label: 'En Cola',
  },
  in_progress: {
    bg: '#fef3c7',
    text: '#92400e',
    label: 'En Progreso',
  },
  completed: {
    bg: '#dcfce7',
    text: '#166534',
    label: 'Completado',
  },
  failed: {
    bg: '#fee2e2',
    text: '#991b1b',
    label: 'Fallido',
  },
  needs_manual_review: {
    bg: '#fed7aa',
    text: '#92400e',
    label: 'Requiere Revisión',
  },
};

export default function RequestStatusBadge({ status }: StatusBadgeProps) {
  const colors = statusColors[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        borderRadius: '0.25rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {colors.label}
    </span>
  );
}
