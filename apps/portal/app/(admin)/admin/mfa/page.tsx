'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { startAuthentication } from '@simplewebauthn/browser';

type Tab = 'passkey' | 'totp';

export default function AdminMfaPage() {
  const { update } = useSession();
  const [tab, setTab] = useState<Tab>('passkey');
  const [totpToken, setTotpToken] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePasskeyAuth() {
    setLoading(true);
    setError('');
    try {
      const optRes = await fetch('/api/admin/webauthn/auth-options');
      if (!optRes.ok) throw new Error('Failed to get authentication options');
      const options = await optRes.json();

      const assertion = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch('/api/admin/webauthn/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error ?? 'Passkey authentication failed');
      }

      const { adminMfaVerifiedAt } = await verifyRes.json();
      await update({ adminMfaVerifiedAt });
      window.location.href = '/admin/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpToken.trim(), isBackupCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Verification failed');
      }

      const { adminMfaVerifiedAt } = await res.json();
      await update({ adminMfaVerifiedAt });
      window.location.href = '/admin/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Admin Authentication</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Verify your identity to access the admin panel.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setTab('passkey')}
          style={{
            padding: '8px 16px',
            background: tab === 'passkey' ? '#111827' : '#f3f4f6',
            color: tab === 'passkey' ? '#fff' : '#374151',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Passkey
        </button>
        <button
          onClick={() => setTab('totp')}
          style={{
            padding: '8px 16px',
            background: tab === 'totp' ? '#111827' : '#f3f4f6',
            color: tab === 'totp' ? '#fff' : '#374151',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Authenticator (fallback)
        </button>
      </div>

      {tab === 'passkey' && (
        <div>
          <p style={{ color: '#374151', marginBottom: 16 }}>
            Use your device passkey (fingerprint, Face ID, or security key) to continue.
          </p>
          <button
            onClick={handlePasskeyAuth}
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
            {loading ? 'Authenticating…' : 'Authenticate with Passkey'}
          </button>
        </div>
      )}

      {tab === 'totp' && (
        <form onSubmit={handleTotpVerify}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              {isBackupCode ? 'Backup code' : '6-digit code from your authenticator app'}
            </label>
            <input
              type="text"
              inputMode={isBackupCode ? 'text' : 'numeric'}
              pattern={isBackupCode ? undefined : '[0-9]*'}
              maxLength={isBackupCode ? 8 : 6}
              value={totpToken}
              onChange={(e) => setTotpToken(e.target.value)}
              placeholder={isBackupCode ? 'XXXXXXXX' : '000000'}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 18,
                letterSpacing: '0.15em',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => { setIsBackupCode(!isBackupCode); setTotpToken(''); }}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: 12, fontSize: 13 }}
          >
            {isBackupCode ? 'Use authenticator code instead' : 'Use a backup code instead'}
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 0',
              background: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      )}

      {error && (
        <p style={{ color: '#dc2626', marginTop: 12, fontSize: 14 }}>{error}</p>
      )}
    </div>
  );
}
