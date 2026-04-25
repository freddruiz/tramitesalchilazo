'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { startRegistration } from '@simplewebauthn/browser';

export default function PasskeyEnrollPage() {
  const { update } = useSession();
  const [friendlyName, setFriendlyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const optRes = await fetch('/api/admin/webauthn/register-options');
      if (!optRes.ok) throw new Error('Failed to get registration options');
      const options = await optRes.json();

      const credential = await startRegistration({ optionsJSON: options });

      const regRes = await fetch('/api/admin/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: credential, friendlyName: friendlyName || undefined }),
      });

      if (!regRes.ok) {
        const data = await regRes.json();
        throw new Error(data.error ?? 'Registration failed');
      }

      // Update JWT so middleware knows passkey is enrolled
      await update({ adminPasskeyEnrolled: true });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ maxWidth: 420, margin: '60px auto', textAlign: 'center' }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>✓</p>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Passkey enrolled!</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Your passkey has been saved. You will now be prompted to verify your identity.
        </p>
        <a
          href="/admin/mfa"
          style={{
            display: 'inline-block',
            padding: '12px 32px',
            background: '#2563eb',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          Continue to MFA verification
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Enroll a Passkey</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        As an admin, you must enroll a passkey before accessing the admin panel.
        Passkeys use your device (fingerprint, Face ID, or a security key) for strong
        phishing-resistant authentication.
      </p>
      <form onSubmit={handleEnroll}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Device nickname (optional)
          </label>
          <input
            type="text"
            value={friendlyName}
            onChange={(e) => setFriendlyName(e.target.value)}
            placeholder="e.g. MacBook, iPhone"
            maxLength={80}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 15,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 0',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Enrolling…' : 'Enroll Passkey'}
        </button>
      </form>
      {error && (
        <p style={{ color: '#dc2626', marginTop: 12, fontSize: 14 }}>{error}</p>
      )}
    </div>
  );
}
