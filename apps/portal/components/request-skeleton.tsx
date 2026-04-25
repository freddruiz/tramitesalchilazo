export default function RequestSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr auto',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    >
      <div
        style={{
          height: '1rem',
          backgroundColor: '#e5e7eb',
          borderRadius: '0.25rem',
        }}
      />
      <div
        style={{
          height: '1rem',
          backgroundColor: '#e5e7eb',
          borderRadius: '0.25rem',
        }}
      />
      <div
        style={{
          height: '1rem',
          backgroundColor: '#e5e7eb',
          borderRadius: '0.25rem',
          width: '60%',
        }}
      />
      <div
        style={{
          height: '1.5rem',
          width: '5rem',
          backgroundColor: '#e5e7eb',
          borderRadius: '0.25rem',
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
