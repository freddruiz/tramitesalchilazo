'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { startRegistration } from '@simplewebauthn/browser';

interface Credential {
  id: string;
  credential_id: string;
  friendly_name: string | null;
  device_type: string;
  backed_up: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function PasskeysPage() {
  const { update } = useSession();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [friendlyName, setFriendlyName] = useState('');
  const [error, setError] = useState('');

  // TOTP setup state
  const [totpSetupState, setTotpSetupState] = useState<{
    qrDataUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState('');
  const [hasTotpConfigured, setHasTotpConfigured] = useState(false);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/webauthn/list');
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials ?? []);
        setHasTotpConfigured(data.hasTotpConfigured ?? false);
      }
    } finally {
      setLoadingCreds(false);
    }
  }, []);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  async function handleAddPasskey(e: React.FormEvent) {
    e.preventDefault();
    setEnrolling(true);
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

      await update({ adminPasskeyEnrolled: true });
      setFriendlyName('');
      await fetchCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  }

  async function handleDelete(credId: string) {
    if (!confirm('Remove this passkey? You will need at least one passkey to access admin.')) return;
    await fetch('/api/admin/webauthn/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialId: credId }),
    });
    await fetchCredentials();
  }

  async function handleSetupTotp() {
    setTotpLoading(true);
    setTotpError('');
    try {
      const res = await fetch('/api/admin/totp/setup');
      if (!res.ok) throw new Error('Failed to start TOTP setup');
      const data = await res.json();
      setTotpSetupState(data);
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Security — Passkeys & MFA</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>
        Manage your passkeys and backup authenticator app.
      </p>

      {/* Passkey list */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 17, marginBottom: 12 }}>Your Passkeys</h2>
        {loadingCreds ? (
          <p style={{ color: '#9ca3af' }}>Loading…</p>
        ) : credentials.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No passkeys enrolled yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: 16 }}>
            {credentials.map((c) => (
              <li
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  marginBottom: 8,
                  background: '#f9fafb',
                }}
              >
                <div>
                  <strong>{c.friendly_name ?? 'Unnamed device'}</strong>
                  <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>
                    {c.device_type} {c.backed_up ? '· backed up' : ''}
                  </span>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    Added {new Date(c.created_at).toLocaleDateString()}
                    {c.last_used_at && ` · Last used ${new Date(c.last_used_at).toLocaleDateString()}`}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add new passkey */}
        <form onSubmit={handleAddPasskey} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Add another passkey
            </label>
            <input
              type="text"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder="Device nickname (optional)"
              maxLength={80}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={enrolling}
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: enrolling ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              opacity: enrolling ? 0.7 : 1,
            }}
          >
            {enrolling ? 'Enrolling…' : '+ Add Passkey'}
          </button>
        </form>
        {error && <p style={{ color: '#dc2626', marginTop: 8, fontSize: 14 }}>{error}</p>}
      </section>

      {/* TOTP fallback */}
      <section>
        <h2 style={{ fontSize: 17, marginBottom: 4 }}>Backup Authenticator (TOTP)</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 12 }}>
          {hasTotpConfigured
            ? 'Authenticator app is configured. You can use it as a fallback on the MFA page.'
            : 'No backup authenticator configured. Set one up in case you lose access to your passkeys.'}
        </p>

        {!totpSetupState && (
          <button
            onClick={handleSetupTotp}
            disabled={totpLoading}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              cursor: totpLoading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              opacity: totpLoading ? 0.7 : 1,
            }}
          >
            {totpLoading ? 'Loading…' : hasTotpConfigured ? 'Reconfigure TOTP' : 'Set up TOTP'}
          </button>
        )}

        {totpError && <p style={{ color: '#dc2626', marginTop: 8, fontSize: 14 }}>{totpError}</p>}

        {totpSetupState && (
          <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>1. Scan this QR code with your authenticator app:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={totpSetupState.qrDataUrl} alt="TOTP QR code" style={{ width: 180, height: 180, display: 'block', marginBottom: 16 }} />

            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              2. Save these backup codes somewhere safe — they are shown only once:
            </p>
            <pre style={{
              background: '#111827',
              color: '#d1fae5',
              padding: 12,
              borderRadius: 6,
              fontSize: 13,
              letterSpacing: '0.05em',
            }}>
              {totpSetupState.backupCodes.join('\n')}
            </pre>

            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>
              Verify your setup by entering a code from the app on the{' '}
              <a href="/admin/mfa" style={{ color: '#2563eb' }}>MFA page</a>.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
