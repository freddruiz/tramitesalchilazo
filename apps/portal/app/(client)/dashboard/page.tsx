import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { signOut } from '@/auth';

// Protected by middleware — only reachable with a valid session
export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          Mis trámites
        </h1>

        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button
            type="submit"
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
        </form>
      </div>

      <p style={{ color: '#6b7280' }}>
        Sesión activa: {session.user.email} · rol: {session.user.role}
      </p>

      <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '1rem' }}>
        (Lista de trámites — implementada en S3-03)
      </p>
    </main>
  );
}
