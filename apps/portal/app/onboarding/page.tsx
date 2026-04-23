import { auth } from '@/auth';
import { redirect } from 'next/navigation';

// S2-01 stub: profile completion form implemented in S2-03
export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.profileComplete) redirect('/dashboard');

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
        Completar perfil
      </h1>
      <p style={{ color: '#6b7280' }}>
        Bienvenido, {session.user.email}. Completa tu perfil para continuar.
      </p>
      <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
        (Formulario de perfil — implementado en S2-03)
      </p>
    </main>
  );
}
