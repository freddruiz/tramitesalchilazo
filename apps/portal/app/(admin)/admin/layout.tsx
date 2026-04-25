export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 16, marginBottom: 24 }}>
        <strong>Tramites al Chilazo — Admin</strong>
      </header>
      <main>{children}</main>
    </div>
  );
}
